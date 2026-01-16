"use client"

import type React from "react"
import { use, useEffect, useState, useCallback } from "react"
import {
  Download,
  CheckCircle,
  Clock,
  Info,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  FileText,
  UploadCloud,
  Globe,
  MapPin,
  ExternalLink,
  Users,
} from "lucide-react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { UserRole, SelectionStatus } from "@/lib/types"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"
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
import { cancelExchangeSelection } from "@/app/actions/student-exchange-selections"

// Cache constants
const EXCHANGE_DETAIL_CACHE_KEY = "studentExchangeDetail"
const EXCHANGE_SELECTIONS_CACHE_KEY = "studentExchangeSelections"
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

interface ExchangePageProps {
  params: {
    packId: string
  }
}

export default function ExchangePage({ params }: ExchangePageProps) {
  const { t, language } = useLanguage()
  const { toast } = useToast()
  const { profile, isLoading: profileLoading, error: profileError } = useCachedStudentProfile()

  const resolvedParams = use(params)
  const packId = resolvedParams.packId

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [studentName, setStudentName] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [viewingUniversity, setViewingUniversity] = useState<any>(null)
  const [uploadedStatement, setUploadedStatement] = useState<File | null>(null)
  const [isUploadingStatement, setIsUploadingStatement] = useState(false)
  const [downloadingStatement, setDownloadingStatement] = useState(false)
  const [isLoadingPage, setIsLoadingPage] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)

  const [exchangePackData, setExchangePackData] = useState<any>(null)
  const [universities, setUniversities] = useState<any[]>([])
  const [existingSelection, setExistingSelection] = useState<any>(null)
  const [selectedUniversityIds, setSelectedUniversityIds] = useState<string[]>([])

  const loadData = useCallback(async () => {
    if (profileLoading) return
    if (profileError) {
      setFetchError(`Failed to load profile: ${profileError}`)
      setIsLoadingPage(false)
      return
    }
    if (!profile?.id) {
      setFetchError(t("student.exchange.profileNotLoaded"))
      setIsLoadingPage(false)
      return
    }

    console.log("DEBUG: Student profile:", { id: profile.id, group: profile.group })
    if (!profile.group?.id) {
      console.log("DEBUG: Student has no group assigned")
      setFetchError(t("student.exchange.groupInfoMissing"))
      setIsLoadingPage(false)
      return
    }

    // Load cached data immediately on mount
    const cacheKey = `${EXCHANGE_DETAIL_CACHE_KEY}_${packId}`
    const selectionsCacheKey = `${EXCHANGE_SELECTIONS_CACHE_KEY}_${packId}`

    // Load cached data first
    const cachedData = getCachedData(cacheKey)
    const cachedSelections = getCachedData(selectionsCacheKey)

    if (cachedData) {
      setExchangePackData(cachedData)
      setUniversities(cachedData.universities || [])
    }

    if (cachedSelections) {
      setExistingSelection(cachedSelections)
      setSelectedUniversityIds(cachedSelections.selected_university_ids || [])
    }

    // Check if we need to fetch from API (no cached data or data is empty)
    const needsApiFetch = !cachedData || !cachedSelections

    if (!needsApiFetch) {
      setIsLoadingPage(false)
      return
    }

    setIsLoadingPage(true)
    setFetchError(null)

    try {
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

      // Fetch exchange pack data
      console.log("DEBUG: Querying elective_exchange with packId:", packId, "groupId:", profile.group.id)
      const { data: packData, error: packError } = await supabase
        .from("elective_exchange")
        .select("*")
        .eq("id", packId)
        .eq("group_id", profile.group.id)

      console.log("DEBUG: elective_exchange query result:", { data: packData, error: packError })

      if (packError) throw packError
      if (!packData || packData.length === 0) {
        console.log("DEBUG: No elective_exchange found, checking if packId exists with any group...")
        // Check if pack exists with any group
        const { data: anyPack } = await supabase
          .from("elective_exchange")
          .select("id, group_id, status")
          .eq("id", packId)
        console.log("DEBUG: Exchange pack with any group:", anyPack)
        throw new Error(t("student.exchange.programNotFound"))
      }
      if (packData.length > 1) throw new Error(t("student.exchange.multipleProgramsFound"))

      const exchangePackData = packData[0]
      setExchangePackData(exchangePackData)

      // Fetch universities using the UUIDs from the universities column
      const universityUuids = exchangePackData.universities || []
      if (universityUuids.length > 0) {
        const { data: fetchedUnis, error: unisError } = await supabase
          .from("universities")
          .select("*")
          .in("id", universityUuids)

        if (unisError) throw unisError

        // Fetch current student counts for each university (pending + approved)
        const universitiesWithCounts = await Promise.all(
          (fetchedUnis || []).map(async (university) => {
            const { count: currentStudents, error: countError } = await supabase
              .from("exchange_selections")
              .select("*", { count: "exact", head: true })
              .contains("selected_university_ids", [university.id])
              .in("status", ["pending", "approved"])

            if (countError) {
              console.error("Error fetching exchange selection count:", countError)
              return { ...university, current_students: 0 }
            }

            return { ...university, current_students: currentStudents || 0 }
          }),
        )

        setUniversities(universitiesWithCounts || [])
      } else {
        setUniversities([])
      }

      // Fetch existing selection
      const { data: selectionData, error: selectionError } = await supabase
        .from("exchange_selections")
        .select("*")
        .eq("student_id", profile.id)
        .eq("elective_exchange_id", packId)
        .maybeSingle()

      if (selectionError) throw selectionError
      setExistingSelection(selectionData)
      setSelectedUniversityIds(selectionData?.selected_university_ids || [])
    } catch (error: any) {
      setFetchError(error.message || "Failed to load exchange program details.")
      toast({ title: "Error", description: error.message, variant: "destructive" })
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
      .channel(`student-exchange-${packId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "elective_exchange", filter: `id=eq.${packId}` },
        async () => {
          console.log("Exchange program pack changed, reloading data")
          await loadData()
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "universities" },
        async () => {
          console.log("Universities changed, reloading university data")
          await loadData()
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "exchange_selections", filter: `student_id=eq.${profile.id}` },
        async () => {
          console.log("Student exchange selections changed, reloading selections")
          // Reload selections only
          const { data: selectionsData, error: selectionsError } = await supabase
            .from("exchange_selections")
            .select("*")
            .eq("student_id", profile.id)
            .eq("elective_exchange_id", packId)

          if (!selectionsError && selectionsData) {
            setExistingSelection(selectionsData[0] || null)
            setSelectedUniversityIds(selectionsData[0]?.selected_university_ids || [])
            setSelectionStatus(selectionsData[0]?.status || null)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile?.id, packId, loadData])

  const toggleUniversitySelection = (universityId: string) => {
    setSelectedUniversityIds((prevSelected) => {
      if (prevSelected.includes(universityId)) {
        return prevSelected.filter((id) => id !== universityId)
      } else {
        // Check if university is at capacity
        const university = universities.find((u) => u.id === universityId)
        if (university && university.max_students && university.current_students >= university.max_students) {
          toast({
            title: t("student.exchange.universityAtCapacity"),
            description: t("student.exchange.universityAtCapacityDesc", { universityName: university.name }),
            variant: "destructive",
          })
          return prevSelected
        }

        if (prevSelected.length < (exchangePackData?.max_selections || Number.POSITIVE_INFINITY)) {
          return [...prevSelected, universityId]
        }
        toast({
          title: t("student.exchange.maxSelectionsReached"),
          description: t("student.exchange.maxSelectionsReachedDesc", { count: exchangePackData?.max_selections }),
          variant: "warning",
        })
        return prevSelected
      }
    })
  }

  const handleSubmit = async () => {
    const statementRequired = !!exchangePackData?.statement_template_url

    if (!profile?.id) {
      toast({ title: t("student.courses.missingInformation"), description: t("student.courses.profileNotLoadedShort"), variant: "destructive" })
      return
    }
    if (statementRequired && !uploadedStatement && !existingSelection?.statement_url) {
      toast({ title: t("student.courses.missingInformation"), description: t("student.courses.statementRequired"), variant: "destructive" })
      return
    }
    if (selectedUniversityIds.length === 0) {
      toast({
        title: t("student.exchange.noUniversitiesSelected"),
        description: t("student.exchange.selectAtLeastOneUniversity"),
        variant: "destructive",
      })
      return
    }
    if (!studentName.trim()) {
      toast({
        title: t("student.courses.missingInformation"),
        description: t("student.exchange.enterFullName"),
        variant: "destructive",
      })
      return
    }

    setSubmitting(true)
    try {
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
      let statementUrlToSave = existingSelection?.statement_url

      if (uploadedStatement) {
        setIsUploadingStatement(true)
        statementUrlToSave = await uploadStatement(uploadedStatement, profile.id, packId)
        setIsUploadingStatement(false)
      }

      if (statementRequired && !statementUrlToSave) {
        throw new Error(t("student.exchange.statementRequiredNotUploaded"))
      }

      const selectionPayload: any = {
        student_id: profile.id,
        elective_exchange_id: packId,
        status: SelectionStatus.PENDING,
        selected_university_ids: selectedUniversityIds,
        authorized_by: studentName.trim(),
      }

      if (statementUrlToSave) {
        selectionPayload.statement_url = statementUrlToSave
      }

      if (existingSelection) {
        const { error } = await supabase
          .from("exchange_selections")
          .update(selectionPayload)
          .eq("id", existingSelection.id)
        if (error) throw error
      } else {
        const { data: newSelection, error } = await supabase.from("exchange_selections").insert(selectionPayload).select().single()
        if (error) throw error

        // Send exchange selection submitted email (non-blocking)
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
        fetch(`${baseUrl}/api/send-email-notification`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "exchange-selection-submitted",
            selectionId: newSelection.id,
            language,
          }),
        }).catch((error) => {
          console.error("Failed to send exchange selection email:", error)
        })

        // Send admin notification (non-blocking)
        fetch(`${baseUrl}/api/send-email-notification`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "new-selection-notification",
            selectionId: newSelection.id,
            selectionType: "exchange",
            language,
          }),
        }).catch((error) => {
          console.error("Failed to send admin notification:", error)
        })
      }

      toast({ title: "Selection submitted", description: "Your university selection has been submitted successfully." })
      window.location.href = "/student/exchange"
    } catch (error: any) {
      console.error("Submission error:", error)
      toast({ title: "Submission failed", description: error.message || "An error occurred.", variant: "destructive" })
    } finally {
      setSubmitting(false)
      setIsUploadingStatement(false)
      setConfirmDialogOpen(false)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.type !== "application/pdf") {
        toast({ title: "Invalid file type", description: "Please upload a PDF file", variant: "destructive" })
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "File too large", description: "Please upload a file smaller than 5MB", variant: "destructive" })
        return
      }
      setUploadedStatement(file)
      toast({ title: "File selected", description: `"${file.name}" ready for upload.` })
    }
  }

  const handleDownloadStatementTemplate = async () => {
    if (!exchangePackData?.statement_template_url) {
      toast({ title: "No template", description: "Statement template is not available.", variant: "destructive" })
      return
    }
    setDownloadingStatement(true)
    try {
      window.open(exchangePackData.statement_template_url, "_blank")
    } catch (error) {
      toast({ title: "Download failed", variant: "destructive" })
    } finally {
      setDownloadingStatement(false)
    }
  }

  const handleCancelSelection = async () => {
    if (!profile?.id || !exchangePackData?.id) return
    if (!existingSelection) return

    setIsCancelling(true)
    const formData = new FormData()
    formData.append("studentId", profile.id)
    formData.append("electiveExchangeId", exchangePackData.id)

    const result = await cancelExchangeSelection(formData)

    if (result.success) {
      toast({ title: "Selection Cancelled", description: result.message })
      setExistingSelection(null)
      setSelectedUniversityIds([])
      setUploadedStatement(null)
    } else {
      toast({ title: "Cancellation Failed", description: result.error, variant: "destructive" })
    }
    setIsCancelling(false)
  }

  const formatDateDisplay = (dateString: string) =>
    new Date(dateString).toLocaleDateString(language === "ru" ? "ru-RU" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })

  const selectionProgress =
    exchangePackData?.max_selections > 0 ? (selectedUniversityIds.length / exchangePackData.max_selections) * 100 : 0
  const isDeadlinePassed = exchangePackData?.deadline ? new Date(exchangePackData.deadline) < new Date() : false
  const currentSelectionStatus = existingSelection?.status as SelectionStatus | undefined

  const getStatusAlert = () => {
    if (currentSelectionStatus === SelectionStatus.APPROVED)
      return (
        <Alert className="bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-200">
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>{t("student.exchange.selectionApproved")}</AlertTitle>
          <AlertDescription>{t("student.exchange.selectionApprovedDesc")}</AlertDescription>
        </Alert>
      )
    if (currentSelectionStatus === SelectionStatus.PENDING)
      return (
        <Alert className="bg-yellow-50 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
          <Clock className="h-4 w-4" />
          <AlertTitle>{t("student.exchange.selectionPending")}</AlertTitle>
          <AlertDescription>{t("student.exchange.selectionPendingDesc")}</AlertDescription>
        </Alert>
      )
    if (currentSelectionStatus === SelectionStatus.REJECTED)
      return (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t("student.exchange.selectionRejected")}</AlertTitle>
          <AlertDescription>{t("student.exchange.selectionRejectedDesc")}</AlertDescription>
        </Alert>
      )
    if (exchangePackData?.status === "draft")
      return (
        <Alert className="bg-gray-50 text-gray-800 dark:bg-gray-900 dark:text-gray-200">
          <Info className="h-4 w-4" />
          <AlertTitle>{t("student.exchange.comingSoon")}</AlertTitle>
          <AlertDescription>{t("student.exchange.comingSoonDesc")}</AlertDescription>
        </Alert>
      )
    if (exchangePackData?.status === "closed")
      return (
        <Alert variant="destructive">
          <Info className="h-4 w-4" />
          <AlertTitle>{t("student.exchange.programClosed")}</AlertTitle>
          <AlertDescription>{t("student.exchange.programClosedDesc")}</AlertDescription>
        </Alert>
      )
    if (isDeadlinePassed)
      return (
        <Alert variant="destructive">
          <Info className="h-4 w-4" />
          <AlertTitle>{t("student.exchange.deadlinePassed")}</AlertTitle>
          <AlertDescription>{t("student.exchange.deadlinePassedDesc")}</AlertDescription>
        </Alert>
      )
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>{t("student.exchange.selectionPeriodActive")}</AlertTitle>
        <AlertDescription>
          {t("student.exchange.selectionPeriodDesc")} {exchangePackData?.max_selections} {t("student.exchange.until")}{" "}
          {exchangePackData?.deadline && formatDateDisplay(exchangePackData.deadline)}.
        </AlertDescription>
      </Alert>
    )
  }

  if (profileLoading || isLoadingPage)
    return (
      <DashboardLayout>
        <PageSkeleton />
      </DashboardLayout>
    )
  if (fetchError)
    return (
      <DashboardLayout>
        <div className="p-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error Loading Page</AlertTitle>
            <AlertDescription>{fetchError}</AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    )
  if (!exchangePackData)
    return (
      <DashboardLayout>
        <div className="p-4 text-center">{t("student.exchange.notFound")}</div>
      </DashboardLayout>
    )

  const packName = language === "ru" && exchangePackData.name_ru ? exchangePackData.name_ru : exchangePackData.name
  const canSubmit =
    !isDeadlinePassed &&
    exchangePackData.status !== "draft" &&
    exchangePackData.status !== "closed" &&
    currentSelectionStatus !== SelectionStatus.APPROVED
  const statementRequired = !!exchangePackData?.statement_template_url
  const isStatementHandled = !statementRequired || !!uploadedStatement || !!existingSelection?.statement_url
  const areUnisSelected = selectedUniversityIds.length > 0

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6 lg:p-8">
        <div className="flex items-center gap-3">
          <Link href="/student/exchange" passHref>
            <Button variant="outline" size="icon" aria-label={t("student.exchange.backToExchange")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{packName}</h1>
            <p className="text-sm text-muted-foreground">{t("student.exchange.selectUniversities")}</p>
          </div>
        </div>

        {getStatusAlert()}

        <Card
          className={
            currentSelectionStatus === SelectionStatus.APPROVED
              ? "border-green-200 dark:border-green-800"
              : currentSelectionStatus === SelectionStatus.PENDING
                ? "border-yellow-200 dark:border-yellow-800"
                : ""
          }
        >
          <CardHeader>
            <CardTitle>{t("student.exchange.selectionProgress")}</CardTitle>
            <CardDescription>
              {t("student.exchange.selectedOutOf")} {selectedUniversityIds.length} {t("student.exchange.of")}{" "}
              {exchangePackData.max_selections || 0} {t("student.exchange.allowedUniversities")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Progress
              value={selectionProgress}
              className={`h-3 ${currentSelectionStatus === SelectionStatus.APPROVED ? "bg-green-100 dark:bg-green-950 [&>*]:bg-green-600" : currentSelectionStatus === SelectionStatus.PENDING ? "bg-yellow-100 dark:bg-yellow-950 [&>*]:bg-yellow-500" : "[&>*]:bg-primary"}`}
            />
            <p className="mt-2.5 text-sm text-muted-foreground">
              {selectedUniversityIds.length === exchangePackData.max_selections
                ? t("student.exchange.maxSelections")
                : `${t("student.exchange.canSelectMore")} ${exchangePackData.max_selections - selectedUniversityIds.length} ${exchangePackData.max_selections - selectedUniversityIds.length === 1 ? t("student.exchange.moreUniversity") : t("student.exchange.moreUniversities")}`}
            </p>
          </CardContent>
        </Card>

        {statementRequired && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                {t("student.statement.title")}
              </CardTitle>
              <CardDescription>{t("student.statement.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {exchangePackData.statement_template_url && (
                <Button
                  variant="outline"
                  className="w-full sm:w-auto bg-transparent"
                  onClick={handleDownloadStatementTemplate}
                  disabled={downloadingStatement || exchangePackData.status === "draft"}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {downloadingStatement ? t("student.statement.downloading") : t("student.statement.downloadTemplate")}
                </Button>
              )}
              <div className="relative">
                <Label
                  htmlFor="statement-upload"
                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted hover:bg-muted/80 transition-colors"
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <UploadCloud className="w-8 h-8 mb-2 text-muted-foreground" />
                    <p className="mb-1 text-sm text-muted-foreground">
                      <span className="font-semibold">{t("student.statement.clickToUpload")}</span>{" "}
                      {t("student.statement.orDragAndDrop")}
                    </p>
                    <p className="text-xs text-muted-foreground">{t("student.statement.pdfOnly")}</p>
                  </div>
                  <Input
                    id="statement-upload"
                    type="file"
                    accept=".pdf"
                    onChange={handleFileUpload}
                    disabled={isUploadingStatement || !canSubmit}
                    className="sr-only"
                  />
                </Label>
                {isUploadingStatement && (
                  <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg">
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    {t("student.statement.uploading")}
                  </div>
                )}
              </div>
              {uploadedStatement && (
                <Alert variant="success">
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>{t("student.statement.fileReadyTitle")}</AlertTitle>
                  <AlertDescription>
                    {t("student.statement.fileReadyDesc", { fileName: uploadedStatement.name })}
                  </AlertDescription>
                </Alert>
              )}
              {existingSelection?.statement_url && !uploadedStatement && (
                <Alert variant="info">
                  <Info className="h-4 w-4" />
                  <AlertTitle>{t("student.statement.previouslyUploadedTitle")}</AlertTitle>
                  <AlertDescription>{t("student.statement.previouslyUploadedDesc")}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {universities.map((uni) => {
            const isSelected = selectedUniversityIds.includes(uni.id)
            const isAtCapacity = uni.max_students && uni.current_students >= uni.max_students
            const isDisabled =
              (!isSelected && selectedUniversityIds.length >= exchangePackData.max_selections) ||
              (!isSelected && isAtCapacity)
            return (
              <Card
                key={uni.id}
                className={`flex flex-col h-full transition-all hover:shadow-md ${isSelected ? (currentSelectionStatus === SelectionStatus.APPROVED ? "border-green-500 ring-2 ring-green-500/50" : currentSelectionStatus === SelectionStatus.PENDING ? "border-yellow-500 ring-2 ring-yellow-500/50" : "border-primary ring-2 ring-primary/50") : "border-border"} ${isDisabled ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start gap-2">
                    <CardTitle className="text-lg">{uni.name}</CardTitle>
                    {uni.max_students && (
                      <span
                        className={`text-xs whitespace-nowrap px-2 py-1 rounded-full flex items-center gap-1 ${
                          isAtCapacity
                            ? "text-red-800 bg-red-100 dark:bg-red-900 dark:text-red-200"
                            : "text-muted-foreground bg-muted"
                        }`}
                      >
                        <Users className="h-3 w-3" />
                        {uni.current_students}/{uni.max_students}
                        {isAtCapacity && " (Full)"}
                      </span>
                    )}
                  </div>
                  <CardDescription className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {uni.country}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-4 flex-grow flex flex-col gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-0 h-auto text-primary hover:text-primary/80 hover:bg-transparent w-fit"
                    onClick={() => setViewingUniversity(uni)}
                  >
                    <Globe className="h-3.5 w-3.5 mr-1" />
                    {t("student.exchange.viewDetails")}
                  </Button>
                </CardContent>
                <CardFooter className="pt-0 flex justify-between items-center mt-auto border-t pt-3">
                  {canSubmit ? (
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`uni-${uni.id}`}
                        checked={isSelected}
                        onCheckedChange={() => toggleUniversitySelection(uni.id)}
                        disabled={isDisabled || !canSubmit}
                      />
                      <label
                        htmlFor={`uni-${uni.id}`}
                        className={`text-sm font-medium leading-none ${isDisabled || !canSubmit ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}
                      >
                        {isSelected ? t("student.exchange.selected") : t("student.exchange.select")}
                      </label>
                    </div>
                  ) : (
                    <div />
                  )}
                  {uni.website && (
                    <a
                      href={uni.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:text-primary/80 flex items-center"
                    >
                      {t("student.exchange.visitWebsite")}
                      <ExternalLink className="h-3.5 w-3.5 ml-1" />
                    </a>
                  )}
                </CardFooter>
              </Card>
            )
          })}
        </div>

        {canSubmit && (
          <div className="flex flex-col sm:flex-row justify-end items-center gap-3 mt-8">
            {existingSelection && canSubmit && (
              <Button
                variant="outline"
                onClick={() => {
                  if (window.confirm(t("student.exchange.confirmCancelSelection"))) {
                    handleCancelSelection()
                  }
                }}
                disabled={isCancelling || submitting}
                className="w-full sm:w-auto"
              >
                {isCancelling && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {t("student.exchange.cancelSelection")}
              </Button>
            )}
            <Button
              onClick={() => {
                if (!areUnisSelected) {
                  toast({ title: t("student.exchange.selectMinOneUniversity"), variant: "destructive" })
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
              disabled={submitting || isUploadingStatement || !areUnisSelected || !isStatementHandled}
              className="w-full sm:w-auto px-8 py-3 text-base"
              size="lg"
            >
              {submitting && <Loader2 className="h-5 w-5 mr-2 animate-spin" />}
              {existingSelection ? t("student.exchange.updateSelection") : t("student.exchange.confirmSelection")}
            </Button>
          </div>
        )}

        <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("student.exchange.confirmYourSelection")}</DialogTitle>
              <DialogDescription>{t("student.exchange.reviewSelection")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <h4 className="text-sm font-medium mb-2">{t("student.exchange.selectedUniversities")}:</h4>
                <ul className="space-y-1 list-disc list-inside pl-1">
                  {selectedUniversityIds.map((id) => {
                    const uni = universities.find((u) => u.id === id)
                    return (
                      <li key={id} className="text-sm">
                        {uni?.name} ({uni?.country})
                      </li>
                    )
                  })}
                </ul>
              </div>
              {statementRequired && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="text-sm font-medium mb-2">{t("student.statement.title")}:</h4>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
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
                  {t("student.exchange.yourFullName")} ({t("student.exchange.toAuthorize")})
                </Label>
                <Input
                  id="student-name"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder={t("student.exchange.enterFullName")}
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
                  !studentName.trim() || submitting || isUploadingStatement || !areUnisSelected || !isStatementHandled
                }
              >
                {submitting || isUploadingStatement ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {t("student.exchange.submitSelection")}
              </Button>
            </ShadDialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!viewingUniversity} onOpenChange={(open) => !open && setViewingUniversity(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{viewingUniversity?.name}</DialogTitle>
              <DialogDescription>
                {viewingUniversity?.country}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <h4 className="text-sm font-medium">{t("student.exchange.universityDescription")}</h4>
                <p className="text-sm text-muted-foreground">
                  {viewingUniversity?.description || "No description available."}
                </p>
              </div>
            </div>
            <ShadDialogFooter className="flex justify-between sm:justify-between">
              <Button variant="outline" onClick={() => setViewingUniversity(null)}>
                {t("student.exchange.close")}
              </Button>
              {viewingUniversity?.website && (
                <a
                  href={viewingUniversity.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                >
                  {t("student.exchange.visitWebsite")}
                  <ExternalLink className="h-4 w-4 ml-2" />
                </a>
              )}
            </ShadDialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
