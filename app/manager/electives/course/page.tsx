"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Search, Filter, Plus, MoreHorizontal } from "lucide-react"
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
  status: string
  deadline: string | null
  created_at: string
  updated_at: string
  max_selections: number
  semester: string | null
  syllabus_template_url: string | null
  courses: string[] | null
  course_count?: number
  group_id: string | null
  requires_statement: boolean | null
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

export default function ManagerCourseElectivesPage() {
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

  useEffect(() => {
    const fetchElectivePacks = async () => {
      try {
        setIsLoading(true)
        const cacheKey = "coursePrograms"

        const cachedData = getCachedData(cacheKey)
        if (cachedData) {
          setElectivePacks(cachedData)
          setFilteredPacks(cachedData)
          setIsLoading(false)
          return
        }

        // Use API route instead of direct database query
        const response = await fetch('/api/manager/electives/course', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          const errorData = await response.json()
          // Redirect to login on authentication errors
          if (errorData.error === "Authentication failed") {
            window.location.href = "/manager/login"
            return
          }
          throw new Error(errorData.error || `API error: ${response.status}`)
        }

        const packsWithCounts = await response.json()

        setElectivePacks(packsWithCounts)
        setFilteredPacks(packsWithCounts)
        setCachedData(cacheKey, packsWithCounts)
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
        console.log("Refetching elective packs for course electives page...")
        setIsLoading(true)

        const response = await fetch('/api/manager/electives/course', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          const errorData = await response.json()
          // Redirect to login on authentication errors
          if (errorData.error === "Authentication failed") {
            window.location.href = "/manager/login"
            return
          }
          console.error("Error refetching elective packs:", errorData)
          return
        }

        const data = await response.json()

        // Add course count for each pack
        const packsWithCounts = (data || []).map((pack) => ({
          ...pack,
          course_count: Array.isArray(pack.courses) ? pack.courses.length : 0,
        }))

        setElectivePacks(packsWithCounts)
        setFilteredPacks(packsWithCounts)

        // Update cache
        setCachedData("coursePrograms", packsWithCounts)
      } catch (error) {
        console.error("Error in refetchElectivePacks:", error)
      } finally {
        setIsLoading(false)
      }
    }

    const channel = supabase
      .channel("elective-courses-manager-page")
      .on("postgres_changes", { event: "*", schema: "public", table: "elective_courses" }, (payload) => {
        console.log("Elective courses change detected on manager page:", payload)
        refetchElectivePacks()
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("✓ Manager course electives page subscribed to elective_courses changes")
        } else if (status === "CHANNEL_ERROR") {
          console.error("✗ Error subscribing to elective_courses changes on manager page")
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

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase.from("elective_courses").update({ status: newStatus }).eq("id", id)

      if (error) throw error

      invalidateCache("coursePrograms")
      localStorage.removeItem("admin_dashboard_stats_cache")
      setElectivePacks((prev) => prev.map((pack) => (pack.id === id ? { ...pack, status: newStatus } : pack)))

      toast({
        title: t("manager.electives.success", "Success"),
        description: t("manager.electives.statusUpdated", "Status updated successfully"),
      })
    } catch (error) {
      console.error("Error updating status:", error)
      toast({
        title: t("manager.electives.error", "Error"),
        description: t("manager.electives.errorUpdatingStatus", "Failed to update status"),
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

      // Use API route instead of direct database query
      const response = await fetch(`/api/manager/electives/course?id=${packToDelete}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `API error: ${response.status}`)
      }

      invalidateCache("coursePrograms")
      localStorage.removeItem("admin_dashboard_stats_cache")
      setElectivePacks((prev) => prev.filter((pack) => pack.id !== packToDelete))

      toast({
        title: t("manager.electives.success", "Success"),
        description: t("manager.electives.deleted", "Elective pack deleted successfully"),
      })
    } catch (error) {
      console.error("Error deleting elective pack:", error)
      toast({
        title: t("manager.electives.error", "Error"),
        description: t("manager.electives.errorDeleting", "Failed to delete elective pack"),
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
              {t("manager.electives.courseElectives", "Course Electives")}
            </h1>
            <p className="text-muted-foreground mt-2">
              {t("manager.electives.subtitle", "Manage elective courses for students")}
            </p>
          </div>
          <Link href="/manager/electives/course-builder">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t("manager.electives.create", "Create")}
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
                    placeholder={t("manager.electives.searchCourses", "Search course electives...")}
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
                      <TableHead>{t("manager.electives.courses", "Courses")}</TableHead>
                      <TableHead>{t("manager.electives.totalSelections", "Total Selections")}</TableHead>
                      <TableHead>{t("manager.electives.status", "Status")}</TableHead>
                      <TableHead className="text-right w-[100px]">{t("manager.electives.action", "Action")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableSkeleton columns={7} rows={5} />
                    ) : filteredPacks.length > 0 ? (
                      filteredPacks.map((pack) => (
                        <TableRow key={pack.id}>
                          <TableCell className="font-medium">{getLocalizedName(pack)}</TableCell>
                          <TableCell>
                            {pack.group?.name || <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell>
                            {pack.deadline ? (
                              formatDate(pack.deadline)
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>{pack.course_count || 0}</TableCell>
                          <TableCell>{pack.total_selections || 0}</TableCell>
                          <TableCell>{getStatusBadge(pack.status)}</TableCell>
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
                                  <Link href={`/manager/electives/course/${pack.id}`}>{t("common.view", "View")}</Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link href={`/manager/electives/course/${pack.id}/edit`}>
                                    {t("common.edit", "Edit")}
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
                        <TableCell colSpan={7} className="h-24 text-center">
                          {t("manager.electives.noCourseElectives", "No course elective packs found.")}
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
            <DialogTitle>{t("manager.electives.confirmDelete", "Confirm Deletion")}</DialogTitle>
            <DialogDescription>
              {t(
                "manager.electives.deleteWarning",
                "Are you sure you want to delete this elective pack? This action cannot be undone.",
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
