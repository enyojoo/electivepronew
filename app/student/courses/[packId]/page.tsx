"use client"

import type React from "react"
import { use, useEffect, useState, useCallback } from "react"
import {
  Download,
  CheckCircle,
  Clock,
  Info,
  BookOpen,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  FileText,
  UploadCloud,
  Users,
} from "lucide-react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { UserRole, SelectionStatus } from "@/lib/types"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter as ShadDialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useLanguage } from "@/lib/language-context"
import { useToast } from "@/hooks/use-toast"
import { uploadStatement } from "@/lib/file-utils"
import { createClient } from "@supabase/supabase-js"
import { useCachedStudentProfile } from "@/hooks/use-cached-student-profile"
import { PageSkeleton } from "@/components/ui/page-skeleton"
import { cancelCourseSelection } from "@/app/actions/student-selections"
import { getCachedData, setCachedData, invalidateCache, getForceRefreshFlag, clearForceRefreshFlag } from "@/lib/cache-utils"
import { ModernFileUploader } from "@/components/modern-file-uploader"

// Cache constants - make them pack-specific and group-specific
const CACHE_EXPIRY = 60 * 60 * 1000 // 60 minutes


// Assuming these types/enums are defined elsewhere and passed as props or imported
// For example:
// import { ElectivePack, Course, CourseSelection, UserProfile, SelectionStatus } from '@/types';
// import { useTranslation } from 'react-i18next'; // Or your i18n solution

// Mock types for demonstration if not available
// enum SelectionStatus {
//   DRAFT = "draft",
//   PENDING = "pending",
//   APPROVED = "approved",
//   REJECTED = "rejected",
// }

type ElectivePack = {
  id: string
  name: string
  max_selections: number
  status: "draft" | "published" | "archived" // Assuming status for the pack itself
  syllabus_template_url?: string | null // Path to template in Supabase storage
  // ... other properties
}

type Course = {
  id: string
  name: string
  name: string
  name_ru: string
  instructor_en: string
  instructor_ru: string
  description: string
  description_ru: string
  max_students: number | null | undefined
  current_students: number | null | undefined
  teacher: string
  // ... other properties
}

type CourseSelection = {
  id: string
  student_id: string
  elective_courses_id: string
  selected_course_ids: string[]
  status: SelectionStatus
  statement_url?: string | null // Path to student's uploaded statement in Supabase storage
  // ... other properties
}

type UserProfile = {
  id: string
  // ... other properties
}

interface ElectivePageProps {
  params: {
    packId: string
  }
}

interface ElectivePackPageClientProps {
  electiveData: ElectivePack
  courses: Course[] // Assuming courses are also passed if needed for other parts
  existingSelection: CourseSelection | null
  profile: UserProfile // Student's profile
  // packId: string // Already in electiveData.id
}

// Utility to get filename from a path
const getFileNameFromPath = (path: string | null | undefined): string | null => {
  if (!path) return null
  const name = path.substring(path.lastIndexOf("/") + 1)
  try {
    return decodeURIComponent(name)
  } catch (e) {
    return name // Fallback if decoding fails
  }
}

export default function ElectivePage({ params }: ElectivePageProps) {
  const { t, language } = useLanguage()
  const { toast } = useToast()
  const { profile, isLoading: profileLoading, error: profileError } = useCachedStudentProfile()

  const resolvedParams = use(params)
  const packId = resolvedParams.packId

  // Helper function to get cached data synchronously
  const getCachedCourseData = (packId: string) => {
    if (typeof window !== "undefined") {
      try {
        // Check all possible course cache keys (group-specific)
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && key.startsWith("studentCourseDetail")) {
            const cached = getCachedData(key)
            if (cached && cached.id === packId) {
              console.log("CourseDetailPage: Found cached course data for packId:", packId)
              return cached
            }
          }
        }
      } catch (e) {
        // Ignore cache errors
      }
    }
    return null
  }

  const getCachedCourses = (packId: string) => {
    if (typeof window !== "undefined") {
      try {
        // Check all possible course cache keys (group-specific)
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && key.startsWith("studentCourseDetail")) {
            const cached = getCachedData(key)
            if (cached && cached.id === packId && cached.courses) {
              console.log("CourseDetailPage: Found cached courses data for packId:", packId)
              return cached.courses
            }
          }
        }
      } catch (e) {
        // Ignore cache errors
      }
    }
    return []
  }

  const getCachedSelection = (packId: string) => {
    if (typeof window !== "undefined") {
      try {
        // Check all possible selection cache keys (group-specific)
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && key.startsWith("studentCourseSelections")) {
            const cached = getCachedData(key)
            if (cached && cached.elective_courses_id === packId) {
              console.log("CourseDetailPage: Found cached selection data for packId:", packId)
              return cached
            }
          }
        }
      } catch (e) {
        // Ignore cache errors
      }
    }
    return null
  }

  const getCachedSelectedIds = (packId: string) => {
    if (typeof window !== "undefined") {
      try {
        // Check all possible selection cache keys (group-specific)
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && key.startsWith("studentCourseSelections")) {
            const cached = getCachedData(key)
            if (cached && cached.elective_courses_id === packId && cached.selected_course_ids) {
              console.log("CourseDetailPage: Found cached selected IDs for packId:", packId)
              return cached.selected_course_ids
            }
          }
        }
      } catch (e) {
        // Ignore cache errors
      }
    }
    return []
  }

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [studentName, setStudentName] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [viewingCourse, setViewingCourse] = useState<any>(null)
  const [uploadedStatement, setUploadedStatement] = useState<File | null>(null)
  const [isUploadingStatement, setIsUploadingStatement] = useState(false)
  const [downloadingStatement, setDownloadingStatement] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isLoadingPage, setIsLoadingPage] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)

  // Initialize with cached data synchronously (like list pages)
  const [electiveCourseData, setElectiveCourseData] = useState<any>(() => getCachedCourseData(packId))
  const [individualCourses, setIndividualCourses] = useState<any[]>(() => getCachedCourses(packId))
  const [existingSelectionRecord, setExistingSelectionRecord] = useState<any>(() => getCachedSelection(packId))
  const [selectedIndividualCourseIds, setSelectedIndividualCourseIds] = useState<string[]>(() => getCachedSelectedIds(packId))

  const loadData = useCallback(async (forceRefresh = false) => {
    if (profileLoading) return
    if (profileError) {
      setFetchError(`Failed to load profile: ${profileError}`)
      setIsLoadingPage(false)
      return
    }
    if (!profile?.id) {
      setFetchError(t("student.courses.profileNotLoaded"))
      setIsLoadingPage(false)
      return
    }

    if (!profile.group?.id) {
      setFetchError(t("student.courses.groupInfoMissing"))
      setIsLoadingPage(false)
      return
    }

    // Use group-specific cache keys
    const cacheKey = `studentCourseDetail_${profile.group.id}_${packId}`
    const selectionsCacheKey = `studentCourseSelections_${profile.group.id}_${packId}`

    // Check if we need to force refresh
    const shouldForceRefresh = forceRefresh || getForceRefreshFlag('forceRefreshStudentCourses')
    if (shouldForceRefresh) {
      clearForceRefreshFlag('forceRefreshStudentCourses')
      invalidateCache(cacheKey)
      invalidateCache(selectionsCacheKey)
    }

    // Load cached data first
    const cachedData = getCachedData(cacheKey)
    const cachedSelections = getCachedData(selectionsCacheKey)
    const hasCachedData = cachedData && cachedSelections

    // Only show loading if we don't have cached data or need to force refresh
    if (!hasCachedData || shouldForceRefresh) {
      setIsLoadingPage(true)
    }

    // If we have cached data and don't need to force refresh, use it
    if (cachedData && cachedSelections && !shouldForceRefresh) {
      setElectiveCourseData(cachedData)
      setIndividualCourses(cachedData.courses || [])
      setExistingSelectionRecord(cachedSelections)
      setSelectedIndividualCourseIds(cachedSelections.selected_course_ids || [])
      setIsLoadingPage(false)
      return
    }

    setIsLoadingPage(true)
    setFetchError(null)

    try {
      // Use API route instead of direct database queries (same as list page)
      console.log("CourseDetailPage: Fetching data from API for packId:", packId)
      const response = await fetch(`/api/student/electives/course/${packId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        // Redirect to login on authentication errors
        if (errorData.error === "Authentication failed" || errorData.error === "Unauthorized") {
          window.location.href = "/student/login"
          return
        }
        throw new Error(errorData.error || `API error: ${response.status}`)
      }

      const data = await response.json()
      console.log("CourseDetailPage: API data received:", data)

      // Set the course pack data
      if (data.course) {
        setElectiveCourseData(data.course)
        setIndividualCourses(data.courses || [])
      }

      // Set the selection data
      if (data.selection) {
        setExistingSelectionRecord(data.selection)
        setSelectedIndividualCourseIds(data.selection.selected_course_ids || [])
      } else {
        setExistingSelectionRecord(null)
        setSelectedIndividualCourseIds([])
      }

      // Cache the data with group-specific keys
      const cacheData = { ...data.course, courses: data.courses || [] }
      setCachedData(cacheKey, cacheData)
      setCachedData(selectionsCacheKey, data.selection)
    } catch (error: any) {
      setFetchError(error.message || t("student.courses.failedToLoad"))
      toast({ title: "Error", description: error.message, variant: "destructive" })

      // On error, keep cached data if it exists
      if (!hasCachedData) {
        setElectiveCourseData(null)
        setIndividualCourses([])
        setExistingSelectionRecord(null)
        setSelectedIndividualCourseIds([])
      }
    } finally {
      setIsLoadingPage(false)
    }
  }, [profile, profileLoading, profileError, packId, toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Set up real-time subscriptions for instant updates
  useEffect(() => {
    if (!profile?.id || !packId) return

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

    const channel = supabase
      .channel(`student-course-${packId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "elective_courses", filter: `id=eq.${packId}` },
        async () => {
          console.log("Elective course pack changed, reloading data")
          await loadData(true) // Force refresh
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "courses" },
        async () => {
          console.log("Courses changed, reloading course data")
          await loadData(true) // Force refresh
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "course_selections", filter: `student_id=eq.${profile.id}` },
        async () => {
          console.log("Student selections changed, reloading selections")
          // Reload selections only with force refresh
          await loadData(true)
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("✓ Student course detail page subscribed to real-time changes")
        } else if (status === "CHANNEL_ERROR") {
          console.error("✗ Error subscribing to real-time changes on student course detail page")
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile?.id, packId, loadData])

  const toggleCourseSelection = (individualCourseId: string) => {
    setSelectedIndividualCourseIds((prevSelected) => {
      if (prevSelected.includes(individualCourseId)) {
        return prevSelected.filter((id) => id !== individualCourseId)
      } else {
        // Check if course is at capacity
        const course = individualCourses.find((c) => c.id === individualCourseId)
        if (course && course.max_students && course.current_students >= course.max_students) {
          toast({
            title: t("student.courses.courseAtCapacity"),
            description: t("student.courses.courseAtCapacityDesc", { courseName: course.name }),
            variant: "destructive",
          })
          return prevSelected
        }

        if (prevSelected.length < (electiveCourseData?.max_selections || Number.POSITIVE_INFINITY)) {
          return [...prevSelected, individualCourseId]
        }
        toast({
          title: t("student.courses.maxSelectionsReached"),
          description: t("student.courses.maxSelectionsReachedDesc", { count: electiveCourseData?.max_selections }),
          variant: "warning",
        })
        return prevSelected
      }
    })
  }

  const handleSubmit = async () => {
    const statementRequired = !!electiveCourseData?.syllabus_template_url

    if (!profile?.id) {
      toast({ title: t("student.courses.missingInformation"), description: t("student.courses.profileNotLoadedShort"), variant: "destructive" })
      return
    }
    if (statementRequired && !uploadedStatement && !existingSelectionRecord?.statement_url) {
      toast({ title: t("student.courses.missingInformation"), description: t("student.courses.statementRequired"), variant: "destructive" })
      return
    }
    if (selectedIndividualCourseIds.length === 0 && (electiveCourseData?.max_selections || 0) > 0) {
      toast({ title: t("student.courses.noCoursesSelected"), description: t("student.courses.selectAtLeastOne"), variant: "destructive" })
      return
    }
    if (selectedIndividualCourseIds.length > (electiveCourseData?.max_selections || Number.POSITIVE_INFINITY)) {
      toast({
        title: "Too Many Courses",
        description: `You can select at most ${electiveCourseData?.max_selections} courses.`,
        variant: "destructive",
      })
      return
    }

    setSubmitting(true)
    try {
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
      let statementUrlToSave = existingSelectionRecord?.statement_url

      if (uploadedStatement) {
        setIsUploadingStatement(true)
        statementUrlToSave = await uploadStatement(uploadedStatement, profile.id, packId)
        setIsUploadingStatement(false)
      }

      if (statementRequired && !statementUrlToSave) {
        throw new Error(t("student.courses.statementRequiredNotUploaded"))
      }

      const selectionPayload: any = {
        student_id: profile.id,
        elective_courses_id: packId,
        status: SelectionStatus.PENDING,
        selected_course_ids: selectedIndividualCourseIds, // Store the selected course IDs
        authorized_by: studentName.trim(),
      }
      if (statementUrlToSave) {
        selectionPayload.statement_url = statementUrlToSave
      }

      if (existingSelectionRecord) {
        const { error } = await supabase
          .from("course_selections")
          .update(selectionPayload)
          .eq("id", existingSelectionRecord.id)
        if (error) throw error
      } else {
        const { data: newSelection, error } = await supabase.from("course_selections").insert(selectionPayload).select().single()
        if (error) throw error

        // Send course selection submitted email (non-blocking)
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
        fetch(`${baseUrl}/api/send-email-notification`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "course-selection-submitted",
            selectionId: newSelection.id,
            language,
          }),
        }).catch((error) => {
          console.error("Failed to send course selection email:", error)
        })

        // Send admin notification (non-blocking)
        fetch(`${baseUrl}/api/send-email-notification`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "new-selection-notification",
            selectionId: newSelection.id,
            selectionType: "course",
            language,
          }),
        }).catch((error) => {
          console.error("Failed to send admin notification:", error)
        })
      }

      toast({ title: "Selection submitted", description: "Your course selection has been submitted successfully." })
      window.location.href = "/student/courses"
    } catch (error: any) {
      console.error("Submission error:", error)
      toast({ title: "Submission failed", description: error.message || "An error occurred.", variant: "destructive" })
    } finally {
      setSubmitting(false)
      setIsUploadingStatement(false)
      setConfirmDialogOpen(false)
    }
  }

  const handleFileUpload = async (file: File) => {
    if (file) {
      setIsUploadingStatement(true)
      setUploadProgress(0)

      try {
        // Simulate upload progress (Supabase doesn't provide progress callbacks easily)
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => {
            const newProgress = prev + Math.random() * 15
            return newProgress > 90 ? 90 : newProgress
          })
        }, 200)

        // Upload the file using the statement upload function
        const statementUrl = await uploadStatement(file, profile?.id || '', packId)

        clearInterval(progressInterval)
        setUploadProgress(100)

        setUploadedStatement(file)
        setExistingSelectionRecord(prev => prev ? { ...prev, statement_url: statementUrl } : null)

        toast({ title: "Upload successful", description: `"${file.name}" has been uploaded.` })
      } catch (error: any) {
        console.error("Error uploading file:", error)
        toast({
          title: "Upload failed",
          description: error.message || "Failed to upload file",
          variant: "destructive"
        })
      } finally {
        setIsUploadingStatement(false)
        setUploadProgress(0)
      }
    }
  }

  const handleDownloadStatementTemplate = async () => {
    if (!electiveCourseData?.syllabus_template_url) {
      toast({ title: "No template", description: "Statement template is not available.", variant: "destructive" })
      return
    }
    setDownloadingStatement(true)
    try {
      // Create a temporary anchor element to trigger download
      const link = document.createElement('a')
      link.href = electiveCourseData.syllabus_template_url
      link.download = '' // This will use the filename from the URL
      // Don't set target to avoid opening in new tab
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({ title: "Download started", description: "Statement template is being downloaded." })
    } catch (error) {
      // Fallback: open in new tab if download fails
      window.open(electiveCourseData.syllabus_template_url, '_blank')
      toast({ title: "Download started", description: "Statement template opened in new tab." })
    } finally {
      setDownloadingStatement(false)
    }
  }

  const formatDateDisplay = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString(language === "ru" ? "ru-RU" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const selectionProgress =
    electiveCourseData?.max_selections && electiveCourseData.max_selections > 0
      ? (selectedIndividualCourseIds.length / electiveCourseData.max_selections) * 100
      : 0

  const isDeadlinePassed = electiveCourseData?.deadline ? new Date(electiveCourseData.deadline) < new Date() : false
  const currentSelectionStatus = existingSelectionRecord?.status as SelectionStatus | undefined

  const getStatusAlert = () => {
    if (currentSelectionStatus === SelectionStatus.APPROVED) {
      return (
        <Alert className="bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-200">
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>{t("student.courses.selectionApproved")}</AlertTitle>
          <AlertDescription>{t("student.courses.selectionApprovedDesc")}</AlertDescription>
        </Alert>
      )
    }
    if (currentSelectionStatus === SelectionStatus.PENDING) {
      return (
        <Alert className="bg-yellow-50 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
          <Clock className="h-4 w-4" />
          <AlertTitle>{t("student.courses.selectionPending")}</AlertTitle>
          <AlertDescription>{t("student.courses.selectionPendingDesc")}</AlertDescription>
        </Alert>
      )
    }
    if (currentSelectionStatus === SelectionStatus.REJECTED) {
      return (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t("student.courses.selectionRejected")}</AlertTitle>
          <AlertDescription>{t("student.courses.selectionRejectedDesc")}</AlertDescription>
        </Alert>
      )
    }
    if (electiveCourseData?.status === "draft") {
      return (
        <Alert className="bg-gray-50 text-gray-800 dark:bg-gray-900 dark:text-gray-200">
          <Info className="h-4 w-4" />
          <AlertTitle>{t("student.courses.comingSoon")}</AlertTitle>
          <AlertDescription>{t("student.courses.comingSoonDesc")}</AlertDescription>
        </Alert>
      )
    }
    if (isDeadlinePassed) {
      return (
        <Alert variant="destructive">
          <Info className="h-4 w-4" />
          <AlertTitle>{t("student.courses.deadlinePassed")}</AlertTitle>
          <AlertDescription>{t("student.courses.deadlinePassedDesc")}</AlertDescription>
        </Alert>
      )
    }
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>{t("student.courses.selectionPeriodActive")}</AlertTitle>
        <AlertDescription>
          {t("student.courses.selectionUntil")} 11:59 PM{" "}
          {electiveCourseData?.deadline && formatDateDisplay(electiveCourseData.deadline)}.
        </AlertDescription>
      </Alert>
    )
  }

  if (profileLoading || isLoadingPage) {
    return (
      <DashboardLayout>
        <PageSkeleton />
      </DashboardLayout>
    )
  }
  if (fetchError) {
    return (
      <DashboardLayout>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error Loading Page</AlertTitle>
          <AlertDescription>{fetchError}</AlertDescription>
        </Alert>
      </DashboardLayout>
    )
  }
  if (!electiveCourseData) {
    return (
      <DashboardLayout>
        <div className="text-center">{t("student.courses.notFound")}</div>
      </DashboardLayout>
    )
  }

  const electivePackName =
    language === "ru" && electiveCourseData.name_ru ? electiveCourseData.name_ru : electiveCourseData.name
  const canSubmit =
    !isDeadlinePassed && electiveCourseData.status !== "draft" && currentSelectionStatus !== SelectionStatus.APPROVED

  const handleCancelSelection = async () => {
    if (!profile?.id || !electiveCourseData?.id) {
      toast({ title: "Error", description: "Cannot cancel selection. Missing information.", variant: "destructive" })
      return
    }
    if (!existingSelectionRecord) {
      toast({ title: "No Selection", description: "There is no selection to cancel.", variant: "destructive" })
      return
    }

    setIsCancelling(true)
    const formData = new FormData()
    formData.append("studentId", profile.id)
    formData.append("electiveCoursesId", electiveCourseData.id)

    const result = await cancelCourseSelection(formData)

    if (result.success) {
      toast({ title: "Selection Cancelled", description: result.message })
      setExistingSelectionRecord(null)
      setSelectedIndividualCourseIds([])
      setUploadedStatement(null)
      // await loadData(); // Optionally reload all data
    } else {
      toast({ title: "Cancellation Failed", description: result.error, variant: "destructive" })
    }
    setIsCancelling(false)
  }

  const statementRequiredForPack = !!electiveCourseData?.syllabus_template_url
  const isStatementHandled =
    !statementRequiredForPack || !!uploadedStatement || !!existingSelectionRecord?.statement_url
  const areCoursesSelected = selectedIndividualCourseIds.length > 0 || (electiveCourseData?.max_selections || 0) === 0

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/student/courses" passHref>
            <Button variant="outline" size="icon" aria-label={t("student.courses.backToCourses")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">{electivePackName}</h1>
          </div>
        </div>

        {getStatusAlert()}

        {individualCourses.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-sm sm:text-base md:text-lg">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  {t("student.courses.availableCourses")}
                </div>
                <Badge variant="secondary">
                  {t("student.courses.selected")} {selectedIndividualCourseIds.length} {t("student.courses.of")} {electiveCourseData?.max_selections || 0}
                </Badge>
              </CardTitle>
              <CardDescription>{t("student.courses.selectFromAvailable")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
            {individualCourses.map((course) => {
              const isSelected = selectedIndividualCourseIds.includes(course.id)
              const isAtCapacity = course.max_students && course.current_students >= course.max_students
              const isDisabledByMax =
                !isSelected &&
                selectedIndividualCourseIds.length >= (electiveCourseData.max_selections || Number.POSITIVE_INFINITY)
              const isDisabledByCapacity = !isSelected && isAtCapacity
              return (
                <Card
                  key={course.id}
                  className={`flex flex-col h-full transition-all hover:shadow-md ${
                    isSelected
                      ? currentSelectionStatus === SelectionStatus.APPROVED
                        ? "border-green-500 bg-green-50 dark:bg-green-950/50"
                        : currentSelectionStatus === SelectionStatus.PENDING
                          ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/50"
                          : "border-primary bg-primary/5 dark:bg-primary/10"
                      : "border-border"
                  } ${isDisabledByMax || isDisabledByCapacity ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start gap-2">
                      <CardTitle className="text-sm sm:text-base md:text-lg leading-tight">
                        {language === "ru" && course.name_ru ? course.name_ru : course.name}
                      </CardTitle>
                      {course.max_students !== null && course.max_students !== undefined && (
                        <span className="text-xs whitespace-nowrap text-muted-foreground bg-muted px-2 py-1 rounded-full flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {typeof course.current_students === "number" ? course.current_students : "?"}/
                          {course.max_students}
                        </span>
                      )}
                    </div>
                    <CardDescription className="text-xs sm:text-sm">
                      {language === "ru" && course.instructor_ru
                        ? course.instructor_ru
                        : course.instructor_en || course.teacher}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow pb-3">
                    <Button
                      variant="link"
                      size="sm"
                      className="p-0 h-auto text-sm text-primary hover:text-primary/80"
                      onClick={() => setViewingCourse(course)}
                    >
                      <BookOpen className="h-3.5 w-3.5 mr-1.5" />
                      {t("student.courses.viewDescription")}
                    </Button>
                  </CardContent>
                  {canSubmit && (
                    <CardFooter className="pt-0 border-t mt-auto pt-3">
                      <div className="flex items-center space-x-2 w-full">
                        <Checkbox
                          id={`course-${course.id}`}
                          checked={isSelected}
                          onCheckedChange={() => toggleCourseSelection(course.id)}
                          disabled={isDisabledByMax || isDisabledByCapacity || !canSubmit}
                          aria-label={t(
                            isSelected ? "student.courses.deselectCourse" : "student.courses.selectCourse",
                            {
                              courseName:
                                language === "ru" && course.name_ru ? course.name_ru : course.name_en || course.name,
                            },
                          )}
                        />
                        <Label
                          htmlFor={`course-${course.id}`}
                          className={`text-sm font-medium leading-none ${isDisabledByMax || isDisabledByCapacity || !canSubmit ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}
                        >
                          {isSelected ? t("student.courses.selected") : t("student.courses.select")}
                        </Label>
                      </div>
                    </CardFooter>
                  )}
                </Card>
              )
            })}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base md:text-lg">
                <BookOpen className="h-5 w-5 text-primary" />
                {t("student.courses.availableCourses")}
              </CardTitle>
              <CardDescription>{t("student.courses.selectFromAvailable")}</CardDescription>
            </CardHeader>
            <CardContent className="py-10 text-center">
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">{t("student.courses.noIndividualCourses")}</p>
            </CardContent>
          </Card>
        )}

        {statementRequiredForPack && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base md:text-lg">
                <FileText className="h-5 w-5 text-primary" />
                {t("student.statement.title")}
              </CardTitle>
              <CardDescription>{t("student.statement.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {electiveCourseData.syllabus_template_url && (
                <Button
                  variant="outline"
                  className="w-full sm:w-auto bg-transparent"
                  onClick={handleDownloadStatementTemplate}
                  disabled={downloadingStatement || electiveCourseData.status === "draft"}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {downloadingStatement ? t("student.statement.downloading") : t("student.statement.downloadTemplate")}
                </Button>
              )}
              <ModernFileUploader
                selectedFile={uploadedStatement}
                onFileSelect={(file) => {
                  if (file) {
                    handleFileUpload(file)
                  } else {
                    setUploadedStatement(null)
                  }
                }}
                isUploading={isUploadingStatement}
                uploadProgress={uploadProgress}
                accept=".pdf,.doc,.docx"
                maxSize={10}
                existingFileUrl={existingSelectionRecord?.statement_url}
                existingFileName="Previously uploaded statement"
              />

              {uploadedStatement && (
                <Alert variant="success">
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>{t("student.statement.fileReadyTitle")}</AlertTitle>
                  <AlertDescription>
                    {t("student.statement.fileReadyDesc", { fileName: uploadedStatement.name })}
                  </AlertDescription>
                </Alert>
              )}
              {existingSelectionRecord?.statement_url && !uploadedStatement && (
                <Alert variant="info">
                  <Info className="h-4 w-4" />
                  <AlertTitle>{t("student.statement.previouslyUploadedTitle")}</AlertTitle>
                  <AlertDescription>{t("student.statement.previouslyUploadedDesc")}</AlertDescription>
                  {/* Optionally, add a button to view/download the existing statement if URL is directly accessible */}
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {canSubmit && (
          <div className="flex flex-col sm:flex-row justify-end items-center gap-3 mt-8">
            {existingSelectionRecord && canSubmit && (
              <Button
                variant="outline"
                onClick={() => {
                  if (window.confirm(t("student.courses.confirmCancelSelection"))) {
                    handleCancelSelection()
                  }
                }}
                disabled={isCancelling || submitting}
                className="w-full sm:w-auto"
              >
                {isCancelling ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {t("student.courses.cancelSelection")}
              </Button>
            )}
            <Button
              onClick={() => {
                if (!areCoursesSelected && (electiveCourseData?.max_selections || 0) > 0) {
                  toast({ title: t("student.courses.selectMinOneCourse"), variant: "destructive" })
                } else if (!isStatementHandled) {
                  toast({
                    title: t("student.statement.requiredTitle"),
                    description: t("student.statement.requiredDesc"),
                    variant: "destructive",
                  })
                } else {
                  setConfirmDialogOpen(true)
                }
              }}
              disabled={submitting || isUploadingStatement || !areCoursesSelected || !isStatementHandled}
              className="w-full sm:w-auto px-8 py-3 text-base"
              size="lg"
            >
              {submitting ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : null}
              {existingSelectionRecord ? t("student.courses.updateSelection") : t("student.courses.confirmSelection")}
            </Button>
          </div>
        )}

        <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("student.courses.confirmYourSelection")}</DialogTitle>
              <DialogDescription>{t("student.courses.reviewSelection")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <h4 className="text-sm font-medium mb-2">{t("student.courses.selectedCourses")}:</h4>
                {selectedIndividualCourseIds.length > 0 ? (
                  <ul className="space-y-1 list-disc list-inside pl-1">
                    {selectedIndividualCourseIds.map((id) => {
                      const course = individualCourses.find((c) => c.id === id)
                      return (
                        <li key={id} className="text-sm">
                          {language === "ru" && course?.name_ru ? course.name_ru : course?.name_en || course?.name}
                        </li>
                      )
                    })}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">{t("student.courses.noCoursesSelectedYet")}</p>
                )}
              </div>
              {statementRequiredForPack && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="text-sm font-medium mb-2">{t("student.statement.title")}:</h4>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                    <span>
                      {uploadedStatement
                        ? t("student.statement.fileReadyToSubmit", {
                            fileName: uploadedStatement.name,
                            fileSize: Math.round(uploadedStatement.size / 1024),
                          })
                        : t("student.statement.previouslyUploadedWillBeUsed")}
                    </span>
                  </div>
                </div>
              )}
              <div className="space-y-2 pt-4 border-t mt-4">
                <Label htmlFor="student-name">
                  {t("student.courses.yourFullName")} ({t("student.courses.toAuthorize")})
                </Label>
                <Input
                  id="student-name"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder={t("student.courses.enterFullName")}
                  aria-required="true"
                />
              </div>
            </div>
            <ShadDialogFooter>
              <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={
                  !studentName.trim() ||
                  submitting ||
                  isUploadingStatement ||
                  !areCoursesSelected ||
                  !isStatementHandled
                }
              >
                {submitting || isUploadingStatement ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {t("student.courses.submitSelection")}
              </Button>
            </ShadDialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!viewingCourse} onOpenChange={(open) => !open && setViewingCourse(null)}>
          <DialogContent className="mx-auto max-w-[95vw] sm:max-w-lg">
            <DialogHeader className="text-left">
              <DialogTitle className="text-sm sm:text-base md:text-lg">
                {language === "ru" && viewingCourse?.name_ru
                  ? viewingCourse.name_ru
                  : viewingCourse?.name_en || viewingCourse?.name}
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                {language === "ru" && viewingCourse?.instructor_ru
                  ? viewingCourse.instructor_ru
                  : viewingCourse?.instructor_en || viewingCourse?.teacher}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 sm:space-y-4 py-3 sm:py-4">
              <div className="space-y-2">
                <h4 className="text-xs sm:text-sm font-medium">{t("student.courses.courseDescription")}</h4>
                <p className="text-xs sm:text-sm text-muted-foreground whitespace-pre-wrap">
                  {language === "ru" && viewingCourse?.description_ru
                    ? viewingCourse.description_ru
                    : viewingCourse?.description ||
                      viewingCourse?.description ||
                      t("student.courses.noDescriptionAvailable")}
                </p>
              </div>
            </div>
            <ShadDialogFooter>
              <Button variant="outline" onClick={() => setViewingCourse(null)}>
                {t("student.courses.close")}
              </Button>
            </ShadDialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
