"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { UserRole } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
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
const EXCHANGE_DETAIL_CACHE_KEY = "exchangeDetailData"
const EXCHANGE_SELECTIONS_CACHE_KEY = "exchangeSelectionsData"
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
import { Toaster } from "@/components/ui/toaster"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import {
  getExchangeProgram,
  getUniversitiesFromIds,
  getExchangeSelections,
  getUniversitySelectionData,
  downloadStatementFile,
  updateSelectionStatus,
  updateStudentSelection,
} from "@/actions/exchange-program-details"

interface ExchangeProgramDetailPageProps {
  params: {
    id: string
  }
}

interface ExchangeProgram {
  id: string
  name: string
  name_ru: string | null
  description: string | null
  description_ru: string | null
  deadline: string
  max_selections: number
  status: string
  universities: string[]
  created_at: string
  updated_at: string
}

interface University {
  id: string
  name: string
  name_ru: string | null
  country: string
  max_students: number
  website: string | null
  description: string | null
  description_ru: string | null
  status: string
}

interface StudentSelection {
  id: string
  selected_university_ids: string[]
  statement_url: string | null
  status: string
  created_at: string
  student_id: string
  profiles: {
    id: string
    full_name: string | null
    email: string
  } | null
}

export default function ExchangeDetailPage() {
  const params = useParams()
  const [exchangeProgram, setExchangeProgram] = useState<ExchangeProgram | null>(null)
  const [universities, setUniversities] = useState<University[]>([])
  const [studentSelections, setStudentSelections] = useState<StudentSelection[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<StudentSelection | null>(null)
  const [editingStudent, setEditingStudent] = useState<StudentSelection | null>(null)
  const [editStatus, setEditStatus] = useState("")
  const [editSelectedUniversities, setEditSelectedUniversities] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)
  // Initialize activeTab based on URL hash or default to universities
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash.replace("#", "")
      if (hash === "students") return "students"
      if (hash === "universities") return "universities"
    }
    return "universities"
  })

  const { t, language } = useLanguage()
  const { toast } = useToast()
  const supabase = getSupabaseBrowserClient()
  const router = useRouter()

  // Note: Hash handling is done in useState initializer above
  // This ensures the initial tab matches the URL hash from manager dashboard links

  // Update URL hash when tab changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `#${activeTab}`)
    }
  }, [activeTab])

  // Load cached data immediately on mount
  useEffect(() => {
    const exchangeId = params.id as string
    const cacheKey = `${EXCHANGE_DETAIL_CACHE_KEY}_${exchangeId}`
    const selectionsCacheKey = `${EXCHANGE_SELECTIONS_CACHE_KEY}_${exchangeId}`

    // Load cached data first
    const cachedData = getCachedData(cacheKey)
    const cachedSelections = getCachedData(selectionsCacheKey)

    if (cachedData) {
      setExchangeProgram(cachedData)
      setUniversities(cachedData.universities || [])
    }

    if (cachedSelections) {
      setStudentSelections(cachedSelections)
    }

    // Check if we need to fetch from API
    const needsApiFetch = !cachedData || !cachedSelections
    if (needsApiFetch) {
      setLoading(true)
    }

    // Fetch fresh data in background or initially
    loadData()
  }, [params.id])

  // Set up real-time subscriptions for instant updates
  useEffect(() => {
    const channel = supabase
      .channel(`exchange-selections-${params.id as string}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "exchange_selections",
          filter: `elective_exchange_id=eq.${params.id as string}`,
        },
        async () => {
          // Refetch student selections when they change
          try {
            const exchangeId = params.id as string
            // For real-time updates, we need to refetch from API
            const response = await fetch(`/api/manager/electives/exchange/${exchangeId}`)
            if (response.ok) {
              const data = await response.json()
              setStudentSelections(data.studentSelections || [])
              // Update cache
              const selectionsCacheKey = `${EXCHANGE_SELECTIONS_CACHE_KEY}_${exchangeId}`
              setCachedData(selectionsCacheKey, data.studentSelections || [])
            }
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

  const loadData = async () => {
    try {
      setError(null)

      const exchangeId = params.id as string
      const cacheKey = `${EXCHANGE_DETAIL_CACHE_KEY}_${exchangeId}`
      const selectionsCacheKey = `${EXCHANGE_SELECTIONS_CACHE_KEY}_${exchangeId}`

      console.log("Loading exchange program with ID:", exchangeId)

      // Load exchange program data from API
      const response = await fetch(`/api/manager/electives/exchange/${exchangeId}`)
      if (!response.ok) {
        const errorData = await response.json()
        // Redirect to login on authentication errors
        if (errorData.error === "Authentication failed") {
          router.push("/manager/login")
          return
        }
        throw new Error(errorData.error || "Failed to load exchange program")
      }

      const data = await response.json()
      console.log("Exchange program loaded:", data)

      // Cache the data
      setCachedData(cacheKey, data)
      setCachedData(selectionsCacheKey, data.studentSelections || [])

      setExchangeProgram(data)
      setUniversities(data.universities || [])
      setStudentSelections(data.studentSelections || [])
    } catch (error) {
      console.error("Error loading data:", error)
      setError(error instanceof Error ? error.message : "Failed to load exchange program data")
      toast({
        title: "Error",
        description: "Failed to load exchange program data",
        variant: "destructive",
      })
    }
  }

  // Calculate enrollment count for each university (pending + approved)
  const getUniversityEnrollment = (universityId: string) => {
    const count = studentSelections.filter(
      (selection) =>
        selection.selected_university_ids &&
        selection.selected_university_ids.includes(universityId) &&
        (selection.status === "approved" || selection.status === "pending"),
    ).length
    console.log(`University ${universityId} enrollment:`, count)
    return count
  }

  // Get total students enrolled (both pending and approved)
  const getTotalStudentsEnrolled = () => {
    const count = studentSelections.filter(
      (selection) => selection.status === "approved" || selection.status === "pending",
    ).length
    console.log("Total students enrolled:", count)
    return count
  }

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
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-200" suppressHydrationWarning>
            {t("manager.exchangeDetails.draft", "Draft")}
          </Badge>
        )
      case "published":
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200" suppressHydrationWarning>
            {t("manager.exchangeDetails.published", "Published")}
          </Badge>
        )
      case "closed":
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-800 hover:bg-gray-100 border-gray-200" suppressHydrationWarning>
            {t("manager.exchangeDetails.closed", "Closed")}
          </Badge>
        )
      case "archived":
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200" suppressHydrationWarning>
            {t("manager.exchangeDetails.archived", "Archived")}
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // Helper function to get selection status badge
  const getSelectionStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-200">
            <CheckCircle className="mr-1 h-3 w-3" />
            Approved
          </Badge>
        )
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-200">
            <Clock className="mr-1 h-3 w-3" />
            Pending
          </Badge>
        )
      case "rejected":
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900 dark:text-red-200">
            <XCircle className="mr-1 h-3 w-3" />
            Rejected
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // Function to export university selection data to CSV
  const exportUniversityToCSV = async (university: University) => {
    try {
      const selectionData = await getUniversitySelectionData(university.id, params.id as string)

      // Define column headers based on language
      const headers = {
        en: ["Student Name", "Email", "Status", "Selection Date"],
        ru: ["Имя студента", "Электронная почта", "Статус", "Дата выбора"],
      }

      // Create CSV content
      let csvContent = headers[language as keyof typeof headers].map((header) => `"${header}"`).join(",") + "\n"

      // Add data rows
      selectionData.forEach((selection) => {
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
      const fileName = `university_${university.name.replace(/\s+/g, "_")}_selections_${language}.csv`

      link.setAttribute("href", url)
      link.setAttribute("download", fileName)
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: "Success",
        description: `University selection data exported successfully`,
      })
    } catch (error) {
      console.error("Error exporting university data:", error)
      toast({
        title: "Error",
        description: "Failed to export university data",
        variant: "destructive",
      })
    }
  }

  // Function to download student statement
  const downloadStudentStatement = async (studentName: string, statementUrl: string | null) => {
    if (!statementUrl) {
      toast({
        title: "Statement not available",
        description: `No statement file available for ${studentName}`,
      })
      return
    }

    try {
      const fileData = await downloadStatementFile(statementUrl)

      // Create blob and download
      const blob = new Blob([fileData], { type: "application/pdf" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")

      link.setAttribute("href", url)
      link.setAttribute("download", `${studentName.replace(/\s+/g, "_")}_statement.pdf`)
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: "Download successful",
        description: "Statement file downloaded successfully",
      })
    } catch (error) {
      console.error("Error downloading statement:", error)
      toast({
        title: "Error",
        description: "Failed to download statement file",
        variant: "destructive",
      })
    }
  }

  // Function to export all student selections to CSV
  const exportStudentSelectionsToCSV = () => {
    // Create CSV header with translated column names
    const csvHeader = `"${language === "ru" ? "Имя студента" : "Student Name"}","${language === "ru" ? "Электронная почта" : "Email"}","${language === "ru" ? "Выбранные университеты" : "Selected Universities"}","${language === "ru" ? "Дата выбора" : "Selection Date"}","${language === "ru" ? "Статус" : "Status"}","${language === "ru" ? "Заявление URL" : "Statement URL"}"\n`

    // Create CSV content with translated status
    const selectionsContent = studentSelections
      .map((selection) => {
        // Get university names for selected universities
        const selectedUniversityNames =
          selection.selected_university_ids
            ?.map((id) => {
              const university = universities.find((u) => u.id === id)
              return university
                ? language === "ru" && university.name_ru
                  ? university.name_ru
                  : university.name
                : "Unknown"
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
        return `"${selection.profiles?.full_name || "N/A"}","${selection.profiles?.email || "N/A"}","${selectedUniversityNames}","${formatDate(selection.created_at)}","${translatedStatus}","${statementUrl}"`
      })
      .join("\n")

    // Combine header and content
    const csv = csvHeader + selectionsContent

    // Create and download the file
    const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    const fileName = `student_selections_${exchangeProgram?.name.replace(/\s+/g, "_")}_${language}.csv`

    link.setAttribute("href", url)
    link.setAttribute("download", fileName)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Function to handle approve/reject actions
  const handleStatusChange = async (selectionId: string, newStatus: "approved" | "rejected", studentName: string) => {
    try {
      await updateSelectionStatus(selectionId, newStatus)

      // Update local state
      setStudentSelections((prev) =>
        prev.map((selection) => (selection.id === selectionId ? { ...selection, status: newStatus } : selection)),
      )

      toast({
        title: `Selection ${newStatus}`,
        description: `Selection ${newStatus} for ${studentName}`,
      })
    } catch (error) {
      console.error(`Error ${newStatus} selection:`, error)
      toast({
        title: "Error",
        description: `Failed to ${newStatus} selection`,
        variant: "destructive",
      })
    }
  }

  // Function to handle edit save
  const handleEditSave = async () => {
    if (!editingStudent) return

    setIsSaving(true)
    try {
      await updateStudentSelection(
        editingStudent.id,
        editSelectedUniversities,
        editStatus as "approved" | "rejected" | "pending",
      )

      // Update local state
      setStudentSelections((prev) =>
        prev.map((selection) =>
          selection.id === editingStudent.id
            ? { ...selection, selected_university_ids: editSelectedUniversities, status: editStatus }
            : selection,
        ),
      )

      setEditDialogOpen(false)
      setEditingStudent(null)
      setEditStatus("")
      setEditSelectedUniversities([])

      toast({
        title: "Selection updated",
        description: `Student selection updated successfully`,
      })
    } catch (error) {
      console.error("Error updating selection:", error)
      toast({
        title: "Error",
        description: "Failed to update selection",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Function to handle university selection change in edit dialog
  const handleUniversityToggle = (universityId: string, checked: boolean) => {
    if (checked) {
      setEditSelectedUniversities((prev) => [...prev, universityId])
    } else {
      setEditSelectedUniversities((prev) => prev.filter((id) => id !== universityId))
    }
  }

  // Filter students based on search term
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
      <DashboardLayout userRole={UserRole.PROGRAM_MANAGER}>
        <div className="space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600">{t("manager.exchangeDetails.errorLoadingData", "Error Loading Data")}</h1>
            <p className="text-muted-foreground mt-2">{error}</p>
            <Button onClick={loadData} className="mt-4">
              Try Again
            </Button>
          </div>
        </div>
      </DashboardLayout>
    )
  }


  if (loading) {
    return (
      <DashboardLayout userRole={UserRole.PROGRAM_MANAGER}>
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
    <DashboardLayout userRole={UserRole.PROGRAM_MANAGER}>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-2">
            <Link href="/manager/electives/exchange">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {exchangeProgram ? (language === "ru" && exchangeProgram.name_ru ? exchangeProgram.name_ru : exchangeProgram.name) : "Loading..."}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {exchangeProgram && getStatusBadge(exchangeProgram.status)}
            <Button variant="outline" size="sm" asChild>
              <Link href={`/manager/electives/exchange/${params.id as string}/edit`}>
                <Edit className="mr-2 h-4 w-4" />
                {t("manager.exchangeDetails.edit", "Edit")}
              </Link>
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("manager.exchangeDetails.programDetails", "Program Details")}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="font-medium">{t("manager.exchangeDetails.deadline", "Deadline")}:</dt>
                <dd>{exchangeProgram?.deadline ? formatDate(exchangeProgram.deadline, language === "ru" ? "ru-RU" : "en-US") : t("manager.exchangeDetails.loading", "Loading...")}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium">{t("manager.exchangeDetails.maxSelections", "Max Selections")}:</dt>
                <dd>{exchangeProgram?.max_selections || 0} {t("manager.exchangeDetails.universities", "universities")}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium">{t("manager.exchangeDetails.universitiesTab", "Universities")}:</dt>
                <dd>{universities.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium">{t("manager.exchangeDetails.studentsEnrolled", "Students Enrolled")}:</dt>
                <dd>{getTotalStudentsEnrolled()}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium">{t("manager.exchangeDetails.created", "Created")}:</dt>
                <dd>{exchangeProgram?.created_at ? formatDate(exchangeProgram.created_at) : t("manager.exchangeDetails.loading", "Loading...")}</dd>
              </div>
              {exchangeProgram?.description && (
                <div className="flex flex-col gap-1">
                  <dt className="font-medium">{t("manager.exchangeDetails.description", "Description")}:</dt>
                  <dd className="text-sm text-muted-foreground">
                    {language === "ru" && exchangeProgram.description_ru
                      ? exchangeProgram.description_ru
                      : exchangeProgram.description}
                  </dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="universities">{t("manager.exchangeDetails.universitiesTab", "Universities")}</TabsTrigger>
            <TabsTrigger value="students">{t("manager.exchangeDetails.studentsTab", "Student Selections")}</TabsTrigger>
          </TabsList>
          <TabsContent value="universities" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>{t("manager.exchangeDetails.universitiesTab", "Universities")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <table className="w-full">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="py-3 px-4 text-left text-sm font-medium">{t("manager.exchangeDetails.name", "Name")}</th>
                          <th className="py-3 px-4 text-left text-sm font-medium">{t("manager.exchangeDetails.country", "Country")}</th>
                          <th className="py-3 px-4 text-left text-sm font-medium">{t("manager.exchangeDetails.enrollment", "Enrollment")}</th>
                          <th className="py-3 px-4 text-center text-sm font-medium">{t("manager.exchangeDetails.export", "Export")}</th>
                        </tr>
                      </thead>
                    <tbody>
                      {universities.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-muted-foreground">
                            {t("manager.exchangeDetails.noUniversities", "No universities configured for this exchange program")}
                          </td>
                        </tr>
                      ) : (
                        universities.map((university, index) => {
                          const currentEnrollment = getUniversityEnrollment(university.id)

                          return (
                            <tr key={university.id || `university-${index}`} className="border-b">
                              <td className="py-3 px-4 text-sm">
                                {language === "ru" && university.name_ru ? university.name_ru : university.name}
                              </td>
                              <td className="py-3 px-4 text-sm">
                                {university.country}
                              </td>
                              <td className="py-3 px-4 text-sm">
                                <Badge
                                  variant={currentEnrollment >= university.max_students ? "destructive" : "secondary"}
                                >
                                  {currentEnrollment}/{university.max_students}
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
                                  {t("manager.exchangeDetails.download", "Download")}
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
                  <CardTitle>{t("manager.exchangeDetails.studentSelections", "Student Selections")}</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input
                      type="search"
                      placeholder={t("manager.exchangeDetails.searchStudents", "Search students...")}
                      className="h-10 w-full rounded-md border border-input bg-background pl-8 pr-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:w-[200px]"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Button variant="outline" size="sm" onClick={exportStudentSelectionsToCSV}>
                    <Download className="mr-2 h-4 w-4" />
                    {t("manager.exchangeDetails.exportAll", "Export All")}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="py-3 px-4 text-left text-sm font-medium">{t("manager.exchangeDetails.name", "Name")}</th>
                        <th className="py-3 px-4 text-left text-sm font-medium">{t("manager.exchangeDetails.email", "Email")}</th>
                        <th className="py-3 px-4 text-left text-sm font-medium">{t("manager.exchangeDetails.selectionDate", "Selection Date")}</th>
                        <th className="py-3 px-4 text-left text-sm font-medium">{t("manager.exchangeDetails.status", "Status")}</th>
                        <th className="py-3 px-4 text-center text-sm font-medium">{t("manager.exchangeDetails.statement", "Statement")}</th>
                        <th className="py-3 px-4 text-center text-sm font-medium">{t("manager.exchangeDetails.view", "View")}</th>
                        <th className="py-3 px-4 text-center text-sm font-medium">{t("manager.exchangeDetails.actions", "Actions")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudentSelections.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-muted-foreground">
                            {searchTerm ? t("manager.exchangeDetails.noStudentsFound", "No students found matching your search") : t("manager.exchangeDetails.noStudentSelections", "No student selections yet")}
                          </td>
                        </tr>
                      ) : (
                        filteredStudentSelections.map((selection, index) => {
                          return (
                            <tr key={selection.id || `selection-${index}`} className="border-b">
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
                                  <DialogTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={() => setSelectedStudent(selection)}>
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-2xl">
                                    <DialogHeader>
                                      <DialogTitle>{t("manager.exchangeDetails.studentSelectionDetails", "Student Selection Details")}</DialogTitle>
                                    </DialogHeader>
                                    {selectedStudent && (
                                      <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                          <div>
                                            <Label className="text-sm font-medium">{t("manager.exchangeDetails.studentDetails", "Student Name")}</Label>
                                            <p className="text-sm">{selectedStudent.profiles?.full_name || "N/A"}</p>
                                          </div>
                                          <div>
                                            <Label className="text-sm font-medium">{t("manager.exchangeDetails.email", "Email")}</Label>
                                            <p className="text-sm">{selectedStudent.profiles?.email || "N/A"}</p>
                                          </div>
                                          <div>
                                            <Label className="text-sm font-medium">{t("manager.exchangeDetails.selectionDate", "Selection Date")}</Label>
                                            <p className="text-sm">{formatDate(selectedStudent.created_at)}</p>
                                          </div>
                                          <div>
                                            <Label className="text-sm font-medium">{t("manager.exchangeDetails.status", "Status")}</Label>
                                            <div className="mt-1">
                                              {getSelectionStatusBadge(selectedStudent.status)}
                                            </div>
                                          </div>
                                        </div>
                                        <div>
                                          <Label className="text-sm font-medium">{t("manager.exchangeDetails.selectedUniversities", "Selected Universities")}</Label>
                                          <div className="mt-2 space-y-2">
                                            {selectedStudent.selected_university_ids?.map((univId, index) => {
                                              const university = universities.find((u) => u.id === univId)
                                              return (
                                                <div
                                                  key={univId || `selected-univ-${index}`}
                                                  className="flex items-center justify-between p-2 border rounded"
                                                >
                                                  <span className="text-sm">
                                                    {university
                                                      ? language === "ru" && university.name_ru
                                                        ? university.name_ru
                                                        : university.name
                                                      : "Unknown University"}
                                                  </span>
                                                  {university && (
                                                    <span className="text-xs text-muted-foreground">
                                                      {university.country}
                                                    </span>
                                                  )}
                                                </div>
                                              )
                                            })}
                                          </div>
                                        </div>
                                        {selectedStudent.statement_url && (
                                          <div>
                                            <Label className="text-sm font-medium">{t("manager.exchangeDetails.statement", "Statement")}</Label>
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
                                                Download Statement
                                              </Button>
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => window.open(selectedStudent.statement_url!, "_blank")}
                                              >
                                                <ExternalLink className="h-4 w-4 mr-2" />
                                                View Online
                                              </Button>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </DialogContent>
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
                                        setEditSelectedUniversities(selection.selected_university_ids || [])
                                        setEditDialogOpen(true)
                                      }}
                                    >
                                      <Edit className="mr-2 h-4 w-4" />
                                      {t("manager.exchangeDetails.edit", "Edit")}
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
                                          {t("manager.exchangeDetails.approve", "Approve")}
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
                                          {t("manager.exchangeDetails.reject", "Reject")}
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

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t("manager.exchangeDetails.editStudentSelection", "Edit Student Selection")}</DialogTitle>
            </DialogHeader>
            {editingStudent && (
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Student</Label>
                  <p className="text-sm">{editingStudent.profiles?.full_name || "N/A"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Selected Universities</Label>
                  <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
                    {universities.map((university, index) => (
                      <div key={university.id || `edit-univ-${index}`} className="flex items-center space-x-2">
                        <Checkbox
                          id={university.id}
                          checked={editSelectedUniversities.includes(university.id)}
                          onCheckedChange={(checked) => handleUniversityToggle(university.id, checked as boolean)}
                        />
                        <Label htmlFor={university.id} className="text-sm">
                          {language === "ru" && university.name_ru ? university.name_ru : university.name} -{" "}
                          {university.country}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={editStatus} onValueChange={setEditStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("manager.exchangeDetails.selectStatus", "Select status")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">{t("manager.exchangeDetails.pending", "Pending")}</SelectItem>
                      <SelectItem value="approved">{t("manager.exchangeDetails.approved", "Approved")}</SelectItem>
                      <SelectItem value="rejected">{t("manager.exchangeDetails.rejected", "Rejected")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                    {t("manager.exchangeDetails.cancel", "Cancel")}
                  </Button>
                  <Button onClick={handleEditSave} disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t("manager.exchangeDetails.saving", "Saving...")}
                      </>
                    ) : (
                      t("manager.exchangeDetails.saveChanges", "Save Changes")
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
