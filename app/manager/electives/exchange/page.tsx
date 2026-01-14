"use client"

import { useState, useEffect } from "react"
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
import { Badge } from "@/components/ui/badge"
import { Search, Filter, Plus, MoreHorizontal, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { useLanguage } from "@/lib/language-context"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { TableSkeleton } from "@/components/ui/table-skeleton"
import { formatDate } from "@/lib/utils"
import { useDialogState } from "@/hooks/use-dialog-state"
import { cleanupDialogEffects } from "@/lib/dialog-utils"
// Cache constants
const CACHE_EXPIRY = 60 * 60 * 1000 // 60 minutes

// Cache helper functions (same as admin/student dashboards)
const getCachedData = (key: string): any | null => {
  try {
    const cachedData = localStorage.getItem(key)
    if (!cachedData) return null

    const parsed = JSON.parse(cachedData)

    // Check if cache is expired
    if (Date.now() - parsed.timestamp > CACHE_EXPIRY) {
      localStorage.removeItem(key)
      return null
    }

    return parsed.data
  } catch (error) {
    console.error(`Error reading from cache (${key}):`, error)
    return null
  }
}

const setCachedData = (key: string, data: any) => {
  try {
    const cacheData = {
      data,
      timestamp: Date.now(),
    }
    localStorage.setItem(key, JSON.stringify(cacheData))
  } catch (error) {
    console.error(`Error writing to cache (${key}):`, error)
  }
}

const invalidateCache = (key: string) => {
  try {
    localStorage.removeItem(key)
  } catch (error) {
    console.error(`Error invalidating cache (${key}):`, error)
  }
}

interface ElectivePack {
  id: string
  name: string
  name_ru: string | null
  semester: string
  status: string
  deadline: string | null
  created_at: string
  updated_at: string
  max_selections: number
  statement_template_url: string | null
  universities: string[] | null
  university_count?: number
  group_id: string | null
  academic_year: {
    id: string
    year: string
    is_active: boolean
  } | null
  group: {
    id: string
    name: string
  } | null
  created_by_profile: {
    id: string
    full_name: string
  } | null
}

export default function ManagerExchangeElectivesPage() {
  const [electivePacks, setElectivePacks] = useState<ElectivePack[]>([])
  const [filteredPacks, setFilteredPacks] = useState<ElectivePack[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const { t, language } = useLanguage()
  const { toast } = useToast()
  const supabase = getSupabaseBrowserClient()

  // Delete confirmation dialog state
  const [packToDelete, setPackToDelete] = useState<string | null>(null)
  const {
    isOpen: isDeleteDialogOpen,
    openDialog: openDeleteDialog,
    closeDialog: closeDeleteDialog,
  } = useDialogState(false)

  useEffect(() => {
    const fetchElectivePacks = async () => {
      try {
        setIsLoading(true)
        const cacheKey = "exchangePrograms"

        // Check if we need to force refresh (e.g., coming from exchange builder)
        const shouldForceRefresh = sessionStorage.getItem('forceRefreshExchangeList') === 'true'
        if (shouldForceRefresh) {
          sessionStorage.removeItem('forceRefreshExchangeList')
        }

        const cachedData = getCachedData(cacheKey)

        if (cachedData && !shouldForceRefresh) {
          setElectivePacks(cachedData)
          setFilteredPacks(cachedData)
          setIsLoading(false)
          return
        }

        // Use API route instead of direct database query
        const response = await fetch('/api/manager/electives/exchange', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || `API error: ${response.status}`)
        }

        const processedPacks = await response.json()

        setCachedData(cacheKey, processedPacks)
        setElectivePacks(processedPacks)
        setFilteredPacks(processedPacks)
      } catch (error) {
        console.error("Error fetching elective packs:", error)
        toast({
          title: t("manager.electives.error", "Error"),
          description: t("manager.electives.errorFetching", "Failed to fetch elective packs"),
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchElectivePacks()
  }, []) // Remove unstable dependencies that cause infinite re-renders

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

  // Set up real-time subscriptions for instant updates
  useEffect(() => {
    // Helper function to refetch elective packs
    const refetchElectivePacks = async () => {
      try {
        console.log("Refetching elective packs for exchange electives page...")
        setIsLoading(true)

        const response = await fetch('/api/manager/electives/exchange', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          const errorData = await response.json()
          console.error("Error refetching elective packs:", errorData)
          return
        }

        const data = await response.json()

        // Process the data with localized names and course counts
        const processedPacks = (data || []).map((pack) => ({
          ...pack,
          course_count: Array.isArray(pack.courses) ? pack.courses.length : 0,
        }))

        setElectivePacks(processedPacks)
        setFilteredPacks(processedPacks)

        // Update cache
        setCachedData("exchangePrograms", processedPacks)
      } catch (error) {
        console.error("Error in refetchElectivePacks:", error)
      } finally {
        setIsLoading(false)
      }
    }

    const channel = supabase
      .channel("elective-exchange-manager-page")
      .on("postgres_changes", { event: "*", schema: "public", table: "elective_exchange" }, (payload) => {
        console.log("Elective exchange change detected on manager page:", payload)
        refetchElectivePacks()
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("✓ Manager exchange electives page subscribed to elective_exchange changes")
        } else if (status === "CHANNEL_ERROR") {
          console.error("✗ Error subscribing to elective_exchange changes on manager page")
        }
      })

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, toast, t, setCachedData])

  const getLocalizedName = (pack: ElectivePack) => {
    if (language === "ru" && pack.name_ru) {
      return pack.name_ru
    }
    return pack.name
  }

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

  const handleStatusChange = async (packId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("elective_exchange")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", packId)

      if (error) throw error

      invalidateCache("exchangePrograms")
      setElectivePacks((prev) => prev.map((pack) => (pack.id === packId ? { ...pack, status: newStatus } : pack)))

      toast({
        title: t("manager.electives.statusUpdated", "Status updated"),
        description: t("manager.electives.statusUpdatedDesc", "Exchange program status has been updated successfully"),
      })
    } catch (error: any) {
      toast({
        title: t("manager.electives.error", "Error"),
        description:
          t("manager.electives.errorUpdatingStatus", "Failed to update exchange program status") + ": " + error.message,
        variant: "destructive",
      })
    }
  }

  const handleDelete = (packId: string) => {
    setPackToDelete(packId)
    openDeleteDialog()
  }

  const handleCloseDeleteDialog = () => {
    closeDeleteDialog()
    setTimeout(() => {
      setPackToDelete(null)
      cleanupDialogEffects()
    }, 300)
  }

  const confirmDelete = async () => {
    if (!packToDelete) return

    try {
      // Use API route instead of direct database query
      const response = await fetch(`/api/manager/electives/exchange?id=${packToDelete}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `API error: ${response.status}`)
      }

      invalidateCache("exchangePrograms")
      localStorage.removeItem("admin_dashboard_stats_cache")
      setElectivePacks((prev) => prev.filter((pack) => pack.id !== packToDelete))
      setFilteredPacks((prev) => prev.filter((pack) => pack.id !== packToDelete))

      toast({
        title: t("manager.electives.deleteSuccess", "Exchange program deleted"),
        description: t("manager.electives.deleteSuccessDesc", "Exchange program has been deleted successfully"),
      })

      handleCloseDeleteDialog()
    } catch (error: any) {
      console.error("Error deleting exchange program:", error)
      toast({
        title: t("manager.electives.error", "Error"),
        description: t("manager.electives.errorDeleting", "Failed to delete exchange program") + ": " + error.message,
        variant: "destructive",
      })
      handleCloseDeleteDialog()
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
              {t("manager.electives.subtitle", "Manage exchange programs for student mobility")}
            </p>
          </div>
          <Link href="/manager/electives/exchange-builder">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t("manager.electives.create", "Create Exchange")}
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
                      <TableHead className="w-[20%]">{t("manager.electives.name", "Name")}</TableHead>
                      <TableHead>{t("manager.electives.group", "Group")}</TableHead>
                      <TableHead>{t("manager.electives.deadline", "Deadline")}</TableHead>
                      <TableHead>{t("manager.electives.universities", "Universities")}</TableHead>
                      <TableHead>{t("manager.electives.totalSelections", "Total Selections")}</TableHead>
                      <TableHead>{t("manager.electives.status", "Status")}</TableHead>
                      <TableHead className="w-[80px]">{t("manager.electives.action", "Action")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableSkeleton columns={7} rows={5} />
                    ) : filteredPacks.length > 0 ? (
                      filteredPacks.map((pack) => (
                        <TableRow key={pack.id}>
                          <TableCell className="font-medium">
                            <Link href={`/manager/electives/exchange/${pack.id}`} className="hover:underline">
                              {getLocalizedName(pack)}
                            </Link>
                          </TableCell>
                          <TableCell>
                            {pack.group?.name || <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell>
                            {pack.deadline ? (
                              formatDate(pack.deadline, language === "ru" ? "ru-RU" : "en-US")
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>{pack.university_count || 0}</TableCell>
                          <TableCell>{pack.total_selections || 0}</TableCell>
                          <TableCell>{getStatusBadge(pack.status)}</TableCell>
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
                                  <Link href={`/manager/electives/exchange/${pack.id}`} className="w-full">
                                    {t("common.view", "View")}
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Link href={`/manager/electives/exchange/${pack.id}/edit`} className="w-full">
                                    {t("manager.electives.edit", "Edit")}
                                  </Link>
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
                                <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(pack.id)}>
                                  {t("common.delete", "Delete")}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                          {t("manager.electives.noExchangePrograms", "No exchange programs found.")}
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
              {t("manager.electives.deleteConfirmTitle", "Delete Exchange Program")}
            </DialogTitle>
            <DialogDescription className="pt-2">
              {t(
                "manager.electives.deleteConfirmMessage",
                "Are you sure you want to delete this exchange program? This action cannot be undone.",
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleCloseDeleteDialog}>
              {t("manager.electives.cancelDelete", "Cancel")}
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              {t("manager.electives.confirmDelete", "Delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
