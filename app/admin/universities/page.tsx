"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Badge } from "@/components/ui/badge"
import { Search, MoreHorizontal, Filter, Plus, Globe, AlertTriangle } from "lucide-react"
import { useLanguage } from "@/lib/language-context"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { TableSkeleton } from "@/components/ui/table-skeleton"
import { useDialogState } from "@/hooks/use-dialog-state"
import { cleanupDialogEffects } from "@/lib/dialog-utils"
import { countries, getCountryName, type Country } from "@/lib/countries"

// Define the University type
interface University {
  id: string
  name: string
  name_ru: string | null
  country: string
  city: string
  website: string | null
  language: string | null
  status: string
  max_students: number
  created_at: string
  updated_at: string
  description?: string | null
  description_ru?: string | null
}

// Cache keys
const UNIVERSITIES_CACHE_KEY = "admin_universities_cache"
const COUNTRIES_CACHE_KEY = "admin_countries_cache"

// Cache expiry time (1 hour)
const CACHE_EXPIRY = 60 * 60 * 1000

export default function UniversitiesPage() {
  const [universities, setUniversities] = useState<University[]>([])
  const [filteredUniversities, setFilteredUniversities] = useState<University[]>([])
  const [isLoadingUniversities, setIsLoadingUniversities] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [countryFilter, setCountryFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const { t, language } = useLanguage()
  const { toast } = useToast()
  const supabase = getSupabaseBrowserClient()

  // Delete confirmation dialog state
  const [universityToDelete, setUniversityToDelete] = useState<string | null>(null)
  const {
    isOpen: isDeleteDialogOpen,
    openDialog: openDeleteDialog,
    closeDialog: closeDeleteDialog,
  } = useDialogState(false)

  // Load cached data on initial render
  useEffect(() => {
    const loadCachedData = () => {
      try {
        // Load cached countries
        const cachedCountries = localStorage.getItem(COUNTRIES_CACHE_KEY)
        if (cachedCountries) {
          const { data, timestamp } = JSON.parse(cachedCountries)
          // Check if cache is valid
          if (Date.now() - timestamp < CACHE_EXPIRY) {
            setCountries(data)
            setIsLoadingCountries(false)
          }
        }

        // Load cached universities
        const cachedUniversities = localStorage.getItem(UNIVERSITIES_CACHE_KEY)
        if (cachedUniversities) {
          const { data, timestamp } = JSON.parse(cachedUniversities)
          // Check if cache is valid
          if (Date.now() - timestamp < CACHE_EXPIRY) {
            setUniversities(data)
            setIsLoadingUniversities(false)
          }
        }
      } catch (error) {
        console.error("Error loading cached data:", error)
        // If there's an error, we'll just fetch fresh data
      }
    }

    loadCachedData()
  }, [])

  // Countries are now static data from lib/countries.ts - no need to fetch

  // Fetch universities from Supabase
  useEffect(() => {
    const fetchUniversities = async () => {
      if (!isLoadingUniversities) {
        return
      }

      try {
        const { data, error } = await supabase
          .from("exchange_universities")
          .select("*")
          .order("name", { ascending: true })

        if (error) {
          throw error
        }

        setUniversities(data || [])

        // Cache the universities data
        localStorage.setItem(
          UNIVERSITIES_CACHE_KEY,
          JSON.stringify({
            data,
            timestamp: Date.now(),
          }),
        )
      } catch (error: any) {
        console.error("Error fetching universities:", error)
        toast({
          title: t("admin.universities.error", "Error"),
          description: t("admin.universities.errorFetching", "Failed to fetch universities") + ": " + error.message,
          variant: "destructive",
        })
      } finally {
        setIsLoadingUniversities(false)
      }
    }

    fetchUniversities()
  }, [supabase, toast, t, isLoadingUniversities])

  // Set up real-time subscriptions for instant updates
  useEffect(() => {
    const channel = supabase
      .channel("universities-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "exchange_universities" },
        async () => {
          // Invalidate cache
          localStorage.removeItem(UNIVERSITIES_CACHE_KEY)
          setIsLoadingUniversities(true)

          // Refetch universities
          try {
            const { data, error } = await supabase
              .from("exchange_universities")
              .select("*")
              .order("name", { ascending: true })

            if (error) throw error

            setUniversities(data || [])

            // Update cache
            localStorage.setItem(
              UNIVERSITIES_CACHE_KEY,
              JSON.stringify({
                data: data || [],
                timestamp: Date.now(),
              }),
            )
          } catch (error: any) {
            console.error("Error refetching universities after real-time update:", error)
            toast({
              title: t("admin.universities.error", "Error"),
              description: t("admin.universities.errorFetching", "Failed to fetch universities") + ": " + error.message,
              variant: "destructive",
            })
          } finally {
            setIsLoadingUniversities(false)
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, toast, t])

  // Filter universities based on search term and filters
  useEffect(() => {
    let result = [...universities]

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(
        (university) =>
          (university.name && university.name.toLowerCase().includes(term)) ||
          (university.name_ru && university.name_ru.toLowerCase().includes(term)) ||
          (university.city && university.city.toLowerCase().includes(term)) ||
          (university.city_ru && university.city_ru.toLowerCase().includes(term)),
      )
    }

    if (statusFilter !== "all") {
      result = result.filter((university) => university.status === statusFilter)
    }

    if (countryFilter !== "all") {
      result = result.filter((university) => university.country === countryFilter)
    }

    setFilteredUniversities(result)
  }, [searchTerm, statusFilter, countryFilter, universities])

  // Get localized name based on current language
  const getLocalizedName = (university: University) => {
    if (language === "ru" && university.name_ru) {
      return university.name_ru
    }
    return university.name
  }

  // Get localized city based on current language
  const getLocalizedCity = (university: University) => {
    return university.city
  }

  // Get localized country name based on current language
  const getLocalizedCountry = (countryCode: string) => {
    const country = countries.find((c) => c.code === countryCode)
    if (!country) return countryCode
    return getCountryName(country, language)
  }

  // Get status badge based on status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">
            {t("admin.universities.status.active", "Active")}
          </Badge>
        )
      case "inactive":
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-800 hover:bg-gray-100 border-gray-200">
            {t("admin.universities.status.inactive", "Inactive")}
          </Badge>
        )
      case "draft":
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-200">
            {t("admin.universities.status.draft", "Draft")}
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // Handle status change
  const handleStatusChange = async (universityId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("exchange_universities")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", universityId)

      if (error) {
        throw error
      }

      // Update local state
      setUniversities((prev) =>
        prev.map((university) => (university.id === universityId ? { ...university, status: newStatus } : university)),
      )

      // Invalidate cache
      localStorage.removeItem(UNIVERSITIES_CACHE_KEY)

      toast({
        title: t("admin.universities.statusUpdated", "University status updated"),
        description: t("admin.universities.statusUpdatedDesc", "University status has been updated successfully"),
      })
    } catch (error: any) {
      toast({
        title: t("admin.universities.error", "Error"),
        description:
          t("admin.universities.errorUpdatingStatus", "Failed to update university status") + ": " + error.message,
        variant: "destructive",
      })
    }
  }

  // Handle opening delete confirmation dialog
  const handleDelete = (universityId: string) => {
    setUniversityToDelete(universityId)
    openDeleteDialog()
  }

  // Handle closing delete confirmation dialog
  const handleCloseDeleteDialog = () => {
    closeDeleteDialog()

    // Ensure cleanup after dialog closes
    setTimeout(() => {
      setUniversityToDelete(null)
      cleanupDialogEffects()
    }, 300) // Wait for animation to complete
  }

  // Confirm delete action
  const confirmDelete = async () => {
    if (!universityToDelete) return

    try {
      const { error } = await supabase.from("exchange_universities").delete().eq("id", universityToDelete)

      if (error) {
        throw error
      }

      // Update local state
      setUniversities((prev) => prev.filter((university) => university.id !== universityToDelete))
      setFilteredUniversities((prev) => prev.filter((university) => university.id !== universityToDelete))

      // Invalidate cache
      localStorage.removeItem(UNIVERSITIES_CACHE_KEY)

      toast({
        title: t("admin.universities.deleteSuccess", "University deleted"),
        description: t("admin.universities.deleteSuccessDesc", "University has been deleted successfully"),
      })

      // Close dialog and clean up
      handleCloseDeleteDialog()
    } catch (error: any) {
      console.error("Error deleting university:", error)
      toast({
        title: t("admin.universities.error", "Error"),
        description: t("admin.universities.errorDeleting", "Failed to delete university") + ": " + error.message,
        variant: "destructive",
      })
      handleCloseDeleteDialog()
    }
  }

  // Get the university name for the delete confirmation dialog
  // const getUniversityToDeleteName = () => {
  //   if (!universityToDelete) return ""
  //   const university = universities.find((u) => u.id === universityToDelete)
  //   return university ? getLocalizedName(university) : ""
  // }

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredUniversities.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredUniversities.length / itemsPerPage)

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {t("admin.universities.title", "Partner Universities")}
            </h1>
            <p className="text-muted-foreground mt-2">
              {t("admin.universities.subtitle", "Manage partner universities for student exchange programs")}
            </p>
          </div>
          <Link href="/admin/universities/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t("admin.universities.addUniversity", "Add University")}
            </Button>
          </Link>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder={t("admin.universities.search", "Search universities...")}
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[130px]">
                      <Filter className="mr-2 h-4 w-4" />
                      <SelectValue placeholder={t("admin.universities.status.label", "Status")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("admin.universities.allStatus", "All Status")}</SelectItem>
                      <SelectItem value="active">{t("admin.universities.status.active", "Active")}</SelectItem>
                      <SelectItem value="inactive">{t("admin.universities.status.inactive", "Inactive")}</SelectItem>
                      <SelectItem value="draft">{t("admin.universities.status.draft", "Draft")}</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={countryFilter} onValueChange={setCountryFilter}>
                    <SelectTrigger className="w-[180px]">
                      <Globe className="mr-2 h-4 w-4" />
                      <SelectValue placeholder={t("admin.universities.country", "Country")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("admin.universities.allCountries", "All Countries")}</SelectItem>
                      {countries.map((country) => (
                        <SelectItem key={country.code} value={country.code}>
                          <span className="flex items-center gap-2">
                            <span>{country.flag}</span>
                            <span>{getCountryName(country, language)}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[30%]">{t("admin.universities.name", "Name")}</TableHead>
                      <TableHead>{t("admin.universities.country", "Country")}</TableHead>
                      <TableHead>{t("admin.universities.city", "City")}</TableHead>
                      <TableHead>{t("admin.universities.maxStudents", "Max Students")}</TableHead>
                      <TableHead>{t("admin.universities.status.label", "Status")}</TableHead>
                      <TableHead className="w-[80px]">{t("admin.universities.action", "Action")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingUniversities || isLoadingCountries ? (
                      <TableSkeleton columns={6} rows={itemsPerPage} />
                    ) : currentItems.length > 0 ? (
                      currentItems.map((university) => (
                        <TableRow key={university.id}>
                          <TableCell className="font-medium">{getLocalizedName(university)}</TableCell>
                          <TableCell>{getLocalizedCountry(university.country)}</TableCell>
                          <TableCell>{getLocalizedCity(university)}</TableCell>
                          <TableCell>{university.max_students}</TableCell>
                          <TableCell>{getStatusBadge(university.status)}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <span className="sr-only">Open menu</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  <Link href={`/admin/universities/${university.id}`} className="w-full">
                                    {t("admin.universities.view", "View Details")}
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Link href={`/admin/universities/${university.id}/edit`} className="w-full">
                                    {t("admin.universities.edit", "Edit")}
                                  </Link>
                                </DropdownMenuItem>
                                {university.status === "active" ? (
                                  <DropdownMenuItem onClick={() => handleStatusChange(university.id, "inactive")}>
                                    {t("admin.universities.deactivate", "Deactivate")}
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem onClick={() => handleStatusChange(university.id, "active")}>
                                    {t("admin.universities.activate", "Activate")}
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleDelete(university.id)}
                                >
                                  {t("admin.universities.delete", "Delete")}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          {t("admin.universities.noUniversitiesFound", "No universities found")}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {filteredUniversities.length > itemsPerPage && (
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                          e.preventDefault()
                          if (currentPage > 1) setCurrentPage(currentPage - 1)
                        }}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                        aria-label={t("pagination.previous", "Previous")}
                      />
                    </PaginationItem>

                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      // Show pages around current page
                      let pageNum = i + 1
                      if (totalPages > 5) {
                        if (currentPage > 3) {
                          pageNum = currentPage - 3 + i
                        }
                        if (pageNum > totalPages - 4) {
                          pageNum = totalPages - 4 + i
                        }
                      }
                      return (
                        <PaginationItem key={pageNum}>
                          <PaginationLink
                            href="#"
                            isActive={currentPage === pageNum}
                            onClick={(e) => {
                              e.preventDefault()
                              setCurrentPage(pageNum)
                            }}
                            aria-label={`${t("pagination.page", "Page")} ${pageNum}`}
                          >
                            {pageNum}
                          </PaginationLink>
                        </PaginationItem>
                      )
                    })}

                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => {
                          e.preventDefault()
                          if (currentPage < totalPages) setCurrentPage(currentPage + 1)
                        }}
                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                        aria-label={t("pagination.next", "Next")}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          if (!open) handleCloseDeleteDialog()
        }}
      >
        <DialogContent
          className="sm:max-w-[425px]"
          onEscapeKeyDown={(e) => {
            e.stopPropagation()
            handleCloseDeleteDialog()
          }}
          onPointerDownOutside={(e) => {
            e.preventDefault()
            handleCloseDeleteDialog()
          }}
          onInteractOutside={(e) => {
            e.preventDefault()
          }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              {t("admin.universities.deleteConfirmTitle", "Delete University")}
            </DialogTitle>
            <DialogDescription className="pt-2">
              {t(
                "admin.universities.deleteConfirmMessage",
                "You are sure you want to delete this university? This action cannot be undone.",
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleCloseDeleteDialog}>
              {t("admin.universities.cancelDelete", "Cancel")}
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              {t("admin.universities.confirmDelete", "Delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
