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
import { ArrowLeft, Edit, Eye, MoreVertical, Search, CheckCircle, XCircle, Clock, Download, Loader2 } from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import { useLanguage } from "@/lib/language-context"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { getExchangeProgram, getUniversitiesFromIds, getExchangeSelections } from "@/actions/exchange-program-details"

interface ExchangeProgramDetailPageProps {
  params: {
    id: string
  }
}

export default function AdminExchangeDetailPage({ params }: ExchangeProgramDetailPageProps) {
  // State for dialog
  const [selectedStudent, setSelectedStudent] = useState<any>(null)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editedUniversities, setEditedUniversities] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)

  // Real data state
  const [exchangeProgram, setExchangeProgram] = useState<any>(null)
  const [universities, setUniversities] = useState<any[]>([])
  const [studentSelections, setStudentSelections] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

  // Add the language hook near the top of the component
  const { t, language } = useLanguage()
  const { toast } = useToast()
  const supabase = getSupabaseBrowserClient()

  // Load data from Supabase
  useEffect(() => {
    loadDataWithDetails()
  }, [params.id])

  // Set up real-time subscriptions for instant updates
  useEffect(() => {
    const channel = supabase
      .channel(`exchange-selections-${params.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "exchange_selections",
          filter: `elective_exchange_id=eq.${params.id}`,
        },
        async () => {
          // Refetch student selections when they change
          try {
            const selections = await getExchangeSelections(params.id)
            setStudentSelections(selections)
          } catch (error) {
            console.error("Error refetching exchange selections after real-time update:", error)
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, params.id])



  // Mock universities data for this exchange program (REMOVED - now using real data)
  const mockUniversities = [
    {
      id: "1",
      name: "University of Amsterdam",
      description: "One of the largest research universities in Europe with a rich academic tradition.",
      country: "Netherlands",
      city: "Amsterdam",
      language: "English, Dutch",
      maxStudents: 5,
      currentStudents: 3,
      website: "https://www.uva.nl/en",
      academicYear: 2,
      semester: exchangeProgram.semester,
      year: exchangeProgram.year,
      degree: "Bachelor",
      programs: ["Management", "International Management"],
    },
    {
      id: "2",
      name: "HEC Paris",
      description: "One of Europe's leading business schools with a strong focus on management education.",
      country: "France",
      city: "Paris",
      language: "English, French",
      maxStudents: 4,
      currentStudents: 4,
      website: "https://www.hec.edu/en",
      academicYear: 2,
      semester: exchangeProgram.semester,
      year: exchangeProgram.year,
      degree: "Bachelor",
      programs: ["Management", "International Management"],
    },
    {
      id: "3",
      name: "Copenhagen Business School",
      description: "One of the largest business schools in Europe with a broad range of programs.",
      country: "Denmark",
      city: "Copenhagen",
      language: "English, Danish",
      maxStudents: 6,
      currentStudents: 2,
      website: "https://www.cbs.dk/en",
      academicYear: 2,
      semester: exchangeProgram.semester,
      year: exchangeProgram.year,
      degree: "Bachelor",
      programs: ["Management", "International Management", "Public Administration"],
    },
    {
      id: "4",
      name: "Bocconi University",
      description: "A private university in Milan, Italy, specializing in economics, management, and finance.",
      country: "Italy",
      city: "Milan",
      language: "English, Italian",
      maxStudents: 5,
      currentStudents: 5,
      website: "https://www.unibocconi.eu/",
      academicYear: 2,
      semester: exchangeProgram.semester,
      year: exchangeProgram.year,
      degree: "Bachelor",
      programs: ["Management", "International Management", "Public Administration"],
    },
    {
      id: "5",
      name: "Vienna University of Economics and Business",
      description:
        "One of Europe's largest business universities focusing on business, economics, and social sciences.",
      country: "Austria",
      city: "Vienna",
      language: "English, German",
      maxStudents: 4,
      currentStudents: 2,
      website: "https://www.wu.ac.at/en/",
      academicYear: 2,
      semester: exchangeProgram.semester,
      year: exchangeProgram.year,
      degree: "Bachelor",
      programs: ["International Management"],
    },
    {
      id: "6",
      name: "Stockholm School of Economics",
      description: "A private business school with a strong international presence and research focus.",
      country: "Sweden",
      city: "Stockholm",
      language: "English, Swedish",
      maxStudents: 3,
      currentStudents: 2,
      website: "https://www.hhs.se/en/",
      academicYear: 2,
      semester: exchangeProgram.semester,
      year: exchangeProgram.year,
      degree: "Bachelor",
      programs: ["Management", "International Management"],
    },
  ]

  // Update loadData to fetch student profile details
  const loadDataWithDetails = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load exchange program
      const program = await getExchangeProgram(params.id)
      if (!program) {
        throw new Error("Exchange program not found")
      }
      setExchangeProgram(program)

      // Load universities from the universities column
      if (program.universities && program.universities.length > 0) {
        const universitiesData = await getUniversitiesFromIds(program.universities)
        setUniversities(universitiesData)
      } else {
        setUniversities([])
      }

      // Load student selections
      const selections = await getExchangeSelections(params.id)

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
    } catch (error) {
      console.error("Error loading data:", error)
      setError(error instanceof Error ? error.message : "Failed to load exchange program data")
      toast({
        title: "Error",
        description: "Failed to load exchange program data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Update transformedSelections to use the data from loadDataWithDetails
  const transformedSelections = studentSelections.map((selection) => {
    // Get university names from selected_university_ids
    const selectedUniversityNames = selection.selected_university_ids
      ? universities
          .filter((u) => selection.selected_university_ids.includes(u.id))
          .map((u) => u.name)
      : []

    // Get student profile info
    const profile = selection.profiles || {}

    return {
      id: selection.id,
      studentName: profile.full_name || "Unknown",
      studentId: selection.student_id,
      email: profile.email || "",
      selectedUniversities: selectedUniversityNames,
      selected_university_ids: selection.selected_university_ids || [],
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

  const handleStatusChange = async (selectionId: string, newStatus: "approved" | "rejected", studentName: string) => {
    try {
      const { error } = await supabase.from("exchange_selections").update({ status: newStatus }).eq("id", selectionId)

      if (error) throw error

      // Refetch selections
      await loadDataWithDetails()

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
    setEditedUniversities([...student.selectedUniversities])
    setEditDialogOpen(true)
  }

  // Function to handle university selection in edit dialog
  const handleUniversitySelection = (universityName: string, checked: boolean) => {
    if (checked) {
      // Add university if it's not already selected and we haven't reached the max
      if (!editedUniversities.includes(universityName) && editedUniversities.length < (exchangeProgram?.max_selections || 0)) {
        setEditedUniversities([...editedUniversities, universityName])
      }
    } else {
      // Remove university if it's selected
      setEditedUniversities(editedUniversities.filter((name) => name !== universityName))
    }
  }

  // Function to save edited universities
  const saveEditedUniversities = async () => {
    if (!selectedStudent) return

    setIsSaving(true)
    try {
      // Convert university names back to IDs
      const selectedUniversityIds = universities
        .filter((u) => editedUniversities.includes(u.name))
        .map((u) => u.id)

      // Update the selection
      const { error } = await supabase
        .from("exchange_selections")
        .update({ selected_university_ids: selectedUniversityIds })
        .eq("id", selectedStudent.id)

      if (error) throw error

      // Refetch data
      await loadDataWithDetails()

      setEditDialogOpen(false)

      toast({
        title: t("toast.selection.updated"),
        description: t("toast.selection.updated.exchange.description").replace("{0}", selectedStudent.studentName),
      })
    } catch (error: any) {
      console.error("Error saving universities:", error)
      toast({
        title: t("toast.error", "Error"),
        description: error.message || t("toast.errorDesc", "Failed to save changes"),
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Also update the exportUniversityToCSV function to ensure consistent formatting
  // Replace the entire exportUniversityToCSV function with this corrected version:

  const exportUniversityToCSV = (university: any) => {
    // Define column headers based on language
    const headers = {
      en: ["Name", "Location", "Enrollment"],
      ru: ["Название", "Местоположение", "Зачисление"],
    }

    // Create CSV content
    let universityContent = headers[language as keyof typeof headers].map((header) => `"${header}"`).join(",") + "\n"

    // Add data row
    const location = `${university.city}, ${university.country}`
    const enrollment = `${university.currentStudents}/${university.maxStudents}`

    // Escape fields that might contain commas
    const row = [
      `"${university.name}"`,
      `"${location}"`,
      `"${enrollment}"`,
    ]

    universityContent += row.join(",") + "\n"

    // Create and download the file
    const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), universityContent], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    const fileName = `university_${university.name.replace(/\s+/g, "_")}_${language}.csv`

    link.setAttribute("href", url)
    link.setAttribute("download", fileName)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Function to export a single university to CSV
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

  // Update the exportStudentSelectionsToCSV function to fix the date and column alignment issues
  // Replace the entire exportStudentSelectionsToCSV function with this corrected version:

  const exportStudentSelectionsToCSV = () => {
    if (!exchangeProgram) return

    // Define column headers based on language
    const headers = {
      en: [
        "Student Name",
        "Student ID",
        "Group",
        "Program",
        "Email",
        "Selected Universities",
        "Selection Date",
        "Status",
        "Statement",
      ],
      ru: [
        "Имя студента",
        "ID студента",
        "Группа",
        "Программа",
        "Электронная почта",
        "Выбранные университеты",
        "Дата выбора",
        "Статус",
        "Заявление",
      ],
    }


    // Create CSV content
    let selectionsContent = headers[language as keyof typeof headers].join(",") + "\n"

    // Add data rows
    transformedSelections.forEach((selection) => {
      const selectedUniversities = selection.selectedUniversities.join("; ")
      const status =
        language === "ru"
          ? selection.status === "approved"
            ? "Утверждено"
            : selection.status === "pending"
              ? "На рассмотрении"
              : "Отклонено"
          : selection.status === "approved"
            ? "Approved"
            : selection.status === "pending"
              ? "Pending"
              : "Rejected"

      // Format date properly
      const formattedDate = formatDate(selection.selectionDate)

      // Create a download link for the statement if available
      const statementLink = selection.statementFile
        ? `${window.location.origin}/api/statements/${selection.statementFile}`
        : language === "ru"
          ? "Не загружено"
          : "Not uploaded"

      // Properly escape all fields with quotes to ensure correct column alignment
      const row = [
        `"${selection.studentName}"`,
        `"${selection.studentId}"`,
        `"${selection.group}"`,
        `"${selection.program}"`,
        `"${selection.email}"`,
        `"${selectedUniversities}"`,
        `"${formattedDate}"`,
        `"${status}"`,
        `"${statementLink}"`,
      ]

      selectionsContent += row.join(",") + "\n"
    })

    // Create and download the file
    const programName = language === "ru" && exchangeProgram.name_ru ? exchangeProgram.name_ru : exchangeProgram.name
    const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), selectionsContent], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    const fileName = `student_selections_${programName.replace(/\s+/g, "_")}_${language}.csv`

    link.setAttribute("href", url)
    link.setAttribute("download", fileName)
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
            <Link href="/admin/electives?tab=exchange">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {loading ? (
                  <span className="text-muted-foreground">Loading...</span>
                ) : exchangeProgram ? (
                  language === "ru" && exchangeProgram.name_ru ? exchangeProgram.name_ru : exchangeProgram.name
                ) : (
                  "Exchange Program"
                )}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {loading ? (
              <Badge variant="outline">Loading...</Badge>
            ) : exchangeProgram ? (
              getStatusBadge(exchangeProgram.status)
            ) : null}
          </div>
        </div>

        {loading ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading exchange program data...</div>
            </CardContent>
          </Card>
        ) : error ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-destructive">{error}</div>
            </CardContent>
          </Card>
        ) : !exchangeProgram ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Exchange program not found</div>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>{t("manager.exchangeDetails.programDetails")}</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-2">
                  <div className="flex justify-between">
                    <dt className="font-medium">{t("manager.exchangeDetails.selectionPeriod")}:</dt>
                    <dd>
                      {exchangeProgram.deadline
                        ? formatDate(exchangeProgram.deadline)
                        : "Not set"}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium">{t("manager.exchangeDetails.maxSelections")}:</dt>
                    <dd>
                      {exchangeProgram.max_selections || 0} {t("manager.exchangeDetails.universities")}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium">{t("manager.exchangeDetails.universities")}:</dt>
                    <dd>{universities.length}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium">{t("manager.exchangeDetails.studentsEnrolled")}:</dt>
                    <dd>{transformedSelections.length}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium">{t("manager.exchangeDetails.created")}:</dt>
                    <dd>{exchangeProgram.created_at ? formatDate(exchangeProgram.created_at) : "N/A"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium">{t("manager.exchangeDetails.status")}:</dt>
                    <dd>{t(`manager.status.${exchangeProgram.status?.toLowerCase() || "draft"}`)}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

        <Tabs defaultValue="universities">
          <TabsList>
            <TabsTrigger value="universities">{t("manager.exchangeDetails.universitiesTab")}</TabsTrigger>
            <TabsTrigger value="students">{t("manager.exchangeDetails.studentsTab")}</TabsTrigger>
          </TabsList>
          <TabsContent value="universities" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>{t("manager.exchangeDetails.universitiesTab")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="py-3 px-4 text-left text-sm font-medium">{t("manager.exchangeDetails.name")}</th>
                        <th className="py-3 px-4 text-left text-sm font-medium">
                          {t("manager.exchangeDetails.location")}
                        </th>
                        <th className="py-3 px-4 text-left text-sm font-medium">
                          {t("manager.exchangeDetails.enrollment")}
                        </th>
                        <th className="py-3 px-4 text-center text-sm font-medium">
                          {t("manager.exchangeDetails.export")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {universities.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-6 text-center text-muted-foreground">
                            {t("manager.exchangeDetails.noUniversities") || "No universities in this program"}
                          </td>
                        </tr>
                      ) : (
                        universities.map((university) => {
                          const enrollmentCount = transformedSelections.filter(
                            (selection) =>
                              selection.selected_university_ids &&
                              selection.selected_university_ids.includes(university.id) &&
                              (selection.status === "approved" || selection.status === "pending"),
                          ).length
                          return (
                            <tr key={university.id} className="border-b">
                              <td className="py-3 px-4 text-sm">{university.name}</td>
                              <td className="py-3 px-4 text-sm">
                                {university.city}, {university.country}
                              </td>
                              <td className="py-3 px-4 text-sm">
                                <Badge variant={enrollmentCount >= (university.max_students || 0) ? "destructive" : "secondary"}>
                                  {enrollmentCount}/{university.max_students || 0}
                                </Badge>
                              </td>
                              <td className="py-3 px-4 text-sm text-center">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => exportUniversityToCSV(university)}
                                  className="flex mx-auto"
                                >
                                  <Download className="h-4 w-4 mr-1" />
                                  {t("manager.exchangeDetails.download")}
                                </Button>
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
          <TabsContent value="students" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{t("manager.exchangeDetails.studentSelections")}</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input
                      type="search"
                      placeholder={t("manager.exchangeDetails.searchStudents")}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="h-10 w-full rounded-md border border-input bg-background pl-8 pr-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:w-[200px]"
                    />
                  </div>
                  <Button variant="outline" size="sm" onClick={exportStudentSelectionsToCSV}>
                    <Download className="mr-2 h-4 w-4" />
                    {t("manager.exchangeDetails.exportAll")}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="py-3 px-4 text-left text-sm font-medium">{t("manager.exchangeDetails.name")}</th>
                        <th className="py-3 px-4 text-left text-sm font-medium">
                          {t("manager.exchangeDetails.group")}
                        </th>
                        <th className="py-3 px-4 text-left text-sm font-medium">
                          {t("manager.exchangeDetails.selectionDate")}
                        </th>
                        <th className="py-3 px-4 text-left text-sm font-medium">
                          {t("manager.exchangeDetails.status")}
                        </th>
                        <th className="py-3 px-4 text-center text-sm font-medium">{t("statement")}</th>
                        <th className="py-3 px-4 text-center text-sm font-medium">
                          {t("manager.exchangeDetails.view")}
                        </th>
                        <th className="py-3 px-4 text-center text-sm font-medium">
                          {t("manager.exchangeDetails.actions")}
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
                                  {t("manager.exchangeDetails.edit")}
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
                                        title: "Selection withdrawn",
                                        description: `The selection for ${selection.studentName} has been withdrawn.`,
                                      })
                                    }}
                                  >
                                    <XCircle className="mr-2 h-4 w-4" />
                                    {t("manager.exchangeDetails.withdraw")}
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
                <DialogTitle>{t("manager.exchangeDetails.studentDetails")}</DialogTitle>
                <DialogDescription>
                  {t("manager.exchangeDetails.viewDetailsFor")} {selectedStudent.studentName}
                  {t("manager.exchangeDetails.exchangeSelection")}
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium">{t("manager.exchangeDetails.studentInformation")}</h3>
                    <div className="mt-2 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="font-medium">{t("manager.exchangeDetails.name")}:</span>
                        <span>{selectedStudent.studentName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">{t("manager.exchangeDetails.id")}:</span>
                        <span>{selectedStudent.studentId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">{t("manager.exchangeDetails.email")}:</span>
                        <span>{selectedStudent.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">{t("manager.exchangeDetails.group")}:</span>
                        <span>{selectedStudent.group}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">{t("manager.exchangeDetails.program")}:</span>
                        <span>{selectedStudent.program}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium">{t("manager.exchangeDetails.selectedUniversities")}</h3>
                    <div className="mt-2 space-y-2">
                      {selectedStudent.selectedUniversities.map((university: string, index: number) => (
                        <div key={index} className="rounded-md border p-2">
                          <p className="font-medium">{university}</p>
                          <p className="text-xs text-muted-foreground">
                            {universities.find((u) => u.name === university)?.country}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium">{t("manager.exchangeDetails.selectionInformation")}</h3>
                    <div className="mt-2 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="font-medium">{t("manager.exchangeDetails.date")}:</span>
                        <span>{formatDate(selectedStudent.selectionDate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">{t("manager.exchangeDetails.status")}:</span>
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
                <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
                  {t("manager.exchangeDetails.close")}
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
                <DialogTitle>{t("manager.exchangeDetails.editStudentSelection")}</DialogTitle>
                <DialogDescription>
                  {t("manager.exchangeDetails.editSelectionFor")} {selectedStudent.studentName}
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium">{t("manager.exchangeDetails.studentInformation")}</h3>
                    <div className="mt-2 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="font-medium">{t("manager.exchangeDetails.name")}:</span>
                        <span>{selectedStudent.studentName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">{t("manager.exchangeDetails.group")}:</span>
                        <span>{selectedStudent.group}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">{t("manager.exchangeDetails.program")}:</span>
                        <span>{selectedStudent.program}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium">{t("manager.exchangeDetails.editUniversities")}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("manager.exchangeDetails.selectUpTo")} {exchangeProgram.maxSelections}{" "}
                      {t("manager.exchangeDetails.universities")}
                    </p>
                    <div className="mt-3 space-y-3">
                      {universities.map((university) => (
                        <div key={university.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`university-${university.id}`}
                            checked={editedUniversities.includes(university.name)}
                            onCheckedChange={(checked) =>
                              handleUniversitySelection(university.name, checked as boolean)
                            }
                            disabled={
                              !editedUniversities.includes(university.name) &&
                              editedUniversities.length >= exchangeProgram.maxSelections
                            }
                          />
                          <Label
                            htmlFor={`university-${university.id}`}
                            className={
                              !editedUniversities.includes(university.name) &&
                              editedUniversities.length >= exchangeProgram.maxSelections
                                ? "text-muted-foreground"
                                : ""
                            }
                          >
                            {university.name}
                            <span className="text-xs text-muted-foreground ml-1">
                              ({university.city}, {university.country})
                            </span>
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                  {t("manager.exchangeDetails.cancel")}
                </Button>
                <Button onClick={saveEditedUniversities} disabled={editedUniversities.length === 0 || isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("manager.exchangeDetails.saving") || "Saving..."}
                    </>
                  ) : (
                    t("manager.exchangeDetails.saveChanges")
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
