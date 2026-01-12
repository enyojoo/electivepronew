"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Search, Filter, MoreHorizontal } from "lucide-react"
import Link from "next/link"
import { useLanguage } from "@/lib/language-context"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { TableSkeleton } from "@/components/ui/table-skeleton"
import { formatDate } from "@/lib/utils"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// Cache constants
const CACHE_KEY = "admin_exchange_programs"
const CACHE_EXPIRY = 5 * 60 * 1000 // 5 minutes

interface ElectivePack {
  id: string
  name: string
  name_ru: string | null
  status: string
  deadline: string | null
  created_at: string
  updated_at: string
  max_selections: number
  university_count?: number
  created_by: string | null
  creator_name?: string
}

interface CachedData {
  data: ElectivePack[]
  timestamp: number
}

export default function ExchangeElectivesPage() {
  const [electivePacks, setElectivePacks] = useState<ElectivePack[]>([])
  const [filteredPacks, setFilteredPacks] = useState<ElectivePack[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [packToDelete, setPackToDelete] = useState<string | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const { t, language } = useLanguage()
  const { toast } = useToast()
  const supabase = getSupabaseBrowserClient()

  // Function to get cached data
  const getCachedData = (): CachedData | null => {
    if (typeof window === "undefined") return null

    try {
      const cachedData = localStorage.getItem(CACHE_KEY)
      if (!cachedData) return null

      const parsedData = JSON.parse(cachedData) as CachedData
      const now = Date.now()

      // Check if cache is expired
      if (now - parsedData.timestamp > CACHE_EXPIRY) {
        localStorage.removeItem(CACHE_KEY)
        return null
      }

      return parsedData
    } catch (error) {
      console.error("Error getting cached data:", error)
      return null
    }
  }

  // Function to set cached data
  const setCachedData = (data: ElectivePack[]) => {
    if (typeof window === "undefined") return

    try {
      const cacheData: CachedData = {
        data,
        timestamp: Date.now(),
      }
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData))
    } catch (error) {
      console.error("Error setting cached data:", error)
    }
  }

  // Function to clear cache
  const clearCache = () => {
    if (typeof window === "undefined") return

    try {
      localStorage.removeItem(CACHE_KEY)
    } catch (error) {
      console.error("Error clearing cache:", error)
    }
  }

  useEffect(() => {
    const fetchElectivePacks = async () => {
      try {
        setIsLoading(true)

        // Try to get data from cache first
        const cachedData = getCachedData()

        if (cachedData) {
          console.log("Using cached admin exchange programs data")
          setElectivePacks(cachedData.data)
          setIsLoading(false)
          return
        }

        console.log("Fetching admin exchange programs from API")
        // Fetch elective exchange programs
        const { data: packs, error } = await supabase
          .from("elective_exchange")
          .select("*")
          .order("created_at", { ascending: false })

        if (error) {
          console.error("Error fetching exchange programs:", error)
          throw error
        }

        // Process the data to include university count
        const processedPacks = (packs || []).map((pack) => {
          // Get university count from the universities array (TEXT[])
          const universityCount = Array.isArray(pack.universities) ? pack.universities.length : 0

          return {
            ...pack,
            university_count: universityCount,
            creator_name: "Admin", // elective_exchange table doesn't have created_by field
          }
        })

        // Save to cache
        setCachedData(processedPacks)

        setElectivePacks(processedPacks)
      } catch (error) {
        console.error("Error fetching elective packs:", error)
        toast({
          title: t("admin.electives.error", "Error"),
          description: t("admin.electives.errorFetching", "Failed to fetch elective packs"),
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchElectivePacks()
  }, [supabase, toast, t])

  // Set up real-time subscriptions for instant updates
  useEffect(() => {
    const channel = supabase
      .channel("elective-exchange-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "elective_exchange" },
        () => {
          // Invalidate cache to trigger refetch
          clearCache()
          setIsLoading(true)
          // The fetchElectivePacks effect will handle the refetch
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  // Filter elective packs based on search term and status filter
  useEffect(() => {
    let result = [...electivePacks]

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(
        (pack) =>
          (pack.name && pack.name.toLowerCase().includes(term)) ||
          (pack.name_ru && pack.name_ru.toLowerCase().includes(term)),
      )
    }

    if (statusFilter !== "all") {
      result = result.filter((pack) => pack.status === statusFilter)
    }

    setFilteredPacks(result)
  }, [searchTerm, statusFilter, electivePacks])

  // Get localized name based on current language
  const getLocalizedName = (pack: ElectivePack) => {
    if (language === "ru" && pack.name_ru) {
      return pack.name_ru
    }
    return pack.name
  }

  // Get status badge based on status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "published":
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">
            {t("manager.status.published", "Published")}
          </Badge>
        )
      case "draft":
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-200">
            {t("manager.status.draft", "Draft")}
          </Badge>
        )
      case "closed":
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-800 hover:bg-gray-100 border-gray-200">
            {t("manager.status.closed", "Closed")}
          </Badge>
        )
      case "archived":
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200">
            {t("manager.status.archived", "Archived")}
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase.from("elective_exchange").update({ status: newStatus }).eq("id", id)

      if (error) throw error

      // Update local state
      const updatedPacks = electivePacks.map((pack) => (pack.id === id ? { ...pack, status: newStatus } : pack))

      setElectivePacks(updatedPacks)

      // Update cache
      clearCache()
      setCachedData(updatedPacks)
      localStorage.removeItem("admin_dashboard_stats_cache")

      toast({
        title: t("admin.electives.success", "Success"),
        description: t("admin.electives.statusUpdated", "Status updated successfully"),
      })
    } catch (error) {
      console.error("Error updating status:", error)
      toast({
        title: t("admin.electives.error", "Error"),
        description: t("admin.electives.errorUpdatingStatus", "Failed to update status"),
        variant: "destructive",
      })
    }
  }

  const openDeleteDialog = (id: string) => {
    setPackToDelete(id)
    setIsDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!packToDelete) return

    try {
      setIsDeleting(true)

      // First check if there are any student selections associated with this pack
      const { count, error: countError } = await supabase
        .from("student_exchange_selections")
        .select("*", { count: "exact", head: true })
        .eq("exchange_pack_id", packToDelete)

      if (countError) throw countError

      if (count && count > 0) {
        toast({
          title: t("admin.electives.error", "Error"),
          description: t(
            "admin.electives.cannotDeleteWithSelections",
            "Cannot delete exchange program with student selections",
          ),
          variant: "destructive",
        })
        return
      }

      const { error } = await supabase.from("elective_exchange").delete().eq("id", packToDelete)

      if (error) throw error

      // Update local state
      const updatedPacks = electivePacks.filter((pack) => pack.id !== packToDelete)
      setElectivePacks(updatedPacks)

      // Update cache
      clearCache()
      setCachedData(updatedPacks)
      localStorage.removeItem("admin_dashboard_stats_cache")

      toast({
        title: t("admin.electives.success", "Success"),
        description: t("admin.electives.deleted", "Exchange program deleted successfully"),
      })
    } catch (error) {
      console.error("Error deleting exchange program:", error)
      toast({
        title: t("admin.electives.error", "Error"),
        description: t("admin.electives.errorDeleting", "Failed to delete exchange program"),
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setIsDeleteDialogOpen(false)
      setPackToDelete(null)
    }
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {t("manager.electives.exchangePrograms", "Exchange Programs")}
            </h1>
            <p className="text-muted-foreground mt-2">
              {t("admin.electives.subtitle", "Manage exchange programs for student mobility")}
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder={t("manager.electives.searchExchange", "Search exchange programs...")}
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[130px]">
                      <Filter className="mr-2 h-4 w-4" />
                      <SelectValue placeholder={t("manager.electives.status", "Status")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("manager.electives.allStatus", "All Status")}</SelectItem>
                      <SelectItem value="published">{t("manager.electives.active", "Active")}</SelectItem>
                      <SelectItem value="draft">{t("manager.electives.draft", "Draft")}</SelectItem>
                      <SelectItem value="closed">{t("manager.electives.inactive", "Inactive")}</SelectItem>
                      <SelectItem value="archived">{t("manager.status.archived", "Archived")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[30%]">{t("manager.electives.name", "Name")}</TableHead>
                      <TableHead>{t("manager.electives.deadline", "Deadline")}</TableHead>
                      <TableHead>{t("manager.electives.universities", "Universities")}</TableHead>
                      <TableHead>{t("manager.electives.status", "Status")}</TableHead>
                      <TableHead>{t("manager.electives.createdBy", "Created by")}</TableHead>
                      <TableHead className="text-right w-[100px]">{t("manager.electives.action", "Action")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableSkeleton columns={6} rows={5} />
                    ) : filteredPacks.length > 0 ? (
                      filteredPacks.map((pack) => (
                        <TableRow key={pack.id}>
                          <TableCell className="font-medium">{getLocalizedName(pack)}</TableCell>
                          <TableCell>
                            {pack.deadline ? (
                              formatDate(pack.deadline)
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>{pack.university_count || 0}</TableCell>
                          <TableCell>{getStatusBadge(pack.status)}</TableCell>
                          <TableCell>
                            <span className="text-muted-foreground">{pack.creator_name || "Admin"}</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <span className="sr-only">{t("common.openMenu", "Open menu")}</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link href={`/admin/electives/exchange/${pack.id}`}>{t("common.view", "View")}</Link>
                                </DropdownMenuItem>
                                {pack.status === "published" ? (
                                  <DropdownMenuItem onClick={() => handleStatusChange(pack.id, "closed")}>
                                    {t("common.deactivate", "Deactivate")}
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem onClick={() => handleStatusChange(pack.id, "published")}>
                                    {t("common.activate", "Activate")}
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={() => openDeleteDialog(pack.id)}
                                  className="text-red-600 focus:text-red-600"
                                >
                                  {t("common.delete", "Delete")}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          {t("manager.electives.noExchangePrograms", "No exchange programs found")}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.electives.confirmDelete", "Confirm Deletion")}</DialogTitle>
            <DialogDescription>
              {t(
                "admin.electives.deleteWarning",
                "Are you sure you want to delete this exchange program? This action cannot be undone.",
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isDeleting}>
              {t("common.cancel", "Cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? t("common.deleting", "Deleting...") : t("common.delete", "Delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
