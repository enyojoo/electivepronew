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
import { useState } from "react"
import { useLanguage } from "@/lib/language-context"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"

interface ElectiveCourseDetailPageProps {
  params: {
    id: string
  }
}

export default function AdminElectiveCourseDetailPage({ params }: ElectiveCourseDetailPageProps) {
  // Add the language hook near the top of the component
  const { t, language } = useLanguage()
  const { toast } = useToast()

  // State for dialogs
  const [selectedStudent, setSelectedStudent] = useState<any>(null)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editedCourses, setEditedCourses] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)

  // Mock elective course data
  const electiveCourse = {
    id: params.id,
    name:
      params.id === "fall-2023"
        ? "Fall Semester 2023"
        : params.id === "spring-2024"
          ? "Spring Semester 2024"
          : "Elective Courses",
    description:
      "Select your preferred courses for this semester's elective program. You can choose up to the maximum number of courses allowed for this program.",
    semester: params.id.includes("fall") ? "Fall" : "Spring",
    year: params.id.includes("2023") ? 2023 : params.id.includes("2024") ? 2024 : 2025,
    maxSelections: params.id === "spring-2024" ? 3 : 2,
    status: ElectivePackStatus.PUBLISHED,
    startDate: params.id.includes("fall") ? "2023-08-01" : "2024-01-10",
    endDate: params.id.includes("fall") ? "2023-08-15" : "2024-01-25",
    coursesCount: params.id === "spring-2024" ? 8 : 6,
    studentsEnrolled: params.id === "fall-2023" ? 42 : params.id === "spring-2024" ? 28 : 0,
    createdAt: params.id.includes("fall") ? "2023-07-01" : "2023-12-01",
  }

  // Mock courses data for this elective program
  const courses = [
    {
      id: "1",
      name: "Strategic Management",
      description: "This course focuses on the strategic management of organizations.",
      maxStudents: 30,
      currentStudents: 25,
      professor: "Dr. Smith",
      semester: electiveCourse.semester,
      year: electiveCourse.year,
      degree: "Bachelor",
      programs: ["Management", "International Management"],
    },
    {
      id: "2",
      name: "International Marketing",
      description: "This course covers marketing strategies in an international context.",
      maxStudents: 25,
      currentStudents: 25,
      professor: "Dr. Johnson",
      semester: electiveCourse.semester,
      year: electiveCourse.year,
      degree: "Bachelor",
      programs: ["Management", "International Management"],
    },
    {
      id: "3",
      name: "Financial Management",
      description: "This course covers financial management principles and practices.",
      maxStudents: 35,
      currentStudents: 20,
      professor: "Dr. Williams",
      semester: electiveCourse.semester,
      year: electiveCourse.year,
      degree: "Bachelor",
      programs: ["Management", "International Management", "Public Administration"],
    },
    {
      id: "4",
      name: "Organizational Behavior",
      description: "This course examines human behavior in organizational settings.",
      maxStudents: 30,
      currentStudents: 30,
      professor: "Dr. Brown",
      semester: electiveCourse.semester,
      year: electiveCourse.year,
      degree: "Bachelor",
      programs: ["Management", "International Management", "Public Administration"],
    },
    {
      id: "5",
      name: "Business Ethics",
      description: "This course explores ethical issues in business and management.",
      maxStudents: 40,
      currentStudents: 15,
      professor: "Dr. Davis",
      semester: electiveCourse.semester,
      year: electiveCourse.year,
      degree: "Bachelor",
      programs: ["International Management"],
    },
    {
      id: "6",
      name: "Supply Chain Management",
      description: "This course covers the management of supply chains and logistics.",
      maxStudents: 25,
      currentStudents: 20,
      professor: "Dr. Miller",
      semester: electiveCourse.semester,
      year: electiveCourse.year,
      degree: "Bachelor",
      programs: ["Management", "International Management"],
    },
  ]

  // Mock student selections data
  const studentSelections = [
    {
      id: "1",
      studentName: "Alex Johnson",
      studentId: "st123456",
      group: "23.B12-vshm",
      program: "Management",
      email: "alex.johnson@student.gsom.spbu.ru",
      selectedCourses: ["Strategic Management", "Financial Management"],
      selectionDate: "2023-08-05",
      status: SelectionStatus.APPROVED,
      statementFile: "alex_johnson_statement.pdf",
    },
    {
      id: "2",
      studentName: "Maria Petrova",
      studentId: "st123457",
      group: "23.B12-vshm",
      program: "Management",
      email: "maria.petrova@student.gsom.spbu.ru",
      selectedCourses: ["International Marketing", "Supply Chain Management"],
      selectionDate: "2023-08-06",
      status: SelectionStatus.APPROVED,
      statementFile: "maria_petrova_statement.pdf",
    },
    {
      id: "3",
      studentName: "Ivan Sokolov",
      studentId: "st123458",
      group: "23.B12-vshm",
      program: "Management",
      email: "ivan.sokolov@student.gsom.spbu.ru",
      selectedCourses: ["Organizational Behavior", "Business Ethics"],
      selectionDate: "2023-08-07",
      status: SelectionStatus.PENDING,
      statementFile: "ivan_sokolov_statement.pdf",
    },
    {
      id: "4",
      studentName: "Elena Ivanova",
      studentId: "st123459",
      group: "23.B11-vshm",
      program: "International Management",
      email: "elena.ivanova@student.gsom.spbu.ru",
      selectedCourses: ["Strategic Management", "Business Ethics"],
      selectionDate: "2023-08-08",
      status: SelectionStatus.PENDING,
      statementFile: null,
    },
  ]

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

  // Function to open edit dialog with student details
  const openEditDialog = (student: any) => {
    setSelectedStudent(student)
    setEditedCourses([...student.selectedCourses])
    setEditDialogOpen(true)
  }

  // Function to handle course selection in edit dialog
  const handleCourseSelection = (courseName: string, checked: boolean) => {
    if (checked) {
      // Add course if it's not already selected and we haven't reached the max
      if (!editedCourses.includes(courseName) && editedCourses.length < electiveCourse.maxSelections) {
        setEditedCourses([...editedCourses, courseName])
      }
    } else {
      // Remove course if it's selected
      setEditedCourses(editedCourses.filter((name) => name !== courseName))
    }
  }

  // Function to save edited courses
  const saveEditedCourses = async () => {
    setIsSaving(true)
    try {
      // In a real app, you would make an API call here to update the database
      // For this demo, we'll just show a success message
      setEditDialogOpen(false)

      // Use setTimeout to ensure the toast appears after the dialog closes
      window.setTimeout(() => {
        toast({
          title: t("toast.selection.updated"),
        description: t("toast.selection.updated.course.description").replace("{0}", selectedStudent.studentName),
      })
    }, 100)
    } catch (error) {
      console.error("Error saving courses:", error)
      toast({
        title: t("toast.error", "Error"),
        description: t("toast.errorDesc", "Failed to save changes"),
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Function to export course enrollments to CSV
  const exportCourseEnrollmentsToCSV = (courseName: string) => {
    // Find students who selected this course
    const studentsInCourse = studentSelections.filter((student) => student.selectedCourses.includes(courseName))

    // Create CSV header with translated column names
    const csvHeader = `"${language === "ru" ? "Имя студента" : "Student Name"}","${language === "ru" ? "ID студента" : "Student ID"}","${language === "ru" ? "Группа" : "Group"}","${language === "ru" ? "Программа" : "Program"}","${language === "ru" ? "Электронная почта" : "Email"}","${language === "ru" ? "Дата выбора" : "Selection Date"}","${language === "ru" ? "Статус" : "Status"}"\n`

    // Create CSV content with translated status
    const courseContent = studentsInCourse
      .map((student) => {
        // Translate status based on current language
        const translatedStatus =
          language === "ru"
            ? student.status === SelectionStatus.APPROVED
              ? "Утверждено"
              : student.status === SelectionStatus.PENDING
                ? "На рассмотрении"
                : "Отклонено"
            : student.status === SelectionStatus.APPROVED
              ? "Approved"
              : student.status === SelectionStatus.PENDING
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
  const downloadStudentStatement = (studentName: string, fileName: string | null) => {
    if (!fileName) {
      toast({
        title: t("toast.statement.notAvailable"),
        description: t("toast.statement.notAvailable.description").replace("{0}", studentName),
      })
      return
    }

    // In a real app, this would download the actual file
    // For this demo, we'll just show a toast
    toast({
      title: t("toast.statement.download.success"),
      description: t("toast.statement.download.success.description"),
    })
  }

  // Function to export all student selections to CSV
  const exportAllSelectionsToCSV = () => {
    // Create CSV header with translated column names
    const csvHeader = `${language === "ru" ? "Имя студента" : "Student Name"},${language === "ru" ? "ID студента" : "Student ID"},${language === "ru" ? "Группа" : "Group"},${language === "ru" ? "Программа" : "Program"},${language === "ru" ? "Электронная почта" : "Email"},${language === "ru" ? "Выбранные курсы" : "Selected Courses"},${language === "ru" ? "Дата выбора" : "Selection Date"},${language === "ru" ? "Статус" : "Status"},${language === "ru" ? "Заявление" : "Statement"}\n`

    // Create CSV content with translated status
    const allSelectionsContent = studentSelections
      .map((student) => {
        // Translate status based on current language
        const translatedStatus =
          language === "ru"
            ? student.status === SelectionStatus.APPROVED
              ? "Утверждено"
              : student.status === SelectionStatus.PENDING
                ? "На рассмотрении"
                : "Отклонено"
            : student.status

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
    const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute(
      "download",
      `${electiveCourse.name.replace(/\s+/g, "_")}_${language === "ru" ? "все_выборы" : "all_selections"}.csv`,
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
              <h1 className="text-3xl font-bold tracking-tight">{electiveCourse.name}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">{getStatusBadge(electiveCourse.status)}</div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("manager.courseDetails.programDetails")}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="font-medium">{t("manager.courseDetails.selectionPeriod")}:</dt>
                <dd>
                  {formatDate(electiveCourse.startDate)} - {formatDate(electiveCourse.endDate)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium">{t("manager.courseDetails.maxSelections")}:</dt>
                <dd>
                  {electiveCourse.maxSelections} {t("manager.courseDetails.courses")}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium">{t("manager.courseDetails.courses")}:</dt>
                <dd>{electiveCourse.coursesCount}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium">{t("manager.courseDetails.studentsEnrolled")}:</dt>
                <dd>{electiveCourse.studentsEnrolled}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium">{t("manager.courseDetails.created")}:</dt>
                <dd>{formatDate(electiveCourse.createdAt)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium">{t("manager.courseDetails.status")}:</dt>
                <dd>{t(`manager.status.${electiveCourse.status.toLowerCase()}`)}</dd>
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
                      {courses.map((course) => (
                        <tr key={course.id} className="border-b">
                          <td className="py-3 px-4 text-sm">{course.name}</td>
                          <td className="py-3 px-4 text-sm">{course.professor}</td>
                          <td className="py-3 px-4 text-sm">
                            <Badge variant={course.currentStudents >= course.maxStudents ? "destructive" : "secondary"}>
                              {course.currentStudents}/{course.maxStudents}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-sm text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => exportCourseEnrollmentsToCSV(course.name)}
                              className="flex items-center gap-1 mx-auto"
                            >
                              <FileDown className="h-4 w-4" />
                              {t("manager.courseDetails.download")}
                            </Button>
                          </td>
                        </tr>
                      ))}
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
                      {studentSelections.map((selection) => (
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
                                {selection.status === SelectionStatus.PENDING && (
                                  <>
                                    <DropdownMenuItem
                                      className="text-green-600"
                                      onClick={() => {
                                        toast({
                                          title: "Selection approved",
                                          description: `The selection for ${selection.studentName} has been approved.`,
                                        })
                                      }}
                                    >
                                      <CheckCircle className="mr-2 h-4 w-4" />
                                      {t("manager.exchangeDetails.approve")}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-red-600"
                                      onClick={() => {
                                        toast({
                                          title: "Selection rejected",
                                          description: `The selection for ${selection.studentName} has been rejected.`,
                                        })
                                      }}
                                    >
                                      <XCircle className="mr-2 h-4 w-4" />
                                      {t("manager.exchangeDetails.reject")}
                                    </DropdownMenuItem>
                                  </>
                                )}
                                {selection.status === SelectionStatus.APPROVED && (
                                  <DropdownMenuItem
                                    className="text-red-600"
                                    onClick={() => {
                                      toast({
                                        title: t("toast.selection.withdrawn"),
                                        description: t("toast.selection.withdrawn.description").replace(
                                          "{0}",
                                          selection.studentName,
                                        ),
                                      })
                                    }}
                                  >
                                    <XCircle className="mr-2 h-4 w-4" />
                                    {t("manager.courseDetails.withdraw")}
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
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
                      {t("manager.courseDetails.selectUpTo")} {electiveCourse.maxSelections}{" "}
                      {t("manager.courseDetails.courses")}
                    </p>
                    <div className="mt-3 space-y-3">
                      {courses.map((course) => (
                        <div key={course.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`course-${course.id}`}
                            checked={editedCourses.includes(course.name)}
                            onCheckedChange={(checked) => handleCourseSelection(course.name, checked as boolean)}
                            disabled={
                              !editedCourses.includes(course.name) &&
                              editedCourses.length >= electiveCourse.maxSelections
                            }
                          />
                          <Label
                            htmlFor={`course-${course.id}`}
                            className={
                              !editedCourses.includes(course.name) &&
                              editedCourses.length >= electiveCourse.maxSelections
                                ? "text-muted-foreground"
                                : ""
                            }
                          >
                            {course.name}
                          </Label>
                        </div>
                      ))}
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
