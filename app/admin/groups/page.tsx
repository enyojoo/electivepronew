"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Search,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Users,
  Filter,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useLanguage } from "@/lib/language-context"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { TableSkeleton } from "@/components/ui/table-skeleton"
import { useDialogState } from "@/hooks/use-dialog-state"
import { cleanupDialogEffects } from "@/lib/dialog-utils"

// Cache keys
const GROUPS_CACHE_KEY = "admin_groups_cache"
const DEGREES_CACHE_KEY = "admin_degrees_cache"
const ACADEMIC_YEARS_CACHE_KEY = "admin_academic_years_cache"

// Cache expiry time (1 hour)
const CACHE_EXPIRY = 60 * 60 * 1000

interface Group {
  id: string
  name: string
  degree: string
  degreeId: string
  academicYear: string
  students: number
  status: string
}

interface Degree {
  id: string
  name: string
  name_ru: string | null
}

interface AcademicYear {
  id: string
  year: string
}

export default function GroupsPage() {
  const { t, language } = useLanguage()
  const { toast } = useToast()
  const supabase = getSupabaseBrowserClient()

  const [groups, setGroups] = useState<Group[]>([])
  const [filteredGroups, setFilteredGroups] = useState<Group[]>([])
  const [degrees, setDegrees] = useState<Degree[]>([])
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([])
  const [isLoadingGroups, setIsLoadingGroups] = useState(true)
  const [isLoadingDegrees, setIsLoadingDegrees] = useState(true)
  const [isLoadingYears, setIsLoadingYears] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [yearFilter, setYearFilter] = useState("all")
  const [degreeFilter, setDegreeFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [currentGroup, setCurrentGroup] = useState<any>({
    name: "",
    degreeId: "",
    academicYearId: "",
    yearInput: "",
    status: "active",
  })
  const [isEditing, setIsEditing] = useState(false)
  const [filteredAcademicYears, setFilteredAcademicYears] = useState<AcademicYear[]>([])
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false)

  // Delete confirmation dialog state
  const [groupToDelete, setGroupToDelete] = useState<string | null>(null)
  const {
    isOpen: isDeleteDialogOpen,
    openDialog: openDeleteDialog,
    closeDialog: closeDeleteDialog,
  } = useDialogState(false)

  // Ref to track if component is mounted
  const isMounted = useRef(true)

  useEffect(() => {
    return () => {
      isMounted.current = false
      cleanupDialogEffects()
    }
  }, [])

  // Load cached data on initial render
  useEffect(() => {
    const loadCachedData = () => {
      try {
        // Load cached groups
        const cachedGroups = localStorage.getItem(GROUPS_CACHE_KEY)
        if (cachedGroups) {
          const { data, timestamp } = JSON.parse(cachedGroups)
          if (Date.now() - timestamp < CACHE_EXPIRY) {
            setGroups(data)
            setIsLoadingGroups(false)
          }
        }

        // Load cached degrees
        const cachedDegrees = localStorage.getItem(DEGREES_CACHE_KEY)
        if (cachedDegrees) {
          const { data, timestamp } = JSON.parse(cachedDegrees)
          if (Date.now() - timestamp < CACHE_EXPIRY) {
            setDegrees(data)
            setIsLoadingDegrees(false)
          }
        }

        // Load cached academic years
        const cachedYears = localStorage.getItem(ACADEMIC_YEARS_CACHE_KEY)
        if (cachedYears) {
          const { data, timestamp } = JSON.parse(cachedYears)
          if (Date.now() - timestamp < CACHE_EXPIRY) {
            setAcademicYears(data)
            setIsLoadingYears(false)
          }
        }
      } catch (error) {
        console.error("Error loading cached data:", error)
      }
    }

    loadCachedData()
  }, [])

  // Fetch groups from Supabase
  useEffect(() => {
    const fetchGroups = async () => {
      if (!isLoadingGroups) {
        return
      }

      try {
        // Fetch groups with relationships
        const { data: groupsData, error: groupsError } = await supabase
          .from("groups")
          .select(`
            id,
            name,
            status,
            degree_id,
            academic_year_id,
            academic_years(
              id,
              year
            ),
            degrees(id, name, name_ru)
          `)
          .order("name")

        if (groupsError) throw groupsError

        if (!groupsData) {
          setGroups([])
          setIsLoadingGroups(false)
          return
        }

        // Count students in each group
        const studentCountPromises = groupsData.map((group) =>
          supabase
            .from("student_profiles")
            .select("*", { count: "exact", head: true })
            .eq("group_id", group.id),
        )

        const studentCountResults = await Promise.all(studentCountPromises)

        // Create a map of group ID to student count
        const studentCountMap = new Map()
        studentCountResults.forEach((result, index) => {
          const groupId = groupsData[index].id
          studentCountMap.set(groupId, result.count || 0)
        })

        // Format the groups data
        const formattedGroups: Group[] = groupsData.map((group) => {
          const degree = group.degrees
            ? Array.isArray(group.degrees)
              ? group.degrees[0]
              : group.degrees
            : null
          const academicYear = Array.isArray(group.academic_years) ? group.academic_years[0] : group.academic_years

          return {
            id: group.id.toString(),
            name: group.name,
            degree: language === "ru" && degree?.name_ru ? degree.name_ru : degree?.name || "Unknown",
            degreeId: group.degree_id || "",
            academicYear: academicYear?.year || "",
            students: studentCountMap.get(group.id) || 0,
            status: group.status,
          }
        })

        setGroups(formattedGroups)

        // Cache the groups data
        localStorage.setItem(
          GROUPS_CACHE_KEY,
          JSON.stringify({
            data: formattedGroups,
            timestamp: Date.now(),
          }),
        )
      } catch (error: any) {
        console.error("Error fetching groups:", error)
        toast({
          title: t("admin.groups.error"),
          description: t("admin.groups.errorFetching") + ": " + error.message,
          variant: "destructive",
        })
      } finally {
        setIsLoadingGroups(false)
      }
    }

    fetchGroups()
  }, [supabase, toast, t, isLoadingGroups, language])

  // Fetch degrees from Supabase
  useEffect(() => {
    const fetchDegrees = async () => {
      if (!isLoadingDegrees) {
        return
      }

      try {
        const { data, error } = await supabase
          .from("degrees")
          .select("id, name, name_ru")
          .order("name", { ascending: true })

        if (error) throw error

        setDegrees(data || [])

        // Cache the degrees data
        localStorage.setItem(
          DEGREES_CACHE_KEY,
          JSON.stringify({
            data: data || [],
            timestamp: Date.now(),
          }),
        )
      } catch (error: any) {
        console.error("Error fetching degrees:", error)
        toast({
          title: t("admin.groups.error"),
          description: t("admin.groups.errorFetchingReferenceData") + ": " + error.message,
          variant: "destructive",
        })
      } finally {
        setIsLoadingDegrees(false)
      }
    }

    fetchDegrees()
  }, [supabase, toast, t, isLoadingDegrees])

  // Fetch academic years from Supabase
  useEffect(() => {
    const fetchAcademicYears = async () => {
      if (!isLoadingYears) {
        return
      }

      try {
        const { data, error } = await supabase
          .from("academic_years")
          .select("id, year, degree_id")
          .eq("is_active", true)
          .order("year", { ascending: false })

        if (error) throw error

        setAcademicYears(data || [])

        // Cache the academic years data
        localStorage.setItem(
          ACADEMIC_YEARS_CACHE_KEY,
          JSON.stringify({
            data: data || [],
            timestamp: Date.now(),
          }),
        )
      } catch (error: any) {
        console.error("Error fetching academic years:", error)
        toast({
          title: t("admin.groups.error"),
          description: t("admin.groups.errorFetchingReferenceData") + ": " + error.message,
          variant: "destructive",
        })
      } finally {
        setIsLoadingYears(false)
      }
    }

    fetchAcademicYears()
  }, [supabase, toast, t, isLoadingYears])

  // Filter academic years by selected degree
  useEffect(() => {
    if (currentGroup.degreeId && academicYears.length > 0) {
      const filtered = academicYears.filter((ay: any) => ay.degree_id === currentGroup.degreeId)
      setFilteredAcademicYears(filtered)
    } else {
      setFilteredAcademicYears([])
    }
  }, [currentGroup.degreeId, academicYears])

  // Set up real-time subscriptions for instant updates
  useEffect(() => {
    const channel = supabase
      .channel("groups-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "groups" },
        async () => {
          // Invalidate cache
          localStorage.removeItem(GROUPS_CACHE_KEY)
          setIsLoadingGroups(true)

          // Refetch groups
          try {
            const { data: groupsData, error: groupsError } = await supabase
              .from("groups")
              .select(`
                id,
                name,
                status,
                degree_id,
                academic_year_id,
                academic_years(
                  id,
                  year
                ),
                degrees(id, name, name_ru)
              `)
              .order("name")

            if (groupsError) throw groupsError

            if (!groupsData) {
              setGroups([])
              setIsLoadingGroups(false)
              return
            }

            // Count students in each group
            const studentCountPromises = groupsData.map((group) =>
              supabase
                .from("student_profiles")
                .select("*", { count: "exact", head: true })
                .eq("group_id", group.id),
            )

            const studentCountResults = await Promise.all(studentCountPromises)

            const studentCountMap = new Map()
            studentCountResults.forEach((result, index) => {
              const groupId = groupsData[index].id
              studentCountMap.set(groupId, result.count || 0)
            })

            // Format the groups data
            const formattedGroups: Group[] = groupsData.map((group) => {
              const degree = group.degrees
                ? Array.isArray(group.degrees)
                  ? group.degrees[0]
                  : group.degrees
                : null
              const academicYear = Array.isArray(group.academic_years) ? group.academic_years[0] : group.academic_years

              return {
                id: group.id.toString(),
                name: group.name,
                degree: language === "ru" && degree?.name_ru ? degree.name_ru : degree?.name || "Unknown",
                degreeId: group.degree_id || "",
                academicYear: academicYear?.year || "",
                students: studentCountMap.get(group.id) || 0,
                status: group.status,
              }
            })

            setGroups(formattedGroups)

            // Update cache
            localStorage.setItem(
              GROUPS_CACHE_KEY,
              JSON.stringify({
                data: formattedGroups,
                timestamp: Date.now(),
              }),
            )
          } catch (error: any) {
            console.error("Error refetching groups after real-time update:", error)
          } finally {
            setIsLoadingGroups(false)
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "student_profiles" },
        async () => {
          // When student profiles change, update student counts
          if (groups.length > 0) {
            const studentCountPromises = groups.map((group) =>
              supabase
                .from("student_profiles")
                .select("*", { count: "exact", head: true })
                .eq("group_id", group.id),
            )

            const studentCountResults = await Promise.all(studentCountPromises)

            const updatedGroups = groups.map((group, index) => ({
              ...group,
              students: studentCountResults[index].count || 0,
            }))

            setGroups(updatedGroups)

            // Update cache
            localStorage.setItem(
              GROUPS_CACHE_KEY,
              JSON.stringify({
                data: updatedGroups,
                timestamp: Date.now(),
              }),
            )
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, groups, language])

  // Filter groups based on search term and filters
  useEffect(() => {
    let result = [...groups]

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter((group) => group.name.toLowerCase().includes(term))
    }

    if (yearFilter !== "all") {
      result = result.filter((group) => group.academicYear === yearFilter)
    }

    if (degreeFilter !== "all") {
      result = result.filter((group) => group.degree === degreeFilter)
    }

    setFilteredGroups(result)
    setCurrentPage(1) // Reset to first page when filters change
  }, [searchTerm, yearFilter, degreeFilter, groups])

  // Get unique values for filters
  const groupYears = [...new Set(groups.map((group) => group.academicYear))].sort((a, b) => b.localeCompare(a))
  const degreesList = [...new Set(groups.map((group) => group.degree))]

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredGroups.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredGroups.length / itemsPerPage)

  // Dialog handlers
  const handleOpenDialog = (group?: Group) => {
    if (group) {
      // Find academic year ID from year string
      const academicYear = academicYears.find((y) => y.year === group.academicYear)
      setCurrentGroup({
        id: group.id,
        name: group.name,
        degreeId: group.degreeId,
        academicYearId: academicYear?.id || "",
        yearInput: group.academicYear || "",
        status: group.status,
      })
      setIsEditing(true)
    } else {
      setCurrentGroup({
        name: "",
        degreeId: degrees.length > 0 ? degrees[0].id : "",
        academicYearId: "",
        yearInput: "",
        status: "active",
      })
      setIsEditing(false)
    }
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setTimeout(() => {
      cleanupDialogEffects()
    }, 300)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setCurrentGroup({
      ...currentGroup,
      [name]: value,
      // Reset academic year selection when degree changes
      ...(name === "degreeId" && { academicYearId: "", yearInput: "" }),
    })
  }

  const handleYearInputChange = (value: string) => {
    setCurrentGroup({
      ...currentGroup,
      yearInput: value,
      academicYearId: "", // Clear selected ID when typing
    })
    setIsYearDropdownOpen(true)
  }

  const handleYearSelect = (yearId: string, yearValue: string) => {
    setCurrentGroup({
      ...currentGroup,
      academicYearId: yearId,
      yearInput: yearValue,
    })
    setIsYearDropdownOpen(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      let academicYearId = currentGroup.academicYearId

      // If yearInput is provided but no academicYearId is selected, check if it's a new year
      if (currentGroup.yearInput && !academicYearId && currentGroup.degreeId) {
        const yearValue = currentGroup.yearInput.trim()
        
        // Validate year format (should be 4 digits)
        if (!/^\d{4}$/.test(yearValue)) {
          throw new Error(t("admin.groups.invalidYear") || "Year must be a 4-digit number (e.g., 2025)")
        }

        // Check if year already exists for this degree
        const { data: existingYear } = await supabase
          .from("academic_years")
          .select("id")
          .eq("degree_id", currentGroup.degreeId)
          .eq("year", yearValue)
          .single()

        if (existingYear) {
          academicYearId = existingYear.id
        } else {
          // Create new academic year
          const { data: newYearData, error: yearError } = await supabase
            .from("academic_years")
            .insert({
              degree_id: currentGroup.degreeId,
              year: yearValue,
              is_active: true,
            })
            .select("id")
            .single()

          if (yearError) throw yearError
          academicYearId = newYearData.id

          // Invalidate academic years cache
          localStorage.removeItem(ACADEMIC_YEARS_CACHE_KEY)
          setIsLoadingYears(true)
        }
      }

      if (!academicYearId) {
        throw new Error(t("admin.groups.errorSelectYear") || "Please select or enter an academic year")
      }

      if (isEditing) {
        // Update existing group
        const { error } = await supabase
          .from("groups")
          .update({
            name: currentGroup.name,
            degree_id: currentGroup.degreeId,
            academic_year_id: academicYearId,
            status: currentGroup.status,
          })
          .eq("id", currentGroup.id)

        if (error) throw error

        // Invalidate cache
        localStorage.removeItem(GROUPS_CACHE_KEY)
        setIsLoadingGroups(true)
      } else {
        // Add new group
        const { error } = await supabase
          .from("groups")
          .insert({
            name: currentGroup.name,
            degree_id: currentGroup.degreeId,
            academic_year_id: academicYearId,
            status: currentGroup.status,
          })

        if (error) throw error

        // Invalidate cache
        localStorage.removeItem(GROUPS_CACHE_KEY)
        setIsLoadingGroups(true)
      }

      toast({
        title: t("admin.groups.success"),
        description: isEditing ? t("admin.groups.groupUpdated") : t("admin.groups.groupCreated"),
      })

      handleCloseDialog()
    } catch (error: any) {
      console.error("Error saving group:", error)
      toast({
        title: t("admin.groups.error"),
        description: error.message || t("admin.groups.errorSaving"),
        variant: "destructive",
      })
    }
  }

  const handleDelete = (id: string) => {
    setGroupToDelete(id)
    openDeleteDialog()
  }

  const handleCloseDeleteDialog = () => {
    closeDeleteDialog()
    setTimeout(() => {
      setGroupToDelete(null)
      cleanupDialogEffects()
    }, 300)
  }

  const confirmDelete = async () => {
    if (!groupToDelete) return

    try {
      const { error } = await supabase.from("groups").delete().eq("id", groupToDelete)

      if (error) throw error

      // Invalidate cache
      localStorage.removeItem(GROUPS_CACHE_KEY)
      setIsLoadingGroups(true)

      toast({
        title: t("admin.groups.success"),
        description: t("admin.groups.groupDeleted"),
      })

      handleCloseDeleteDialog()
    } catch (error: any) {
      console.error("Error deleting group:", error)
      toast({
        title: t("admin.groups.error"),
        description: error.message || t("admin.groups.errorDeleting"),
        variant: "destructive",
      })
      handleCloseDeleteDialog()
    }
  }

  const toggleStatus = async (id: string) => {
    try {
      const group = groups.find((g) => g.id === id)
      if (!group) return

      const newStatus = group.status === "active" ? "inactive" : "active"

      const { error } = await supabase.from("groups").update({ status: newStatus }).eq("id", id)

      if (error) throw error

      // Invalidate cache
      localStorage.removeItem(GROUPS_CACHE_KEY)
      setIsLoadingGroups(true)

      toast({
        title: t("admin.groups.success"),
        description: t("admin.groups.statusUpdated"),
      })
    } catch (error: any) {
      console.error("Error updating status:", error)
      toast({
        title: t("admin.groups.error"),
        description: error.message || t("admin.groups.errorUpdatingStatus"),
        variant: "destructive",
      })
    }
  }

  // Helper functions
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">
            {t("admin.groups.active")}
          </Badge>
        )
      case "inactive":
        return (
          <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100 border-gray-200">
            {t("admin.groups.inactive")}
          </Badge>
        )
      default:
        return <Badge>{status}</Badge>
    }
  }

  const getGroupToDeleteStudentCount = () => {
    if (!groupToDelete) return 0
    const group = groups.find((g) => g.id === groupToDelete)
    return group ? group.students : 0
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("admin.groups.title")}</h1>
            <p className="text-muted-foreground mt-2">{t("admin.groups.subtitle")}</p>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            {t("admin.groups.addGroup")}
          </Button>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder={t("admin.groups.searchGroups")}
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                  <Select value={yearFilter} onValueChange={setYearFilter}>
                    <SelectTrigger className="w-[130px]">
                      <Filter className="mr-2 h-4 w-4" />
                      <SelectValue placeholder={t("admin.groups.year")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("admin.groups.allYears")}</SelectItem>
                      {groupYears.map((year) => (
                        <SelectItem key={year} value={year}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={degreeFilter} onValueChange={setDegreeFilter}>
                    <SelectTrigger className="w-[150px]">
                      <Filter className="mr-2 h-4 w-4" />
                      <SelectValue placeholder={t("admin.groups.degree")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("admin.groups.allDegrees")}</SelectItem>
                      {degreesList.map((degree) => (
                        <SelectItem key={degree} value={degree}>
                          {degree}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("admin.groups.groupCode")}</TableHead>
                      <TableHead>{t("admin.groups.degree")}</TableHead>
                      <TableHead>{t("admin.groups.year")}</TableHead>
                      <TableHead>{t("admin.groups.students")}</TableHead>
                      <TableHead>{t("admin.groups.status")}</TableHead>
                      <TableHead className="w-[80px]">{t("admin.groups.action")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingGroups ? (
                      <TableSkeleton columns={6} rows={itemsPerPage} />
                    ) : currentItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          {t("admin.groups.noGroups")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      currentItems.map((group) => (
                        <TableRow key={group.id}>
                          <TableCell className="font-medium">{group.name}</TableCell>
                          <TableCell>{group.degree}</TableCell>
                          <TableCell>{group.academicYear}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              {group.students}
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(group.status)}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleOpenDialog(group)}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  {t("admin.groups.edit")}
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(group.id)}>
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  {t("admin.groups.delete")}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => toggleStatus(group.id)}>
                                  {group.status === "active"
                                    ? t("admin.groups.deactivate")
                                    : t("admin.groups.activate")}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {filteredGroups.length > itemsPerPage && (
                <div className="flex items-center justify-end space-x-2 py-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    {t("pagination.previous")}
                  </Button>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-medium">
                      {currentPage} / {totalPages}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    {t("pagination.next")}
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit/Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{isEditing ? t("admin.groups.editGroup") : t("admin.groups.addNewGroup")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t("admin.groups.groupCodeLabel")}</Label>
              <Input
                id="name"
                name="name"
                value={currentGroup.name}
                onChange={handleInputChange}
                placeholder={t("admin.groups.groupCodePlaceholder")}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="degreeId">{t("admin.groups.degree")}</Label>
                <select
                  id="degreeId"
                  name="degreeId"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  value={currentGroup.degreeId}
                  onChange={handleInputChange}
                  required
                  disabled={isLoadingDegrees}
                >
                  <option value="">{t("admin.groups.selectDegree")}</option>
                  {degrees.map((degree) => {
                    const displayName = language === "ru" && degree.name_ru ? degree.name_ru : degree.name
                    return (
                      <option key={degree.id} value={degree.id}>
                        {displayName}
                      </option>
                    )
                  })}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="yearInput">{t("admin.groups.year")}</Label>
                {!currentGroup.degreeId ? (
                  <Input
                    id="yearInput"
                    className="w-full bg-gray-100"
                    disabled
                    placeholder={t("admin.groups.selectDegreeFirst") || "Select degree first"}
                  />
                ) : (
                  <div className="relative">
                    <Input
                      id="yearInput"
                      name="yearInput"
                      type="text"
                      placeholder={t("admin.groups.yearPlaceholder") || "e.g., 2025"}
                      value={currentGroup.yearInput}
                      onChange={(e) => handleYearInputChange(e.target.value)}
                      onFocus={() => setIsYearDropdownOpen(true)}
                      onBlur={() => setTimeout(() => setIsYearDropdownOpen(false), 200)}
                      required
                      className="w-full"
                    />
                    {isYearDropdownOpen && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                        {filteredAcademicYears
                          .filter((year) =>
                            currentGroup.yearInput
                              ? year.year.includes(currentGroup.yearInput)
                              : true
                          )
                          .map((year) => (
                            <button
                              key={year.id}
                              type="button"
                              className="w-full text-left px-3 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                              onClick={() => handleYearSelect(year.id, year.year)}
                            >
                              {year.year}
                            </button>
                          ))}
                        {filteredAcademicYears.filter((year) =>
                          currentGroup.yearInput
                            ? year.year.includes(currentGroup.yearInput)
                            : true
                        ).length === 0 && (
                          <div className="px-3 py-2 text-sm text-muted-foreground">
                            {t("admin.groups.noYearsAvailable") || "No years available. Type a year to create one."}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">{t("admin.groups.status")}</Label>
              <select
                id="status"
                name="status"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                value={currentGroup.status}
                onChange={handleInputChange}
              >
                <option value="active">{t("admin.groups.active")}</option>
                <option value="inactive">{t("admin.groups.inactive")}</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                {t("admin.groups.cancel")}
              </Button>
              <Button type="submit">{isEditing ? t("admin.groups.update") : t("admin.groups.create")}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={(open) => !open && handleCloseDeleteDialog()}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              {t("admin.groups.deleteConfirmTitle")}
            </DialogTitle>
            <DialogDescription className="pt-2">
              {t("admin.groups.deleteConfirmDescription")}
              {getGroupToDeleteStudentCount() > 0 && (
                <div className="mt-2 text-destructive font-medium">
                  {t("admin.groups.deleteConfirmStudents", { count: getGroupToDeleteStudentCount() })}
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleCloseDeleteDialog}>
              {t("admin.groups.cancel")}
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              {t("admin.groups.confirmDelete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
