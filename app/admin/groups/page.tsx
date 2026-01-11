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
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { Skeleton } from "@/components/ui/skeleton"
import { useDataCache } from "@/lib/data-cache-context"
import { useDialogState } from "@/hooks/use-dialog-state"
import { cleanupDialogEffects } from "@/lib/dialog-utils"

// Create a separate component for the groups table content
function GroupsTableContent() {
  const { t, language } = useLanguage()
  const [groups, setGroups] = useState<any[]>([])
  const [filteredGroups, setFilteredGroups] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [currentGroup, setCurrentGroup] = useState<any>({
    name: "",
    degreeId: "",
    academicYear: "",
    status: "active",
  })
  const [isEditing, setIsEditing] = useState(false)
  const [degrees, setDegrees] = useState<any[]>([])
  const [years, setYears] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingYears, setIsLoadingYears] = useState(true)
  const [isLoadingDegrees, setIsLoadingDegrees] = useState(true)

  // Delete confirmation dialog state
  const [groupToDelete, setGroupToDelete] = useState<string | null>(null)
  const {
    isOpen: isDeleteDialogOpen,
    openDialog: openDeleteDialog,
    closeDialog: closeDeleteDialog,
  } = useDialogState(false)

  // Ref to track if component is mounted
  const isMounted = useRef(true)
  const dataFetchedRef = useRef(false)
  const yearsFetchedRef = useRef(false)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Filters
  const [yearFilter, setYearFilter] = useState("")
  const [degreeFilter, setDegreeFilter] = useState("")

  const { toast } = useToast()
  const { getCachedData, setCachedData } = useDataCache()

  // Set up cleanup when component unmounts
  useEffect(() => {
    return () => {
      isMounted.current = false

      // Force cleanup of any lingering dialog effects
      document.body.style.removeProperty("overflow")
      document.body.style.removeProperty("padding-right")

      // Remove any aria-hidden attributes from the body
      document.body.removeAttribute("aria-hidden")

      // Remove any data-radix-* attributes from the body
      const attributes = [...document.body.attributes]
      attributes.forEach((attr) => {
        if (attr.name.startsWith("data-radix-")) {
          document.body.removeAttribute(attr.name)
        }
      })
    }
  }, [])

  // Fetch groups from Supabase with caching
  useEffect(() => {
    const fetchGroups = async () => {
      if (dataFetchedRef.current) return

      try {
        setIsLoading(true)

        // Try to get data from cache first
        const cachedGroups = getCachedData<any[]>("groups")

        if (cachedGroups && cachedGroups.length > 0) {
          console.log("Using cached groups data")
          setGroups(cachedGroups)
          setFilteredGroups(cachedGroups)
          setIsLoading(false)
          dataFetchedRef.current = true
          return
        }

        // First, fetch the groups
        const { data: groupsData, error: groupsError } = await supabase
          .from("groups")
          .select("*")
          .order("name")

        if (groupsError) throw groupsError

        if (!groupsData) {
          setGroups([])
          setFilteredGroups([])
          setIsLoading(false)
          dataFetchedRef.current = true
          return
        }

        // Fetch degree information separately
        const degreeIds = [...new Set(groupsData.map((g) => g.degree_id).filter(Boolean))]

        // Fetch degrees
        const { data: degreesData, error: degreesError } = await supabase
          .from("degrees")
          .select("id, name")
          .in("id", degreeIds)

        if (degreesError) throw degreesError

        // Create maps for quick lookups
        const degreeMap = new Map()
        if (degreesData) {
          degreesData.forEach((degree) => {
            degreeMap.set(degree.id, degree.name)
          })
        }

        // Count students in each group using a different approach
        const studentCountMap = new Map()
        for (const group of groupsData) {
          const { count, error: countError } = await supabase
            .from("profiles")
            .select("*", { count: "exact", head: true })
            .eq("group_id", group.id)
            .eq("role", "student")

          if (countError) {
            console.error("Error counting students for group", group.id, countError)
            studentCountMap.set(group.id, 0)
          } else {
            studentCountMap.set(group.id, count || 0)
          }
        }

        // Format the groups data
        const formattedGroups = groupsData.map((group) => ({
          id: group.id.toString(),
          name: group.name,
          displayName: group.display_name,
          degree: degreeMap.get(group.degree_id) || "Unknown",
          degreeId: group.degree_id,
          academicYear: group.academic_year,
          students: studentCountMap.get(group.id) || 0,
          status: group.status,
        }))

        // Save to cache
        setCachedData("groups", formattedGroups)

        if (isMounted.current) {
          setGroups(formattedGroups)
          setFilteredGroups(formattedGroups)
          dataFetchedRef.current = true
        }
      } catch (error) {
        console.error("Failed to fetch groups:", error)
        toast({
          title: t("admin.groups.error"),
          description: t("admin.groups.errorFetching"),
          variant: "destructive",
        })
      } finally {
        if (isMounted.current) {
          setIsLoading(false)
        }
      }
    }

    fetchGroups()
  }, [t, toast, getCachedData, setCachedData])

  // Fetch reference data (degrees and years) with caching
  useEffect(() => {
    const fetchReferenceData = async () => {
      try {
        // Try to get degrees from cache
        const cachedDegrees = getCachedData<any[]>("degrees", "all")
        if (cachedDegrees && cachedDegrees.length > 0 && cachedDegrees[0].name_ru !== undefined) {
          setDegrees(cachedDegrees)
          setIsLoadingDegrees(false)
        } else {
          // Fetch degrees
          const { data: degreesData, error: degreesError } = await supabase
            .from("degrees")
            .select("id, name, name_ru")
            .order("name")

          if (degreesError) throw degreesError

          if (degreesData && isMounted.current) {
            setDegrees(degreesData)
            // Cache the degrees data
            setCachedData("degrees", "all", degreesData)
          }
          setIsLoadingDegrees(false)
        }

        // Only fetch years if not already fetched
        if (!yearsFetchedRef.current) {
          // Try to get years from cache
          const cachedYears = getCachedData<any[]>("years", "global")
          if (cachedYears && cachedYears.length > 0) {
            setYears(cachedYears)
            setIsLoadingYears(false)
            yearsFetchedRef.current = true
          } else {
            // Fetch years from the years table
            const { data: yearsData, error: yearsError } = await supabase
              .from("years")
              .select("id, year")
              .order("year", { ascending: false })

            if (yearsError) throw yearsError

            if (yearsData && isMounted.current) {
              setYears(yearsData)
              // Cache the years data
              setCachedData("years", "global", yearsData)
              yearsFetchedRef.current = true
            }
            setIsLoadingYears(false)
          }
        }
      } catch (error) {
        console.error("Failed to fetch reference data:", error)
        toast({
          title: t("admin.groups.error"),
          description: t("admin.groups.errorFetchingReferenceData"),
          variant: "destructive",
        })
        setIsLoadingDegrees(false)
        setIsLoadingYears(false)
      }
    }

    fetchReferenceData()
  }, [t, toast, getCachedData, setCachedData, language])

  // Add this after the other useEffect hooks
  useEffect(() => {
    // Force re-render when language changes to update degree names in the UI
    if (isDialogOpen) {
      // If dialog is open, we need to ensure degrees are displayed in the correct language
      const updatedDegrees = [...degrees]
      setDegrees(updatedDegrees)
    }
  }, [language, isDialogOpen])

  // Get unique values for filters
  const groupYears = [...new Set(groups.map((group) => group.academicYear))].sort((a, b) => b.localeCompare(a))
  const degreesList = [...new Set(groups.map((group) => group.degree))]

  // Apply filters and search
  useEffect(() => {
    let result = groups

    // Apply year filter
    if (yearFilter && yearFilter !== "all") {
      result = result.filter((group) => group.academicYear === yearFilter)
    }

    // Apply degree filter
    if (degreeFilter && degreeFilter !== "all") {
      result = result.filter((group) => group.degree === degreeFilter)
    }

    // Apply search
    if (searchTerm) {
      result = result.filter(
        (group) =>
          group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (group.displayName && group.displayName.toLowerCase().includes(searchTerm.toLowerCase())),
      )
    }

    setFilteredGroups(result)
    setCurrentPage(1) // Reset to first page when filters change
  }, [groups, searchTerm, yearFilter, degreeFilter])

  // Get current page items
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredGroups.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredGroups.length / itemsPerPage)

  // Find the current year in the years array
  const getCurrentYearOption = () => {
    const currentYear = new Date().getFullYear().toString()
    const yearOption = years.find((y) => y.year === currentYear)
    return yearOption ? yearOption.year : years.length > 0 ? years[0].year : ""
  }

  // Safe dialog open handler
  const handleOpenDialog = (group?: (typeof groups)[0]) => {
    if (group) {
      setCurrentGroup({
        id: group.id,
        name: group.name,
        degreeId: group.degreeId?.toString() || "",
        academicYear: group.academicYear,
        status: group.status,
      })
      setIsEditing(true)
    } else {
      setCurrentGroup({
        name: "",
        degreeId: degrees.length > 0 ? degrees[0].id.toString() : "",
        academicYear: getCurrentYearOption(),
        status: "active",
      })
      setIsEditing(false)
    }

    // Ensure body is in a clean state before opening dialog
    document.body.style.removeProperty("overflow")
    document.body.removeAttribute("aria-hidden")

    // Set timeout to ensure DOM is ready
    setTimeout(() => {
      if (isMounted.current) {
        setIsDialogOpen(true)
      }
    }, 0)
  }

  // Safe dialog close handler
  const handleCloseDialog = () => {
    setIsDialogOpen(false)

    // Ensure cleanup after dialog closes
    setTimeout(() => {
      if (isMounted.current) {
        // Reset body styles
        document.body.style.removeProperty("overflow")
        document.body.style.removeProperty("padding-right")
        document.body.removeAttribute("aria-hidden")

        // Remove any data-radix-* attributes from the body
        const attributes = [...document.body.attributes]
        attributes.forEach((attr) => {
          if (attr.name.startsWith("data-radix-")) {
            document.body.removeAttribute(attr.name)
          }
        })
      }
    }, 300) // Wait for animation to complete
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setCurrentGroup({
      ...currentGroup,
      [name]: value,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (isEditing) {
        // Update existing group
        const { error } = await supabase
          .from("groups")
          .update({
            name: currentGroup.name,
            degree_id: currentGroup.degreeId,
            academic_year: currentGroup.academicYear,
            status: currentGroup.status,
          })
          .eq("id", currentGroup.id)

        if (error) throw error

        // Refresh the groups list to get updated data
        const { data, error: fetchError } = await supabase.from("groups").select("*").eq("id", currentGroup.id).single()

        if (fetchError) throw fetchError

        // Get degree name
        const degree = degrees.find((d) => d.id === currentGroup.degreeId)

        if (data) {
          const updatedGroup = {
            ...groups.find((g) => g.id === currentGroup.id),
            id: data.id.toString(),
            name: data.name,
            degree: degree?.name || "Unknown",
            degreeId: data.degree_id,
            academicYear: data.academic_year,
            status: data.status,
          }

          const updatedGroups = groups.map((group) => (group.id === currentGroup.id ? updatedGroup : group))
          setGroups(updatedGroups)

          // Update cache
          setCachedData("groups", "all", updatedGroups)

          toast({
            title: t("admin.groups.success"),
            description: t("admin.groups.groupUpdated"),
          })
        }
      } else {
        // Add new group
        const { data, error } = await supabase
          .from("groups")
          .insert({
            name: currentGroup.name,
            degree_id: currentGroup.degreeId,
            academic_year: currentGroup.academicYear,
            status: currentGroup.status,
          })
          .select()

        if (error) throw error

        if (data && data[0]) {
          // Get degree name
          const degree = degrees.find((d) => d.id === currentGroup.degreeId)

          const newGroup = {
            id: data[0].id.toString(),
            name: data[0].name,
            degree: degree?.name || "Unknown",
            degreeId: data[0].degree_id,
            academicYear: data[0].academic_year,
            students: 0,
            status: data[0].status,
          }

          const updatedGroups = [...groups, newGroup]
          setGroups(updatedGroups)

          // Update cache
          setCachedData("groups", "all", updatedGroups)

          toast({
            title: t("admin.groups.success"),
            description: t("admin.groups.groupCreated"),
          })
        }
      }

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

  // Handle opening delete confirmation dialog
  const handleDelete = (id: string) => {
    setGroupToDelete(id)
    openDeleteDialog()
  }

  // Handle closing delete confirmation dialog
  const handleCloseDeleteDialog = () => {
    closeDeleteDialog()

    // Ensure cleanup after dialog closes
    setTimeout(() => {
      if (isMounted.current) {
        setGroupToDelete(null)
        cleanupDialogEffects()
      }
    }, 300) // Wait for animation to complete
  }

  // Confirm delete action
  const confirmDelete = async () => {
    if (!groupToDelete) return

    try {
      const { error } = await supabase.from("groups").delete().eq("id", groupToDelete)

      if (error) throw error

      const updatedGroups = groups.filter((group) => group.id !== groupToDelete)
      setGroups(updatedGroups)
      setFilteredGroups(filteredGroups.filter((group) => group.id !== groupToDelete))

      // Update cache
      setCachedData("groups", "all", updatedGroups)

      toast({
        title: t("admin.groups.success"),
        description: t("admin.groups.groupDeleted"),
      })

      // Close dialog and clean up
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

      const updatedGroups = groups.map((group) => {
        if (group.id === id) {
          return {
            ...group,
            status: newStatus,
          }
        }
        return group
      })

      setGroups(updatedGroups)

      // Update cache
      setCachedData("groups", "all", updatedGroups)

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

  // Helper function to get degree badge
  const getDegreeBadge = (degree: string) => {
    // Map the English degree names to translation keys
    const degreeKey = degree === "Bachelor's" ? "degree.bachelor" : degree === "Master's" ? "degree.master" : ""

    // Get the translated degree name
    const translatedDegree = degreeKey ? t(degreeKey) : degree

    switch (degree) {
      case "Bachelor's":
        return (
          <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100 border-purple-200">
            {translatedDegree}
          </Badge>
        )
      case "Master's":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200">{translatedDegree}</Badge>
      default:
        return <Badge>{translatedDegree}</Badge>
    }
  }

  // Helper function to get status badge
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

  // Get the group name for the delete confirmation dialog
  const getGroupToDeleteName = () => {
    if (!groupToDelete) return ""
    const group = groups.find((g) => g.id === groupToDelete)
    return group ? group.name : ""
  }

  // Get the student count for the delete confirmation dialog
  const getGroupToDeleteStudentCount = () => {
    if (!groupToDelete) return 0
    const group = groups.find((g) => g.id === groupToDelete)
    return group ? group.students : 0
  }

  return (
    <>
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
                    <Select value={yearFilter || "all"} onValueChange={setYearFilter}>
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

                    <Select value={degreeFilter || "all"} onValueChange={setDegreeFilter}>
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
                    {isLoading ? (
                      // Skeleton loader only in the table rows
                      Array.from({ length: 5 }).map((_, index) => (
                        <TableRow key={`skeleton-${index}`}>
                          <TableCell>
                            <Skeleton className="h-6 w-24" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-6 w-16" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-6 w-16" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-6 w-16" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-6 w-20" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-8 w-8 rounded-full" />
                          </TableCell>
                        </TableRow>
                      ))
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
                          <TableCell>{getDegreeBadge(group.degree)}</TableCell>
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

              {/* Pagination */}
              {filteredGroups.length > itemsPerPage && (
                <div className="flex items-center justify-end space-x-2 py-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    aria-label={t("pagination.previous")}
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
                    aria-label={t("pagination.next")}
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

      {/* Use forceMount to ensure proper cleanup */}
      {isDialogOpen && (
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            if (!open) handleCloseDialog()
          }}
        >
          <DialogContent
            className="sm:max-w-[500px]"
            onEscapeKeyDown={(e) => {
              // Prevent escape key from propagating
              e.stopPropagation()
              handleCloseDialog()
            }}
            onPointerDownOutside={(e) => {
              // Prevent clicks outside from propagating
              e.preventDefault()
              handleCloseDialog()
            }}
            onInteractOutside={(e) => {
              // Prevent any interaction outside from propagating
              e.preventDefault()
            }}
          >
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
                  {isLoadingDegrees ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <select
                      id="degreeId"
                      name="degreeId"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                      value={currentGroup.degreeId}
                      onChange={handleInputChange}
                      required
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
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="academicYear">{t("admin.groups.year")}</Label>
                  {isLoadingYears ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <select
                      id="academicYear"
                      name="academicYear"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                      value={currentGroup.academicYear}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">{t("admin.groups.selectYear")}</option>
                      {years.map((year) => (
                        <option key={year.id} value={year.year}>
                          {year.year}
                        </option>
                      ))}
                    </select>
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
      )}

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
    </>
  )
}

// Main page component
export default function GroupsPage() {
  return (
    <DashboardLayout>
      {/* Remove the Suspense boundary that's causing the blinking */}
      <GroupsTableContent />
    </DashboardLayout>
  )
}

// Remove the GroupsPageSkeleton function since we're not using it anymore
