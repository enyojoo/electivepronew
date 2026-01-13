"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { UserRole, ElectivePackStatus, SelectionStatus } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
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
  FileDown,
  Loader2,
} from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import { useLanguage } from "@/lib/language-context"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { getSupabaseBrowserClient } from "@/lib/supabase"

interface ElectiveCourseDetailPageProps {
  params: {
    id: string
  }
}

export default function AdminElectiveCourseDetailPage({ params }: ElectiveCourseDetailPageProps) {
  // Add the language hook near the top of the component
  const { t, language } = useLanguage()
  const { toast } = useToast()
  const supabase = getSupabaseBrowserClient()

  // State for dialogs
  const [selectedStudent, setSelectedStudent] = useState<any>(null)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editedCourses, setEditedCourses] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)

  // Real data state
  const [electiveCourse, setElectiveCourse] = useState<any>(null)
  const [courses, setCourses] = useState<any[]>([])
  const [studentSelections, setStudentSelections] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

  // Load data from Supabase
  useEffect(() => {
    loadData()
  }, [params.id])

  // Set up real-time subscriptions for instant updates
  useEffect(() => {
    const channel = supabase
      .channel(`course-selections-${params.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "course_selections",
          filter: `elective_courses_id=eq.${params.id}`,
        },
        async () => {
          // Refetch student selections when they change
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
            .eq("elective_courses_id", params.id)

          if (!selectionsError && selections) {
            setStudentSelections(selections)
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
      setLoading(true)
      setError(null)

      // Load course program
      const { data: program, error: programError } = await supabase
        .from("elective_courses")
        .select("*")
        .eq("id", params.id)
        .single()

      if (programError) {
        throw new Error("Failed to load course program")
      }

      if (!program) {
        throw new Error("Course program not found")
      }

      setElectiveCourse(program)

      // Load courses using the UUIDs from the courses column
      if (program?.courses && Array.isArray(program.courses) && program.courses.length > 0) {
        const { data: coursesData, error: coursesError } = await supabase
          .from("courses")
          .select(`
            id,
            name,
            name_ru,
            instructor_en,
            instructor_ru,
            degree_id,
            max_students,
            degrees(
              name,
              name_ru
            )
          `)
          .in("id", program.courses)

        if (coursesError) {
          console.error("Error loading courses:", coursesError)
        } else if (coursesData) {
          setCourses(coursesData)
        }
      }

      // Load student selections with profile and student profile information
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
        .eq("elective_courses_id", params.id)

      if (selectionsError) {
        console.error("Error loading student selections:", selectionsError)
      } else if (selections) {
        // Fetch student profiles with groups and degrees for each selection
        const selectionsWithDetails = await Promise.all(
          selections.map(async (selection) => {
            const { data: studentProfile } = await supabase
              .from("student_profiles")
              .select(`
                group_id,
                groups(
                  id,
                  name,
                  degrees(id, name, name_ru)
                )
              `)
              .eq("profile_id", selection.student_id)
              .maybeSingle()

            const group = studentProfile?.groups
              ? Array.isArray(studentProfile.groups)
                ? studentProfile.groups[0]
                : studentProfile.groups
              : null
            const degree = group?.degrees
              ? Array.isArray(group.degrees)
                ? group.degrees[0]
                : group.degrees
              : null

            return {
              ...selection,
              group: group?.name || "Not assigned",
              program: language === "ru" && degree?.name_ru ? degree.name_ru : degree?.name || "Not specified",
            }
          }),
        )

        setStudentSelections(selectionsWithDetails)
      }
    } catch (error) {
      console.error("Error loading data:", error)
      setError(error instanceof Error ? error.message : "Failed to load course program data")
      toast({
        title: "Error",
        description: "Failed to load course program data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Transform student selections data to include profile info and course names
  const transformedSelections = studentSelections.map((selection) => {
    // Get course names from selected_course_ids
    const selectedCourseNames = selection.selected_course_ids
      ? courses
          .filter((c) => selection.selected_course_ids.includes(c.id))
          .map((c) => (language === "ru" && c.name_ru ? c.name_ru : c.name))
      : []

    // Get student profile info
    const profile = selection.profiles || {}
    
    return {
      id: selection.id,
      studentName: profile.full_name || "Unknown",
      studentId: selection.student_id,
      email: profile.email || "",
      selectedCourses: selectedCourseNames,
      selected_course_ids: selection.selected_course_ids || [],
      selectionDate: selection.created_at,
      status: selection.status,
      statementFile: selection.statement_url,
      student_id: selection.student_id,
      group: selection.group || "Not assigned",
      program: selection.program || "Not specified",
    }
  })

  // Format date helper
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString(language === "ru" ? "ru-RU" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  // Helper function to get status badge
  const getStatusBadge = (status: ElectivePackStatus) => {
    switch (status) {
      case ElectivePackStatus.DRAFT:
        return <Badge variant="outline">{t("manager.status.draft")}</Badge>
      case ElectivePackStatus.PUBLISHED:
        return <Badge variant="secondary">{t("manager.status.published")}</Badge>
      case ElectivePackStatus.CLOSED:
        return <Badge variant="destructive">{t("manager.status.closed")}</Badge>
      case ElectivePackStatus.ARCHIVED:
        return <Badge variant="default">{t("manager.status.archived")}</Badge>
      default:
        return null
    }
  }

  // Helper function to get selection status badge
  const getSelectionStatusBadge = (status: SelectionStatus) => {
    switch (status) {
      case SelectionStatus.APPROVED:
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-200">
            <CheckCircle className="mr-1 h-3 w-3" />
            {t("manager.exchangeDetails.approved")}
          </Badge>
        )
      case SelectionStatus.PENDING:
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-200">
            <Clock className="mr-1 h-3 w-3" />
            {t("manager.exchangeDetails.pending")}
          </Badge>
        )
      case SelectionStatus.REJECTED:
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900 dark:text-red-200">
            <XCircle className="mr-1 h-3 w-3" />
            {t("manager.exchangeDetails.rejected")}
          </Badge>
        )
      default:
        return null
    }
  }

  // Function to open view dialog with student details
  const openViewDialog = (student: any) => {
    setSelectedStudent(student)
    setViewDialogOpen(true)
  }

  // Helper functions
  const getCourseEnrollment = (courseId: string) => {
    return studentSelections.filter(
      (selection) =>
        selection.selected_course_ids &&
        Array.isArray(selection.selected_course_ids) &&
        selection.selected_course_ids.includes(courseId) &&
        (selection.status === "approved" || selection.status === "pending"),
    ).length
  }

  const handleStatusChange = async (selectionId: string, newStatus: "approved" | "rejected", studentName: string) => {
    try {
      const { error } = await supabase.from("course_selections").update({ status: newStatus }).eq("id", selectionId)

      if (error) throw error

      // Refetch selections
      await loadData()

      toast({
        title: `Selection ${newStatus}`,
        description: `The selection for ${studentName} has been ${newStatus}.`,
      })
    } catch (error: any) {
      console.error("Error updating selection status:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to update selection status",
        variant: "destructive",
      })
    }
  }

  // Function to open edit dialog with student details
  const openEditDialog = (student: any) => {
    setSelectedStudent(student)
    // Convert course names to course IDs for editing
    const courseIds = student.selected_course_ids || []
    setEditedCourses([...courseIds])
    setEditDialogOpen(true)
  }

  // Function to handle course selection in edit dialog
  const handleCourseSelection = (courseId: string, checked: boolean) => {
    if (checked) {
      // Add course if it's not already selected and we haven't reached the max
      if (!editedCourses.includes(courseId) && editedCourses.length < (electiveCourse?.max_selections || 0)) {
        setEditedCourses([...editedCourses, courseId])
      }
    } else {
      // Remove course if it's selected
      setEditedCourses(editedCourses.filter((id) => id !== courseId))
    }
  }

  // Function to save edited courses
  const saveEditedCourses = async () => {
    if (!selectedStudent) return

    setIsSaving(true)
    try {
      // editedCourses now contains course IDs directly
      const selectedCourseIds = editedCourses

      // Update the selection
      const { error } = await supabase
        .from("course_selections")
        .update({ selected_course_ids: selectedCourseIds })
        .eq("id", selectedStudent.id)

      if (error) throw error

      // Refetch data
      await loadData()

      setEditDialogOpen(false)

      toast({
        title: t("toast.selection.updated"),
        description: t("toast.selection.updated.course.description").replace("{0}", selectedStudent.studentName),
      })
    } catch (error: any) {
      console.error("Error saving courses:", error)
      toast({
        title: t("toast.error", "Error"),
        description: error.message || t("toast.errorDesc", "Failed to save changes"),
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Function to export course enrollments to CSV
  const exportCourseEnrollmentsToCSV = (courseName: string) => {
    // Find students who selected this course
    const studentsInCourse = transformedSelections.filter((student) => student.selectedCourses.includes(courseName))

    // Create CSV header with translated column names
    const csvHeader = `"${language === "ru" ? "Имя студента" : "Student Name"}","${language === "ru" ? "ID студента" : "Student ID"}","${language === "ru" ? "Группа" : "Group"}","${language === "ru" ? "Программа" : "Program"}","${language === "ru" ? "Электронная почта" : "Email"}","${language === "ru" ? "Дата выбора" : "Selection Date"}","${language === "ru" ? "Статус" : "Status"}"\n`

    // Create CSV content with translated status
    const courseContent = studentsInCourse
      .map((student) => {
        // Translate status based on current language
        const translatedStatus =
          language === "ru"
            ? student.status === "approved"
              ? "Утверждено"
              : student.status === "pending"
                ? "На рассмотрении"
                : "Отклонено"
            : student.status === "approved"
              ? "Approved"
              : student.status === "pending"
                ? "Pending"
                : "Rejected"

        // Format date properly
        const formattedDate = formatDate(student.selectionDate)

        return `"${student.studentName}","${student.studentId}","${student.group}","${student.program}","${student.email}","${formattedDate}","${translatedStatus}"`
      })
      .join("\n")

    // Combine header and content
    const csv = csvHeader + courseContent

    // Create a blob and download
    const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute(
      "download",
      `${courseName.replace(/\s+/g, "_")}_${language === "ru" ? "зачисления" : "enrollments"}.csv`,
    )
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Function to download student statement
  const downloadStudentStatement = async (studentName: string, statementUrl: string | null) => {
    if (!statementUrl) {
      toast({
        title: t("toast.statement.notAvailable", "Statement not available"),
        description: t("toast.statement.notAvailableDesc", "No statement file uploaded for this student"),
        variant: "destructive",
      })
      return
    }

    try {
      // Extract file path from URL
      let filePath = statementUrl
      if (statementUrl.includes("/storage/v1/object/public/statements/")) {
        filePath = statementUrl.split("/storage/v1/object/public/statements/")[1]
      } else if (statementUrl.includes("/statements/")) {
        filePath = statementUrl.split("/statements/")[1]
      }

      const { data, error } = await supabase.storage.from("statements").download(filePath)

      if (error) throw error

      // Create download link
      const url = URL.createObjectURL(data)
      const link = document.createElement("a")
      link.href = url
      link.download = `${studentName.replace(/\s+/g, "_")}_statement.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast({
        title: t("toast.statement.download.success", "Download successful"),
        description: t("toast.statement.download.successDesc", "Statement file downloaded successfully"),
      })
    } catch (error: any) {
      console.error("Error downloading statement:", error)
      toast({
        title: t("toast.statement.download.error", "Download error"),
        description: error.message || t("toast.statement.download.errorDesc", "Failed to download statement file"),
        variant: "destructive",
      })
    }
  }

  // Function to export all student selections to CSV
  const exportAllSelectionsToCSV = () => {
    if (!electiveCourse) return

    // Create CSV header with translated column names
    const csvHeader = `"${language === "ru" ? "Имя студента" : "Student Name"}","${language === "ru" ? "ID студента" : "Student ID"}","${language === "ru" ? "Группа" : "Group"}","${language === "ru" ? "Программа" : "Program"}","${language === "ru" ? "Электронная почта" : "Email"}","${language === "ru" ? "Выбранные курсы" : "Selected Courses"}","${language === "ru" ? "Дата выбора" : "Selection Date"}","${language === "ru" ? "Статус" : "Status"}","${language === "ru" ? "Заявление" : "Statement"}"\n`

    // Create CSV content with translated status
    const allSelectionsContent = transformedSelections
      .map((student) => {
        // Translate status based on current language
        const translatedStatus =
          language === "ru"
            ? student.status === "approved"
              ? "Утверждено"
              : student.status === "pending"
                ? "На рассмотрении"
                : "Отклонено"
            : student.status === "approved"
              ? "Approved"
              : student.status === "pending"
                ? "Pending"
                : "Rejected"

        // Format date properly
        const formattedDate = formatDate(student.selectionDate)

        // Create a download link for the statement if available
        const statementLink = student.statementFile
          ? `${window.location.origin}/api/statements/${student.statementFile}`
          : language === "ru"
            ? "Не загружено"
            : "Not uploaded"

        // Properly escape fields that might contain commas and ensure correct column alignment
        return `"${student.studentName}","${student.studentId}","${student.group}","${student.program}","${student.email}","${student.selectedCourses.join("; ")}","${formattedDate}","${translatedStatus}","${statementLink}"`
      })
      .join("\n")

    // Combine header and content
    const csv = csvHeader + allSelectionsContent

    // Create a blob and download
    const programName = language === "ru" && electiveCourse.name_ru ? electiveCourse.name_ru : electiveCourse.name
    const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute(
      "download",
      `${programName.replace(/\s+/g, "_")}_${language === "ru" ? "все_выборы" : "all_selections"}.csv`,
    )
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <DashboardLayout userRole={UserRole.ADMIN}>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-2">
            <Link href="/admin/electives?tab=courses">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {loading ? (
                  <span className="text-muted-foreground">Loading...</span>
                ) : electiveCourse ? (
                  language === "ru" && electiveCourse.name_ru ? electiveCourse.name_ru : electiveCourse.name
                ) : (
                  "Course Elective"
                )}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {loading ? (
              <Badge variant="outline">Loading...</Badge>
            ) : electiveCourse ? (
              getStatusBadge(electiveCourse.status)
            ) : null}
          </div>
        </div>

        {loading ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading course program data...</div>
            </CardContent>
          </Card>
        ) : error ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-destructive">{error}</div>
            </CardContent>
          </Card>
        ) : !electiveCourse ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Course program not found</div>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>{t("manager.courseDetails.programDetails")}</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-2">
                  <div className="flex justify-between">
                    <dt className="font-medium">{t("manager.courseDetails.selectionPeriod")}:</dt>
                    <dd>
                      {electiveCourse.deadline
                        ? formatDate(electiveCourse.deadline)
                        : "Not set"}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium">{t("manager.courseDetails.maxSelections")}:</dt>
                    <dd>
                      {electiveCourse.max_selections || 0} {t("manager.courseDetails.courses")}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium">{t("manager.courseDetails.courses")}:</dt>
                    <dd>{courses.length}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium">{t("manager.courseDetails.studentsEnrolled")}:</dt>
                    <dd>{transformedSelections.length}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium">{t("manager.courseDetails.created")}:</dt>
                    <dd>{electiveCourse.created_at ? formatDate(electiveCourse.created_at) : "N/A"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium">{t("manager.courseDetails.status")}:</dt>
                    <dd>{t(`manager.status.${electiveCourse.status?.toLowerCase() || "draft"}`)}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

        <Tabs defaultValue="courses">
          <TabsList>
            <TabsTrigger value="courses">{t("manager.courseDetails.coursesTab")}</TabsTrigger>
            <TabsTrigger value="students">{t("manager.courseDetails.studentsTab")}</TabsTrigger>
          </TabsList>
          <TabsContent value="courses" className="mt-4">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>{t("manager.courseDetails.coursesInProgram")}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="py-3 px-4 text-left text-sm font-medium">{t("manager.courseDetails.name")}</th>
                        <th className="py-3 px-4 text-left text-sm font-medium">
                          {t("manager.courseDetails.professor")}
                        </th>
                        <th className="py-3 px-4 text-left text-sm font-medium">
                          {t("manager.courseDetails.enrollment")}
                        </th>
                        <th className="py-3 px-4 text-center text-sm font-medium">
                          {t("manager.courseDetails.export")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {courses.map((course) => {
                        const enrollmentCount = getCourseEnrollment(course.id)
                        const courseName = language === "ru" && course.name_ru ? course.name_ru : course.name
                        const instructor = language === "ru" && course.instructor_ru ? course.instructor_ru : course.instructor_en || ""
                        return (
                          <tr key={course.id} className="border-b">
                            <td className="py-3 px-4 text-sm">{courseName}</td>
                            <td className="py-3 px-4 text-sm">{instructor}</td>
                            <td className="py-3 px-4 text-sm">
                              <Badge variant={enrollmentCount >= course.max_students ? "destructive" : "secondary"}>
                                {enrollmentCount}/{course.max_students}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-sm text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => exportCourseEnrollmentsToCSV(courseName)}
                                className="flex items-center gap-1 mx-auto"
                              >
                                <FileDown className="h-4 w-4" />
                                {t("manager.courseDetails.download")}
                              </Button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="students" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{t("manager.courseDetails.studentSelections")}</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input
                      type="search"
                      placeholder={t("manager.courseDetails.searchStudents")}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="h-10 w-full rounded-md border border-input bg-background pl-8 pr-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:w-[200px]"
                    />
                  </div>
                  <Button variant="outline" size="sm" onClick={exportAllSelectionsToCSV}>
                    <Download className="mr-2 h-4 w-4" />
                    {t("manager.courseDetails.exportAll")}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="py-3 px-4 text-left text-sm font-medium">{t("manager.courseDetails.name")}</th>
                        <th className="py-3 px-4 text-left text-sm font-medium">{t("manager.courseDetails.group")}</th>
                        <th className="py-3 px-4 text-left text-sm font-medium">
                          {t("manager.courseDetails.selectionDate")}
                        </th>
                        <th className="py-3 px-4 text-left text-sm font-medium">{t("manager.courseDetails.status")}</th>
                        <th className="py-3 px-4 text-center text-sm font-medium">{t("statement")}</th>
                        <th className="py-3 px-4 text-center text-sm font-medium">{t("manager.courseDetails.view")}</th>
                        <th className="py-3 px-4 text-center text-sm font-medium">
                          {t("manager.courseDetails.actions")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {transformedSelections.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-6 text-center text-muted-foreground">
                            {t("manager.courseDetails.noSelections") || "No student selections yet"}
                          </td>
                        </tr>
                      ) : (
                        transformedSelections
                          .filter((selection) => {
                            if (!searchTerm) return true
                            const term = searchTerm.toLowerCase()
                            return (
                              selection.studentName.toLowerCase().includes(term) ||
                              selection.email.toLowerCase().includes(term) ||
                              selection.group.toLowerCase().includes(term)
                            )
                          })
                          .map((selection) => (
                            <tr key={selection.id} className="border-b">
                              <td className="py-3 px-4 text-sm">{selection.studentName}</td>
                              <td className="py-3 px-4 text-sm">{selection.group}</td>
                              <td className="py-3 px-4 text-sm">{formatDate(selection.selectionDate)}</td>
                              <td className="py-3 px-4 text-sm">{getSelectionStatusBadge(selection.status)}</td>
                              <td className="py-3 px-4 text-sm text-center">
                                {selection.statementFile ? (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => downloadStudentStatement(selection.studentName, selection.statementFile)}
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-sm text-center">
                                <Button variant="ghost" size="icon" onClick={() => openViewDialog(selection)}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </td>
                              <td className="py-3 px-4 text-sm text-center">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => openEditDialog(selection)}>
                                      <Edit className="mr-2 h-4 w-4" />
                                      {t("manager.courseDetails.edit")}
                                    </DropdownMenuItem>
                                    {selection.status === "pending" && (
                                      <>
                                        <DropdownMenuItem
                                          className="text-green-600"
                                          onClick={() => handleStatusChange(selection.id, "approved", selection.studentName)}
                                        >
                                          <CheckCircle className="mr-2 h-4 w-4" />
                                          {t("manager.exchangeDetails.approve")}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          className="text-red-600"
                                          onClick={() => handleStatusChange(selection.id, "rejected", selection.studentName)}
                                        >
                                          <XCircle className="mr-2 h-4 w-4" />
                                          {t("manager.exchangeDetails.reject")}
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                    {selection.status === "approved" && (
                                      <DropdownMenuItem
                                        className="text-red-600"
                                        onClick={() => handleStatusChange(selection.id, "rejected", selection.studentName)}
                                      >
                                        <XCircle className="mr-2 h-4 w-4" />
                                        {t("manager.courseDetails.withdraw")}
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
          </>
        )}
      </div>

      {/* View Student Details Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          {selectedStudent && (
            <>
              <DialogHeader>
                <DialogTitle>{t("manager.courseDetails.studentDetails")}</DialogTitle>
                <DialogDescription>
                  {t("manager.courseDetails.viewDetailsFor")} {selectedStudent.studentName}
                  {t("manager.courseDetails.courseSelection")}
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium">{t("manager.courseDetails.studentInformation")}</h3>
                    <div className="mt-2 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="font-medium">{t("manager.courseDetails.name")}:</span>
                        <span>{selectedStudent.studentName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">{t("manager.courseDetails.id")}:</span>
                        <span>{selectedStudent.studentId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">{t("manager.courseDetails.email")}:</span>
                        <span>{selectedStudent.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">{t("manager.courseDetails.group")}:</span>
                        <span>{selectedStudent.group}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">{t("manager.courseDetails.program")}:</span>
                        <span>{selectedStudent.program}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium">{t("manager.courseDetails.selectedCourses")}</h3>
                    <div className="mt-2 space-y-2">
                      {selectedStudent.selectedCourses.map((course: string, index: number) => (
                        <div key={index} className="rounded-md border p-2">
                          <p className="font-medium">{course}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium">{t("manager.courseDetails.selectionInformation")}</h3>
                    <div className="mt-2 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="font-medium">{t("manager.courseDetails.date")}:</span>
                        <span>{formatDate(selectedStudent.selectionDate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">{t("manager.courseDetails.status")}:</span>
                        <span>{getSelectionStatusBadge(selectedStudent.status)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Statement File Section */}
                  <div>
                    <h3 className="text-sm font-medium">{t("statementFile")}</h3>
                    <div className="mt-2">
                      {selectedStudent.statementFile ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full flex items-center gap-2"
                          onClick={() =>
                            downloadStudentStatement(selectedStudent.studentName, selectedStudent.statementFile)
                          }
                        >
                          <Download className="h-4 w-4" />
                          {t("downloadStatement")}
                        </Button>
                      ) : (
                        <p className="text-sm text-muted-foreground">No statement file uploaded yet.</p>
                      )}
                    </div>
                  </div>
                  {/* Digital Authorization Section */}
                  <div className="mt-4">
                    <h3 className="text-sm font-medium">{t("student.authorization.title")}</h3>
                    <div className="mt-2">
                      <p className="text-sm">
                        <span className="font-medium">{t("student.authorization.authorizedBy")}</span>{" "}
                        {selectedStudent.studentName}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                {selectedStudent.status === SelectionStatus.PENDING && (
                  <>
                    <Button
                      variant="outline"
                      className="mr-2 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800"
                      onClick={() => {
                        setViewDialogOpen(false)
                        window.setTimeout(() => {
                          toast({
                            title: "Selection approved",
                            description: `The selection for ${selectedStudent.studentName} has been approved.`,
                          })
                        }, 100)
                      }}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      {t("manager.exchangeDetails.approve")}
                    </Button>
                    <Button
                      variant="outline"
                      className="mr-2 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800"
                      onClick={() => {
                        setViewDialogOpen(false)
                        window.setTimeout(() => {
                          toast({
                            title: "Selection rejected",
                            description: `The selection for ${selectedStudent.studentName} has been rejected.`,
                          })
                        }, 100)
                      }}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      {t("manager.exchangeDetails.reject")}
                    </Button>
                  </>
                )}
                <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
                  {t("manager.courseDetails.close")}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Student Selection Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          {selectedStudent && (
            <>
              <DialogHeader>
                <DialogTitle>{t("manager.courseDetails.editStudentSelection")}</DialogTitle>
                <DialogDescription>
                  {t("manager.courseDetails.editSelectionFor")} {selectedStudent.studentName}
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium">{t("manager.courseDetails.studentInformation")}</h3>
                    <div className="mt-2 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="font-medium">{t("manager.courseDetails.name")}:</span>
                        <span>{selectedStudent.studentName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">{t("manager.courseDetails.group")}:</span>
                        <span>{selectedStudent.group}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">{t("manager.courseDetails.program")}:</span>
                        <span>{selectedStudent.program}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium">{t("manager.courseDetails.editCourses")}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("manager.courseDetails.selectUpTo")} {electiveCourse?.max_selections || 0}{" "}
                      {t("manager.courseDetails.courses")}
                    </p>
                    <div className="mt-3 space-y-3">
                      {courses.map((course) => {
                        const courseName = language === "ru" && course.name_ru ? course.name_ru : course.name
                        return (
                          <div key={course.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`course-${course.id}`}
                              checked={editedCourses.includes(course.id)}
                              onCheckedChange={(checked) => handleCourseSelection(course.id, checked as boolean)}
                              disabled={
                                !editedCourses.includes(course.id) &&
                                editedCourses.length >= (electiveCourse?.max_selections || 0)
                              }
                            />
                            <Label
                              htmlFor={`course-${course.id}`}
                              className={
                                !editedCourses.includes(course.id) &&
                                editedCourses.length >= (electiveCourse?.max_selections || 0)
                                  ? "text-muted-foreground"
                                  : ""
                              }
                            >
                              {courseName}
                            </Label>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                  {t("manager.courseDetails.cancel")}
                </Button>
                <Button onClick={saveEditedCourses} disabled={editedCourses.length === 0 || isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("manager.courseDetails.saving") || "Saving..."}
                    </>
                  ) : (
                    t("manager.courseDetails.saveChanges")
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Toast component */}
      <Toaster />
    </DashboardLayout>
  )
}
