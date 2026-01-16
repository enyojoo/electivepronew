"use client"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { UserRole } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, CheckCircle, AlertCircle, Clock, Inbox } from "lucide-react"
import Link from "next/link"
import { useLanguage } from "@/lib/language-context"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { useCachedStudentProfile } from "@/hooks/use-cached-student-profile"
import { CardGridSkeleton } from "@/components/ui/page-skeleton"
import { getCachedData, setCachedData, invalidateCache, getForceRefreshFlag, clearForceRefreshFlag } from "@/lib/cache-utils"

export default function ElectivesPage() {
  const { t, language } = useLanguage()
  const { toast } = useToast()
  const { profile, isLoading: profileLoading, error: profileError } = useCachedStudentProfile()
  // Initialize with cached data synchronously (like dashboard)
  const [electiveCourses, setElectiveCourses] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      try {
        // Check all possible course cache keys (group-specific and generic)
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && key.startsWith("studentElectiveCourses")) {
            const cached = getCachedData(key)
            if (cached && Array.isArray(cached) && cached.length > 0) {
              console.log("CoursesPage: Found cached data for key:", key)
              return cached
            }
          }
        }
      } catch (e) {
        // Ignore cache errors
      }
    }
    return []
  })

  const [courseSelections, setCourseSelections] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      try {
        // Check all possible selection cache keys (group-specific and generic)
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && key.startsWith("studentCourseSelections")) {
            const cached = getCachedData(key)
            if (cached && Array.isArray(cached) && cached.length > 0) {
              console.log("CoursesPage: Found cached selections for key:", key)
              return cached
            }
          }
        }
      } catch (e) {
        // Ignore cache errors
      }
    }
    return []
  })

  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [mounted, setMounted] = useState<boolean>(false)
  const supabaseClient = getSupabaseBrowserClient()
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Set mounted to true after component mounts to avoid hydration mismatches
  useEffect(() => {
    setMounted(true)
    // Clear old non-group-specific cache on mount to prevent showing wrong data
    invalidateCache("studentElectiveCourses")
    invalidateCache("studentCourseSelections")
  }, [])

  // Update with group-specific cached data when profile becomes available
  useEffect(() => {
    if (profile?.group?.id) {
      const cacheKey = `studentElectiveCourses_${profile.group.id}`
      const cacheKeySelections = `studentCourseSelections_${profile.group.id}`

      const cachedCourses = getCachedData(cacheKey)
      const cachedSelections = getCachedData(cacheKeySelections)

      // Only update if we have group-specific cached data
      if (cachedCourses && cachedSelections) {
        console.log("ElectivesPage: Updating with group-specific cached data:", profile.group.id)
        setElectiveCourses(cachedCourses)
        setCourseSelections(cachedSelections)
        setIsLoading(false)
      }
    }

    // Clear old generic cache after profile loads to prevent conflicts
    if (profile && !profileLoading) {
      invalidateCache("studentElectiveCourses")
      invalidateCache("studentCourseSelections")
      setIsLoading(false)
    }
  }, [profile, profileLoading])

  useEffect(() => {
    const fetchElectiveData = async (forceRefresh = false) => {
      // Don't fetch if profile is still loading
      if (profileLoading) {
        console.log("ElectivesPage: Profile is loading, skipping data fetch.")
        return
      }

      // Handle profile errors
      if (profileError) {
        console.error("ElectivesPage: Profile loading error:", profileError)
        setFetchError(`Failed to load profile: ${profileError}`)
        setIsLoading(false)
        return
      }

      // Handle missing profile
      if (!profile?.id) {
        console.log("ElectivesPage: Profile ID missing.", profile)
        setFetchError("Student profile information is incomplete. Cannot fetch electives.")
        setIsLoading(false)
        setElectiveCourses([])
        setCourseSelections([])
        return
      }

      // Handle missing group
      if (!profile.group?.id) {
        setFetchError(t("student.courses.groupInfoMissingFetch"))
        setIsLoading(false)
        setElectiveCourses([])
        setCourseSelections([])
        return
      }

      const cacheKey = `studentElectiveCourses_${profile.group.id}`
      const cacheKeySelections = `studentCourseSelections_${profile.group.id}`

      // Check if we need to force refresh
      const shouldForceRefresh = forceRefresh || getForceRefreshFlag('forceRefreshStudentCourses')
      if (shouldForceRefresh) {
        clearForceRefreshFlag('forceRefreshStudentCourses')
        invalidateCache(cacheKey)
        invalidateCache(cacheKeySelections)
      }

      // Check if we already have cached data and don't need to show loading
      const cachedCourses = getCachedData(cacheKey)
      const cachedSelections = getCachedData(cacheKeySelections)
      const hasCachedData = cachedCourses && cachedSelections

      // Only show loading if we don't have cached data or need to force refresh
      if (!hasCachedData || shouldForceRefresh) {
        setIsLoading(true)
      }

      try {
        setFetchError(null)

        // Use API route instead of direct database query
        console.log("ElectivesPage: Fetching fresh data from API in background...")
        const response = await fetch('/api/student/electives/course', {
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
        console.log("ElectivesPage: Fresh data fetched from API:", data)

        // Update state with fresh data
        setElectiveCourses(data.courses || [])
        setCourseSelections(data.selections || [])

        // Cache the fresh data
        setCachedData(cacheKey, data.courses || [])
        setCachedData(cacheKeySelections, data.selections || [])
      } catch (error: any) {
        console.error("ElectivesPage: Data fetching error:", error)
        setFetchError(error.message || t("student.courses.failedToLoadCourses"))
        toast({
          title: "Error",
          description: error.message || t("student.courses.failedToLoadCourses"),
          variant: "destructive",
        })

        // On error, keep cached data if it exists, otherwise clear
        if (!hasCachedData) {
          setElectiveCourses([])
          setCourseSelections([])
        }
      } finally {
        setIsLoading(false)
      }
    }

    fetchElectiveData()
  }, [profile, profileLoading, profileError, toast])

  // Set up real-time subscriptions for instant updates
  useEffect(() => {
    if (!profile?.id) return

    // Helper function to refetch data from API (used by real-time subscriptions)
    const refetchElectiveData = async () => {
      try {
        console.log("ElectivesPage: Refetching data from API...")

        // Check if we have cached data - if so, don't show loading
        const cacheKey = profile?.group?.id ? `studentElectiveCourses_${profile.group.id}` : "studentElectiveCourses"
        const cacheKeySelections = profile?.group?.id ? `studentCourseSelections_${profile.group.id}` : "studentCourseSelections"
        const cachedCourses = getCachedData(cacheKey)
        const cachedSelections = getCachedData(cacheKeySelections)
        const hasCachedData = cachedCourses && cachedSelections

        // Only show loading if we don't have cached data
        if (!hasCachedData) {
          setIsLoading(true)
        }

        const response = await fetch('/api/student/electives/course', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          const errorData = await response.json()
          if (errorData.error === "Authentication failed" || errorData.error === "Unauthorized") {
            window.location.href = "/student/login"
            return
          }
          console.error("Error refetching elective data:", errorData)
          return
        }

        const data = await response.json()

        setElectiveCourses(data.courses || [])
        setCourseSelections(data.selections || [])

        // Update cache with group-specific keys
        setCachedData(cacheKey, data.courses || [])
        setCachedData(cacheKeySelections, data.selections || [])
      } catch (error) {
        console.error("Error in refetchElectiveData:", error)
      } finally {
        setIsLoading(false)
      }
    }

    const channel = supabaseClient
      .channel("student-courses-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "elective_courses" }, (payload) => {
        console.log("Elective courses changed, refetching student courses:", payload)
        refetchElectiveData()
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "course_selections", filter: `student_id=eq.${profile.id}` }, (payload) => {
        console.log("Student course selections changed, refetching selections:", payload)
        refetchElectiveData()
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("✓ Student courses page subscribed to real-time changes")
        } else if (status === "CHANNEL_ERROR") {
          console.error("✗ Error subscribing to real-time changes on student courses page")
        }
      })

    return () => {
      supabaseClient.removeChannel(channel)
    }
  }, [supabaseClient, profile?.id])

  const formatDate = (dateString: string) => {
    // Only format dates on client side to avoid hydration mismatches
    if (!mounted) return ""
    const date = new Date(dateString)
    return date.toLocaleDateString(language === "ru" ? "ru-RU" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getSelectionStatus = (courseId: string) => {
    const selection = courseSelections.find((sel) => sel.elective_courses_id === courseId)
    return selection?.status || null
  }

  const getSelectedCoursesCount = (courseId: string) => {
    const selection = courseSelections.find((sel) => sel.elective_courses_id === courseId)
    return selection?.selected_course_ids?.length || 0
  }

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
      case "rejected":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
    }
  }

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="h-4 w-4" />
      case "pending":
        return <Clock className="h-4 w-4" />
      case "rejected":
        return <AlertCircle className="h-4 w-4" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }

  const isDeadlinePassed = (deadline: string) => new Date(deadline) < new Date()

  // Only show loading when actively fetching from API and no cached data
  if (isLoading && electiveCourses.length === 0) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">{t("student.courses.title")}</h1>
            <p className="text-sm sm:text-base text-muted-foreground">{t("student.courses.subtitle")}</p>
          </div>
          <CardGridSkeleton itemCount={3} />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("student.courses.title")}</h1>
          <p className="text-sm sm:text-base text-muted-foreground">{t("student.courses.subtitle")}</p>
        </div>

        {fetchError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{fetchError}</AlertDescription>
          </Alert>
        )}

        {!fetchError && electiveCourses.length === 0 && !isLoading && !profileLoading && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Inbox className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-muted-foreground">{t("student.courses.noCoursesFound")}</p>
              <p className="text-sm text-muted-foreground mt-1">{t("student.courses.checkBackLater")}</p>
            </CardContent>
          </Card>
        )}

        {!fetchError && electiveCourses.length > 0 && mounted && (
          <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-1 lg:grid-cols-2">
            {electiveCourses.map((elective) => {
              const selectionStatus = getSelectionStatus(elective.id)
              const selectedCount = getSelectedCoursesCount(elective.id)
              // elective_courses has name, deadline, max_selections directly
              const name = language === "ru" && elective.name_ru ? elective.name_ru : elective.name || ""
              const status = elective.status || "draft"
              const maxSelections = elective.max_selections
              const deadline = elective.deadline
              const deadlinePassed = deadline ? isDeadlinePassed(deadline) : false

              return (
                <Card
                  key={elective.id}
                  className={`flex flex-col h-full transition-all hover:shadow-md ${
                    selectionStatus === "approved"
                      ? "border-green-500 bg-green-50/30 dark:bg-green-950/10"
                      : selectionStatus === "pending"
                        ? "border-yellow-500 bg-yellow-50/30 dark:bg-yellow-950/10"
                        : ""
                  }`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <CardTitle className="text-lg sm:text-xl">{name}</CardTitle>
                        {selectionStatus ? (
                          <Badge className={getStatusColor(selectionStatus)} variant="secondary">
                            <span className="flex items-center space-x-1">
                              {getStatusIcon(selectionStatus)}
                              <span className="capitalize ml-1">
                                {t(`student.courses.status.${selectionStatus}` as any, selectionStatus)}
                              </span>
                            </span>
                          </Badge>
                        ) : (
                          <Badge className={getStatusColor(null)} variant="secondary">
                            <span className="flex items-center space-x-1">
                              {getStatusIcon(null)}
                              <span className="capitalize ml-1">{t("student.courses.noSelection")}</span>
                            </span>
                          </Badge>
                        )}
                      </div>
                      {status === "draft" ? (
                        <Badge variant="outline">{t("student.courses.comingSoon")}</Badge>
                      ) : status === "inactive" ? (
                        <Badge variant="destructive">{t("student.courses.closed")}</Badge>
                      ) : deadlinePassed ? (
                        <Badge variant="destructive">{t("student.courses.closed")}</Badge>
                      ) : (
                        <Badge variant="secondary">{t("student.courses.open")}</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="flex-grow"></CardContent>
                  <CardFooter className="flex flex-col gap-4 pt-0 pb-4">
                    <div className="flex flex-col gap-y-2 text-xs sm:text-sm w-full">
                      {deadline && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted-foreground">{t("student.courses.deadline")}:</span>
                          <span className={deadlinePassed ? "text-red-600" : ""}>{formatDate(deadline)}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-4">
                        {maxSelections && (
                          <div className="flex items-center gap-1.5 whitespace-nowrap">
                            <span className="text-muted-foreground">{t("student.courses.limitText")}</span>
                            <span className="font-bold">{maxSelections}</span>
                            <span className="text-muted-foreground">{t("student.courses.limitSuffix")}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div
                      className={`flex items-center justify-end rounded-md p-2 w-full ${
                        selectionStatus === "approved"
                          ? "bg-green-100/50 dark:bg-green-900/20"
                          : selectionStatus === "pending"
                            ? "bg-yellow-100/50 dark:bg-yellow-900/20"
                            : "bg-gray-100/50 dark:bg-gray-900/20"
                      }`}
                    >
                      <Link href={`/student/courses/${elective.id}`}>
                        <Button
                          size="sm"
                          variant={
                            status === "draft" ||
                            (deadlinePassed && selectionStatus !== "approved" && selectionStatus !== "pending")
                              ? "outline"
                              : selectionStatus === "approved"
                                ? "outline"
                                : selectionStatus === "pending"
                                  ? "secondary"
                                  : "default"
                          }
                          className={`h-7 gap-1 ${
                            selectionStatus === "approved"
                              ? "border-green-200 hover:bg-green-100 dark:border-green-800 dark:hover:bg-green-900/30"
                              : elective.status === "draft" ||
                                  (deadlinePassed && selectionStatus !== "approved" && selectionStatus !== "pending")
                                ? "border-gray-200 hover:bg-gray-100 dark:border-gray-800 dark:hover:bg-gray-900/30"
                                : ""
                          }`}
                          disabled={elective.status === "draft"}
                        >
                          <>
                            <span>{t("student.courses.view")}</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </>
                        </Button>
                      </Link>
                    </div>
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
