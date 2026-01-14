"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { UserRole } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import {
  ArrowLeft,
  Edit,
  Eye,
  MoreVertical,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  ExternalLink,
  Loader2,
} from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useLanguage } from "@/lib/language-context"
import { useToast } from "@/hooks/use-toast"

// Cache constants
const COURSE_DETAIL_CACHE_KEY = "courseDetailData"
const COURSE_SELECTIONS_CACHE_KEY = "courseSelectionsData"
const CACHE_EXPIRY = 60 * 60 * 1000 // 60 minutes

// Cache helper functions
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
import { Toaster } from "@/components/ui/toaster"
import { getSupabaseBrowserClient } from "@/lib/supabase"

interface ElectiveCourseDetailPageProps {
  params: {
    id: string
  }
}

interface Course {
  id: string
  name: string
  name_ru?: string
  instructor_en: string
  instructor_ru?: string
  degree_id: string
  max_students: number
  degrees?: {
    name: string
    name_ru?: string
  }
}

interface StudentSelection {
  id: string
  student_id: string
  elective_courses_id: string
  selected_course_ids: string[]
  status: string
  statement_url?: string
  created_at: string
  profiles: {
    id: string
    full_name: string
    email: string
  }
}

export default function ElectiveCourseDetailPage() {
  const params = useParams()

  // Initialize with cached data synchronously to prevent flicker
  const [electiveCourse, setElectiveCourse] = useState<any>(() => {
    if (typeof window !== "undefined" && params.id) {
      try {
        const cacheKey = `${COURSE_DETAIL_CACHE_KEY}_${params.id}`
        const cached = getCachedData(cacheKey)
        return cached || null
      } catch (e) {
        return null
      }
    }
    return null
  })

  const [courses, setCourses] = useState<Course[]>(() => {
    if (typeof window !== "undefined" && params.id) {
      try {
        const cacheKey = `${COURSE_DETAIL_CACHE_KEY}_${params.id}`
        const cached = getCachedData(cacheKey)
        return cached?.courses || []
      } catch (e) {
        return []
      }
    }
    return []
  })

  const [studentSelections, setStudentSelections] = useState<StudentSelection[]>(() => {
    if (typeof window !== "undefined" && params.id) {
      try {
        const selectionsCacheKey = `${COURSE_SELECTIONS_CACHE_KEY}_${params.id}`
        const cached = getCachedData(selectionsCacheKey)
        return cached || []
      } catch (e) {
        return []
      }
    }
    return []
  })

  const [loading, setLoading] = useState(() => {
    // If we have cached data, don't show loading initially
    if (typeof window !== "undefined" && params.id) {
      const cacheKey = `${COURSE_DETAIL_CACHE_KEY}_${params.id}`
      const selectionsCacheKey = `${COURSE_SELECTIONS_CACHE_KEY}_${params.id}`
      const cachedData = getCachedData(cacheKey)
      const cachedSelections = getCachedData(selectionsCacheKey)
      return !(cachedData && cachedSelections)
    }
    return true
  })

  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStudent, setSelectedStudent] = useState<StudentSelection | null>(null)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState<StudentSelection | null>(null)
  const [editStatus, setEditStatus] = useState("")
  const [editSelectedCourses, setEditSelectedCourses] = useState<string[]>([])
  const [mounted, setMounted] = useState(false)
  // Initialize activeTab based on URL hash or default to courses
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash.replace("#", "")
      if (hash === "students" || hash === "courses") {
        return hash
      }
    }
    return "courses"
  })

  const { language, t } = useLanguage()

  // Note: Hash handling is done in useState initializer above
  // This ensures the initial tab matches the URL hash from manager dashboard links

  // Update URL hash when tab changes
  useEffect(() => {
    if (typeof window !== "undefined" && mounted) {
      window.history.replaceState(null, "", `#${activeTab}`)
    }
  }, [activeTab, mounted])

  useEffect(() => {
    setMounted(true)
  }, [])

  // Update URL hash when tab changes
  useEffect(() => {
    if (typeof window !== "undefined" && mounted) {
      window.history.replaceState(null, "", `#${activeTab}`)
    }
  }, [activeTab, mounted])

  const { toast } = useToast()
  const supabase = getSupabaseBrowserClient()
  const router = useRouter()

  // Reset state when course ID changes (for navigation between different courses)
  useEffect(() => {
    if (params.id) {
      const courseId = params.id as string
      const cacheKey = `${COURSE_DETAIL_CACHE_KEY}_${courseId}`
      const selectionsCacheKey = `${COURSE_SELECTIONS_CACHE_KEY}_${courseId}`

      // Check if we have cached data for this course
      const cachedData = getCachedData(cacheKey)
      const cachedSelections = getCachedData(selectionsCacheKey)

      // Reset state for new course
      setElectiveCourse(cachedData || null)
      setCourses(cachedData?.courses || [])
      setStudentSelections(cachedSelections || [])
      setError(null)
      setSearchTerm("")
      setSelectedStudent(null)
      setViewDialogOpen(false)
      setEditDialogOpen(false)
      setEditingStudent(null)
      setEditStatus("")
      setEditSelectedCourses([])

      // Only show loading if we don't have cached data
      if (!cachedData || !cachedSelections) {
        setLoading(true)
        loadData()
      } else {
        setLoading(false)
      }
    }
  }, [params.id])

  // Set up real-time subscriptions for instant updates
  useEffect(() => {
    const channel = supabase
      .channel(`course-selections-${params.id as string}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "course_selections",
          filter: `elective_courses_id=eq.${params.id as string}`,
        },
        async () => {
          // Refetch student selections when they change
          const courseId = params.id as string
          const { data: selections, error: selectionsError } = await supabase
            .from("course_selections")
            .select(`
              *,
              profiles!student_id(
                id,
                full_name,
                email
              )
            `)
            .eq("elective_courses_id", courseId)

          if (!selectionsError && selections) {
            setStudentSelections(selections)
            // Update cache with new selections
            const selectionsCacheKey = `${COURSE_SELECTIONS_CACHE_KEY}_${courseId}`
            setCachedData(selectionsCacheKey, selections)
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, params.id])

  const loadData = async () => {
    try {
      setError(null)

      const courseId = params.id as string
      const cacheKey = `${COURSE_DETAIL_CACHE_KEY}_${courseId}`
      const selectionsCacheKey = `${COURSE_SELECTIONS_CACHE_KEY}_${courseId}`

      // Load course program data from API
      const response = await fetch(`/api/manager/electives/course/${courseId}`)
      if (!response.ok) {
        const errorData = await response.json()
        // Redirect to login on authentication errors
        if (errorData.error === "Authentication failed") {
          router.push("/manager/login")
          return
        }
        throw new Error(errorData.error || "Failed to load course program")
      }

      const data = await response.json()

      // Cache the data
      setCachedData(cacheKey, data)
      setCachedData(selectionsCacheKey, data.studentSelections || [])

      setElectiveCourse(data)
      setCourses(data.courses || [])
      setStudentSelections(data.studentSelections || [])
    } catch (error) {
      console.error("Error loading data:", error)
      setError(t("manager.courseBuilder.errorFetchingData"))
      toast({
        title: t("manager.courseBuilder.error"),
        description: t("manager.courseBuilder.errorFetchingData"),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString(language === "ru" ? "ru-RU" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-200" suppressHydrationWarning>
            {mounted ? t("manager.status.draft") : "Draft"}
          </Badge>
        )
      case "published":
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200" suppressHydrationWarning>
            {mounted ? t("manager.status.published") : "Published"}
          </Badge>
        )
      case "closed":
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-800 hover:bg-gray-100 border-gray-200" suppressHydrationWarning>
            {mounted ? t("manager.status.closed") : "Closed"}
          </Badge>
        )
      case "archived":
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200" suppressHydrationWarning>
            {mounted ? t("manager.status.archived") : "Archived"}
          </Badge>
        )
      default:
        return <Badge variant="outline" suppressHydrationWarning>{status}</Badge>
    }
  }

  const getSelectionStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-200" suppressHydrationWarning>
            <CheckCircle className="mr-1 h-3 w-3" />
            {mounted ? t("manager.status.approved") : "Approved"}
          </Badge>
        )
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-200" suppressHydrationWarning>
            <Clock className="mr-1 h-3 w-3" />
            {mounted ? t("manager.status.pending") : "Pending"}
          </Badge>
        )
      case "rejected":
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900 dark:text-red-200" suppressHydrationWarning>
            <XCircle className="mr-1 h-3 w-3" />
            {mounted ? t("manager.status.rejected", "Rejected") : "Rejected"}
          </Badge>
        )
      default:
        return <Badge variant="outline" suppressHydrationWarning>{status}</Badge>
    }
  }

  const getCourseEnrollment = (courseId: string) => {
    return studentSelections.filter(
      (selection) =>
        selection.selected_course_ids &&
        selection.selected_course_ids.includes(courseId) &&
        (selection.status === "approved" || selection.status === "pending"),
    ).length
  }

  const getTotalStudentsEnrolled = () => {
    return studentSelections.filter((selection) => selection.status === "approved" || selection.status === "pending")
      .length
  }

  const handleStatusChange = async (selectionId: string, newStatus: "approved" | "rejected", studentName: string) => {
    try {
      const { error } = await supabase.from("course_selections").update({ status: newStatus }).eq("id", selectionId)

      if (error) throw error

      setStudentSelections((prev) =>
        prev.map((selection) => (selection.id === selectionId ? { ...selection, status: newStatus } : selection)),
      )

      toast({
        title: `Selection ${newStatus}`,
        description: `Selection ${newStatus} for ${studentName}`,
      })
    } catch (error) {
      toast({
        title: t("manager.courseBuilder.error"),
        description: t("manager.courseDetails.errorUpdatingSelection", `Failed to ${newStatus} selection`),
        variant: "destructive",
      })
    }
  }

  const exportCourseToCSV = async (course: Course) => {
    try {
      const enrolledStudents = studentSelections.filter(
        (selection) =>
          selection.selected_course_ids &&
          selection.selected_course_ids.includes(course.id) &&
          (selection.status === "approved" || selection.status === "pending"),
      )

      if (enrolledStudents.length === 0) {
        toast({
          title: t("manager.courseDetails.noData", "No Data"),
          description: t("manager.courseDetails.noStudentsEnrolled", "No students are enrolled in this course."),
        })
        return
      }

      // Define column headers based on language
      const headers = {
        en: ["Student Name", "Email", "Status", "Selection Date"],
        ru: ["Имя студента", "Электронная почта", "Статус", "Дата выбора"],
      }

      // Create CSV content
      let csvContent = headers[language as keyof typeof headers].map((header) => `"${header}"`).join(",") + "\n"

      // Add data rows
      enrolledStudents.forEach((selection) => {
        const translatedStatus =
          language === "ru"
            ? selection.status === "approved"
              ? "Утверждено"
              : selection.status === "pending"
                ? "На рассмотрении"
                : "Отклонено"
            : selection.status

        const row = [
          `"${selection.profiles?.full_name || "N/A"}"`,
          `"${selection.profiles?.email || "N/A"}"`,
          `"${translatedStatus}"`,
          `"${formatDate(selection.created_at)}"`,
        ]

        csvContent += row.join(",") + "\n"
      })

      // Create and download the file
      const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), csvContent], { type: "text/csv;charset=utf-8" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      const fileName = `course_${course.name_en.replace(/\s+/g, "_")}_enrollments_${language}.csv`

      link.setAttribute("href", url)
      link.setAttribute("download", fileName)
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: t("manager.courseBuilder.success", "Success"),
        description: t("manager.courseDetails.exportSuccess", "Course enrollment data exported successfully"),
      })
    } catch (error) {
      console.error("Error exporting course data:", error)
      toast({
        title: t("manager.courseBuilder.error"),
        description: t("manager.courseDetails.exportError", "Failed to export course data"),
        variant: "destructive",
      })
    }
  }

  const exportStudentSelectionsToCSV = () => {
    if (studentSelections.length === 0) {
      toast({
        title: t("manager.courseDetails.noData", "No Data"),
        description: t("manager.courseDetails.noSelectionsToExport", "No student selections to export."),
      })
      return
    }

    // Create CSV header with translated column names
    const csvHeader = `"${language === "ru" ? "Имя студента" : "Student Name"}","${language === "ru" ? "Электронная почта" : "Email"}","${language === "ru" ? "Выбранные курсы" : "Selected Courses"}","${language === "ru" ? "Дата выбора" : "Selection Date"}","${language === "ru" ? "Статус" : "Status"}","${language === "ru" ? "Заявление URL" : "Statement URL"}"\n`

    // Create CSV content with translated status
    const selectionsContent = studentSelections
      .map((selection) => {
        // Get course names for selected courses
        const selectedCourseNames =
          selection.selected_course_ids
            ?.map((id) => {
              const course = courses.find((c) => c.id === id)
              return course ? (language === "ru" && course.name_ru ? course.name_ru : course.name) : "Unknown"
            })
            .join("; ") || ""

        // Translate status based on current language
        const translatedStatus =
          language === "ru"
            ? selection.status === "approved"
              ? "Утверждено"
              : selection.status === "pending"
                ? "На рассмотрении"
                : "Отклонено"
            : selection.status

        // Statement URL
        const statementUrl = selection.statement_url || ""

        // Escape fields that might contain commas
        return `"${selection.profiles?.full_name || "N/A"}","${selection.profiles?.email || "N/A"}","${selectedCourseNames}","${formatDate(selection.created_at)}","${translatedStatus}","${statementUrl}"`
      })
      .join("\n")

    // Combine header and content
    const csv = csvHeader + selectionsContent

    // Create and download the file
    const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    const fileName = `student_selections_${electiveCourse?.name.replace(/\s+/g, "_")}_${language}.csv`

    link.setAttribute("href", url)
    link.setAttribute("download", fileName)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const downloadStudentStatement = async (studentName: string, statementUrl: string | null) => {
    if (!statementUrl) {
      toast({
        title: t("manager.courseDetails.statementNotAvailable", "Statement not available"),
        description: t("manager.courseDetails.noStatementFile", `No statement file available for ${studentName}`),
      })
      return
    }

    try {
      // Fetch the file and trigger download
      const response = await fetch(statementUrl)
      const blob = await response.blob()

      // Create download link
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${studentName.replace(/\s+/g, "_")}_statement.pdf`
      link.style.display = "none"

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // Clean up
      URL.revokeObjectURL(url)

      toast({
        title: t("manager.courseDetails.statementDownloaded", "Statement downloaded"),
        description: t("manager.courseDetails.statementDownloadedFor", `Statement file downloaded for ${studentName}`),
      })
    } catch (error) {
      console.error("Error downloading statement:", error)
      toast({
        title: t("manager.courseDetails.downloadFailed", "Download failed"),
        description: t("manager.courseDetails.downloadFailedDesc", "Failed to download statement file"),
        variant: "destructive",
      })
    }
  }

  const handleEditSave = async () => {
    if (!editingStudent) return

    setIsSaving(true)
    try {
      const { error } = await supabase
        .from("course_selections")
        .update({
          selected_course_ids: editSelectedCourses,
          status: editStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingStudent.id)

      if (error) {
        console.error("Supabase error:", error)
        throw error
      }

      // Update local state
      setStudentSelections((prev) =>
        prev.map((selection) =>
          selection.id === editingStudent.id
            ? { ...selection, selected_course_ids: editSelectedCourses, status: editStatus }
            : selection,
        ),
      )

      // Close dialog and reset state
      setEditDialogOpen(false)
      setEditingStudent(null)
      setEditStatus("")
      setEditSelectedCourses([])

      toast({
        title: t("manager.courseDetails.selectionUpdated", "Selection updated"),
        description: t("manager.courseDetails.selectionUpdatedDesc", "Student selection updated successfully"),
      })
    } catch (error) {
      console.error("Error updating selection:", error)
      toast({
        title: t("manager.courseBuilder.error"),
        description: t("manager.courseDetails.errorUpdatingSelection", "Failed to update selection"),
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleCourseToggle = (courseId: string, checked: boolean) => {
    if (checked) {
      setEditSelectedCourses((prev) => [...prev, courseId])
    } else {
      setEditSelectedCourses((prev) => prev.filter((id) => id !== courseId))
    }
  }

  const filteredStudentSelections = studentSelections.filter((selection) => {
    const searchLower = searchTerm.toLowerCase()
    return (
      selection.profiles?.full_name?.toLowerCase().includes(searchLower) ||
      selection.profiles?.email?.toLowerCase().includes(searchLower) ||
      selection.student_id?.toLowerCase().includes(searchLower)
    )
  })


  if (error) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600">{t("manager.courseDetails.errorLoading", "Error Loading Data")}</h1>
            <p className="text-muted-foreground mt-2">{error}</p>
            <Button onClick={loadData} className="mt-4">
              {t("manager.courseDetails.tryAgain", "Try Again")}
            </Button>
          </div>
        </div>
      </DashboardLayout>
    )
  }


  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-2">
            <Link href="/manager/electives/course">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {electiveCourse ? (language === "ru" && electiveCourse.name_ru ? electiveCourse.name_ru : electiveCourse.name) : "Loading..."}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {electiveCourse && getStatusBadge(electiveCourse.status)}
            <Button variant="outline" size="sm" asChild>
              <Link href={`/manager/electives/course/${params.id as string}/edit`}>
                <Edit className="mr-2 h-4 w-4" />
                <span suppressHydrationWarning>
                  {mounted ? t("manager.courseDetails.edit", "Edit") : "Edit"}
                </span>
              </Link>
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("manager.courseDetails.programDetails", "Program Details")}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="font-medium">{t("manager.courseDetails.deadline", "Deadline")}:</dt>
                <dd>{electiveCourse?.deadline ? formatDate(electiveCourse.deadline) : t("manager.courseDetails.noDeadline", "No deadline set")}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium">{t("manager.courseDetails.maxSelections", "Max Selections")}:</dt>
                <dd>{electiveCourse?.max_selections || 0} {t("manager.courseDetails.courses", "courses")}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium">{t("manager.courseDetails.courses", "Courses")}:</dt>
                <dd>{courses.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium">{t("manager.courseDetails.studentsEnrolled", "Students Enrolled")}:</dt>
                <dd>{getTotalStudentsEnrolled()}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium">{t("manager.courseDetails.created", "Created")}:</dt>
                <dd>{electiveCourse?.created_at ? formatDate(electiveCourse.created_at) : t("common.loading", "Loading...")}</dd>
              </div>
              {electiveCourse?.description && (
                <div className="flex flex-col gap-1">
                  <dt className="font-medium">{t("manager.courseDetails.description", "Description")}:</dt>
                  <dd className="text-sm text-muted-foreground">
                    {language === "ru" && electiveCourse.description_ru
                      ? electiveCourse.description_ru
                      : electiveCourse.description}
                  </dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="courses">{t("manager.courseDetails.coursesTab", "Courses")}</TabsTrigger>
            <TabsTrigger value="students">{t("manager.courseDetails.studentsTab", "Student Selections")}</TabsTrigger>
          </TabsList>

          <TabsContent value="courses" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>{t("manager.courseDetails.coursesInProgram", "Courses")}</CardTitle>
              </CardHeader>
              <CardContent>
                {courses.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {t("manager.courseDetails.noCourses", "No courses in this program")}
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="py-3 px-4 text-left text-sm font-medium">{t("manager.courseDetails.name", "Name")}</th>
                          <th className="py-3 px-4 text-left text-sm font-medium">{t("manager.courseDetails.professor", "Professor")}</th>
                          <th className="py-3 px-4 text-left text-sm font-medium">{t("manager.courseDetails.degree", "Degree")}</th>
                          <th className="py-3 px-4 text-left text-sm font-medium">{t("manager.courseDetails.enrollment", "Enrollment")}</th>
                          <th className="py-3 px-4 text-center text-sm font-medium">{t("manager.courseDetails.export", "Export")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {courses.map((course) => {
                          const currentEnrollment = getCourseEnrollment(course.id)

                          return (
                            <tr key={course.id} className="border-b">
                              <td className="py-3 px-4 text-sm">
                                {language === "ru" && course.name_ru ? course.name_ru : course.name}
                              </td>
                              <td className="py-3 px-4 text-sm">
                                {language === "ru" && course.instructor_ru
                                  ? course.instructor_ru
                                  : course.instructor_en || t("manager.courseDetails.notAssigned", "Not assigned")}
                              </td>
                              <td className="py-3 px-4 text-sm">
                                {course.degrees
                                  ? language === "ru" && course.degrees.name_ru
                                    ? course.degrees.name_ru
                                    : course.degrees.name
                                  : t("manager.courseDetails.notSpecified", "Not specified")}
                              </td>
                              <td className="py-3 px-4 text-sm">
                                <Badge variant={currentEnrollment >= course.max_students ? "destructive" : "secondary"}>
                                  {currentEnrollment}/{course.max_students}
                                </Badge>
                              </td>
                              <td className="py-3 px-4 text-sm text-center">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => exportCourseToCSV(course)}
                                  className="flex mx-auto"
                                >
                                  <Download className="h-4 w-4 mr-1" />
                                  {t("manager.courseDetails.download", "Download")}
                                </Button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="students" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{t("manager.courseDetails.studentSelections", "Student Selections")}</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input
                      type="search"
                      placeholder={t("manager.courseDetails.searchStudents", "Search students...")}
                      className="h-10 w-full rounded-md border border-input bg-background pl-8 pr-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:w-[200px]"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Button variant="outline" size="sm" onClick={exportStudentSelectionsToCSV}>
                    <Download className="mr-2 h-4 w-4" />
                    {t("manager.courseDetails.exportAll", "Export All")}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="py-3 px-4 text-left text-sm font-medium">{t("manager.courseDetails.name", "Name")}</th>
                        <th className="py-3 px-4 text-left text-sm font-medium">{t("manager.courseDetails.email", "Email")}</th>
                        <th className="py-3 px-4 text-left text-sm font-medium">{t("manager.courseDetails.selectionDate", "Selection Date")}</th>
                        <th className="py-3 px-4 text-left text-sm font-medium">{t("manager.courseDetails.status", "Status")}</th>
                        <th className="py-3 px-4 text-center text-sm font-medium">{t("manager.courseDetails.statement", "Statement")}</th>
                        <th className="py-3 px-4 text-center text-sm font-medium">{t("manager.courseDetails.view", "View")}</th>
                        <th className="py-3 px-4 text-center text-sm font-medium">{t("manager.courseDetails.actions", "Actions")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudentSelections.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-muted-foreground">
                            {searchTerm ? t("manager.courseDetails.noStudentsFound", "No students found matching your search") : t("manager.courseDetails.noSelections", "No student selections yet")}
                          </td>
                        </tr>
                      ) : (
                        filteredStudentSelections.map((selection) => {
                          return (
                            <tr key={selection.id} className="border-b">
                              <td className="py-3 px-4 text-sm">{selection.profiles?.full_name || "N/A"}</td>
                              <td className="py-3 px-4 text-sm">{selection.profiles?.email || "N/A"}</td>
                              <td className="py-3 px-4 text-sm">{formatDate(selection.created_at)}</td>
                              <td className="py-3 px-4 text-sm">{getSelectionStatusBadge(selection.status)}</td>
                              <td className="py-3 px-4 text-sm text-center">
                                {selection.statement_url ? (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                      downloadStudentStatement(
                                        selection.profiles?.full_name || "Student",
                                        selection.statement_url,
                                      )
                                    }
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-sm text-center">
                                <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      setSelectedStudent(selection)
                                      setViewDialogOpen(true)
                                    }}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </Dialog>
                              </td>
                              <td className="py-3 px-4 text-sm text-center">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setEditingStudent(selection)
                                        setEditStatus(selection.status)
                                        setEditSelectedCourses(selection.selected_course_ids || [])
                                        setEditDialogOpen(true)
                                      }}
                                    >
                                      <Edit className="mr-2 h-4 w-4" />
                                      {t("manager.courseDetails.edit", "Edit")}
                                    </DropdownMenuItem>
                                    {selection.status === "pending" && (
                                      <>
                                        <DropdownMenuItem
                                          className="text-green-600"
                                          onClick={() =>
                                            handleStatusChange(
                                              selection.id,
                                              "approved",
                                              selection.profiles?.full_name || "Student",
                                            )
                                          }
                                        >
                                          <CheckCircle className="mr-2 h-4 w-4" />
                                          Approve
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          className="text-red-600"
                                          onClick={() =>
                                            handleStatusChange(
                                              selection.id,
                                              "rejected",
                                              selection.profiles?.full_name || "Student",
                                            )
                                          }
                                        >
                                          <XCircle className="mr-2 h-4 w-4" />
                                          Reject
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                    {selection.status === "approved" && (
                                      <DropdownMenuItem
                                        className="text-red-600"
                                        onClick={() =>
                                          handleStatusChange(
                                            selection.id,
                                            "rejected",
                                            selection.profiles?.full_name || "Student",
                                          )
                                        }
                                      >
                                        <XCircle className="mr-2 h-4 w-4" />
                                        Withdraw
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* View Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t("manager.courseDetails.studentDetails", "Student Selection Details")}</DialogTitle>
            </DialogHeader>
            {selectedStudent && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">{t("manager.courseDetails.studentName", "Student Name")}</Label>
                    <p className="text-sm">{selectedStudent.profiles?.full_name || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">{t("manager.courseDetails.email", "Email")}</Label>
                    <p className="text-sm">{selectedStudent.profiles?.email || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">{t("manager.courseDetails.selectionDate", "Selection Date")}</Label>
                    <p className="text-sm">{formatDate(selectedStudent.created_at)}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">{t("manager.courseDetails.status", "Status")}</Label>
                    <div className="mt-1">{getSelectionStatusBadge(selectedStudent.status)}</div>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">{t("manager.courseDetails.selectedCourses", "Selected Courses")}</Label>
                  <div className="mt-2 space-y-2">
                    {(selectedStudent.selected_course_ids || []).map((courseId) => {
                      const course = courses.find((c) => c.id === courseId)
                      return (
                        <div key={courseId} className="flex items-center justify-between p-2 border rounded">
                          <span className="text-sm">
                            {course
                              ? language === "ru" && course.name_ru
                                ? course.name_ru
                                : course.name_en
                              : "Unknown Course"}
                          </span>
                          {course && (
                            <span className="text-xs text-muted-foreground">
                              {language === "ru" && course.instructor_ru ? course.instructor_ru : course.instructor_en}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
                {selectedStudent.statement_url && (
                  <div>
                    <Label className="text-sm font-medium">{t("manager.courseDetails.statement", "Statement")}</Label>
                    <div className="mt-2 flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          downloadStudentStatement(
                            selectedStudent.profiles?.full_name || "Student",
                            selectedStudent.statement_url,
                          )
                        }
                      >
                        <Download className="h-4 w-4 mr-2" />
                        {t("manager.courseDetails.download", "Download")}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(selectedStudent.statement_url!, "_blank")}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        {t("manager.courseDetails.viewOnline", "View Online")}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t("manager.courseDetails.editStudentSelection", "Edit Student Selection")}</DialogTitle>
            </DialogHeader>
            {editingStudent && (
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">{t("manager.courseDetails.student", "Student")}</Label>
                  <p className="text-sm">{editingStudent.profiles?.full_name || "N/A"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">{t("manager.courseDetails.editCourses", "Selected Courses")}</Label>
                  <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
                    {courses.map((course) => (
                      <div key={course.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={course.id}
                          checked={editSelectedCourses.includes(course.id)}
                          onCheckedChange={(checked) => handleCourseToggle(course.id, checked as boolean)}
                        />
                        <Label htmlFor={course.id} className="text-sm">
                          {language === "ru" && course.name_ru ? course.name_ru : course.name_en} -{" "}
                          {language === "ru" && course.instructor_ru ? course.instructor_ru : course.instructor_en}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <Label htmlFor="status">{t("manager.courseDetails.status", "Status")}</Label>
                  <Select value={editStatus} onValueChange={setEditStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("manager.courseDetails.selectStatus", "Select status")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">{t("manager.courseDetails.pending", "Pending")}</SelectItem>
                      <SelectItem value="approved">{t("manager.courseDetails.approved", "Approved")}</SelectItem>
                      <SelectItem value="rejected">{t("manager.courseDetails.rejected", "Rejected")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                    {t("manager.courseDetails.cancel", "Cancel")}
                  </Button>
                  <Button onClick={handleEditSave} disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t("manager.courseDetails.saving", "Saving...")}
                      </>
                    ) : (
                      t("manager.courseDetails.saveChanges", "Save Changes")
                    )}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <Toaster />
    </DashboardLayout>
  )
}
