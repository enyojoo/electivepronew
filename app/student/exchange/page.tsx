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

export default function ExchangePage() {
  const { t, language } = useLanguage()
  const { toast } = useToast()
  const { profile, isLoading: profileLoading, error: profileError } = useCachedStudentProfile()
  // Initialize with cached data synchronously (like dashboard)
  const [exchangePrograms, setExchangePrograms] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      try {
        // Check all possible exchange program cache keys (group-specific and generic)
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && key.startsWith("studentExchangePrograms")) {
            const cached = getCachedData(key)
            if (cached && Array.isArray(cached) && cached.length > 0) {
              console.log("ExchangePage: Found cached programs for key:", key)
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

  const [exchangeSelections, setExchangeSelections] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      try {
        // Check all possible exchange selection cache keys (group-specific and generic)
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && key.startsWith("studentExchangeSelections")) {
            const cached = getCachedData(key)
            if (cached && Array.isArray(cached) && cached.length > 0) {
              console.log("ExchangePage: Found cached selections for key:", key)
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

  const [isLoading, setIsLoading] = useState(false)
  const supabaseClient = getSupabaseBrowserClient()
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Update with group-specific cached data when profile becomes available
  useEffect(() => {
    if (profile?.group?.id) {
      const cacheKey = `studentExchangePrograms_${profile.group.id}`
      const cacheKeySelections = `studentExchangeSelections_${profile.group.id}`

      const cachedPrograms = getCachedData(cacheKey)
      const cachedSelections = getCachedData(cacheKeySelections)

      // Only update if we have group-specific cached data
      if (cachedPrograms && cachedSelections) {
        console.log("ExchangePage: Updating with group-specific cached data:", profile.group.id)
        setExchangePrograms(cachedPrograms)
        setExchangeSelections(cachedSelections)
        setIsLoading(false)
      }
    }

    // Clear old generic cache after profile loads to prevent conflicts
    if (profile && !profileLoading) {
      invalidateCache("studentExchangePrograms")
      invalidateCache("studentExchangeSelections")
      setIsLoading(false)
    }
  }, [profile, profileLoading])

  useEffect(() => {
    const fetchExchangeData = async (forceRefresh = false) => {
      // Don't fetch if profile is still loading
      if (profileLoading) {
        console.log("ExchangePage: Profile is loading, skipping data fetch.")
        return
      }

      // Handle profile errors
      if (profileError) {
        console.error("ExchangePage: Profile loading error:", profileError)
        setFetchError(`Failed to load profile: ${profileError}`)
        setIsLoading(false)
        return
      }

      // Handle missing profile
      if (!profile?.id) {
        console.log("ExchangePage: Profile ID missing.", profile)
        setFetchError("Student profile information is incomplete. Cannot fetch exchange programs.")
        setIsLoading(false)
        setExchangePrograms([])
        setExchangeSelections([])
        return
      }

      // Handle missing group
      if (!profile.group?.id) {
        setFetchError(t("student.exchange.groupInfoMissing"))
        setIsLoading(false)
        setExchangePrograms([])
        setExchangeSelections([])
        return
      }

      const cacheKey = `studentExchangePrograms_${profile.group.id}`
      const cacheKeySelections = `studentExchangeSelections_${profile.group.id}`

      // Check if we need to force refresh
      const shouldForceRefresh = forceRefresh || getForceRefreshFlag('forceRefreshStudentExchange')
      if (shouldForceRefresh) {
        clearForceRefreshFlag('forceRefreshStudentExchange')
        invalidateCache(cacheKey)
        invalidateCache(cacheKeySelections)
      }

      // Check if we already have cached data and don't need to show loading
      const cachedPrograms = getCachedData(cacheKey)
      const cachedSelections = getCachedData(cacheKeySelections)
      const hasCachedData = cachedPrograms && cachedSelections

      // Only show loading if we don't have cached data or need to force refresh
      if (!hasCachedData || shouldForceRefresh) {
        setIsLoading(true)
      }

      try {
        setFetchError(null)

        // Use API route instead of direct database query
        console.log("ExchangePage: Fetching fresh data from API in background...")
        const response = await fetch('/api/student/electives/exchange', {
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
        console.log("ExchangePage: Fresh data fetched from API:", data)

        // Update state with fresh data
        setExchangePrograms(data.exchangePrograms || [])
        setExchangeSelections(data.selections || [])

        // Cache the fresh data
        setCachedData(cacheKey, data.exchangePrograms || [])
        setCachedData(cacheKeySelections, data.selections || [])
      } catch (error: any) {
        console.error("ExchangePage: Data fetching error:", error)
        setFetchError(error.message || "Failed to load exchange programs data.")
        toast({
          title: "Error",
          description: error.message || "Failed to load exchange programs",
          variant: "destructive",
        })

        // On error, keep cached data if it exists, otherwise clear
        if (!hasCachedData) {
          setExchangePrograms([])
          setExchangeSelections([])
        }
      } finally {
        setIsLoading(false)
      }
    }

    fetchExchangeData()
  }, [profile, profileLoading, profileError, toast])

  // Set up real-time subscriptions for instant updates
  useEffect(() => {
    if (!profile?.id) return

    const channel = supabaseClient
      .channel("student-exchange-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "elective_exchange" },
        async () => {
          console.log("Exchange programs changed, refetching student exchange programs")
          // Refetch data
          if (!profile?.id || !profile?.group?.id) return

          const fetchData = async () => {
            if (!profile?.id) return
            try {
              // Fetch exchange programs for the group
              const { data: programsData, error: programsError } = await supabaseClient
                .from("elective_exchange")
                .select("*")
                .eq("status", "published")
                .order("deadline", { ascending: false })

              if (programsError) throw programsError
              setExchangePrograms(programsData || [])

              // Fetch student's exchange selections
              const { data: selectionsData, error: selectionsError } = await supabaseClient
                .from("exchange_selections")
                .select("*")
                .eq("student_id", profile.id)

              if (selectionsError) throw selectionsError
              setExchangeSelections(selectionsData || [])
            } catch (error: any) {
              console.error("Error refetching data:", error)
            }
          }

          await fetchData()
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "exchange_selections", filter: `student_id=eq.${profile.id}` },
        async () => {
          console.log("Student exchange selections changed, refetching selections")
          // Refetch selections only
          const { data: selectionsData, error: selectionsError } = await supabaseClient
            .from("exchange_selections")
            .select("*")
            .eq("student_id", profile.id)

          if (!selectionsError) {
            setExchangeSelections(selectionsData || [])
          }
        }
      )
      .subscribe()

    return () => {
      supabaseClient.removeChannel(channel)
    }
  }, [supabaseClient, profile?.id])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString(language === "ru" ? "ru-RU" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getSelectionStatus = (exchangeId: string) => {
    const selection = exchangeSelections.find((sel) => sel.elective_exchange_id === exchangeId)
    return selection?.status || null
  }

  const getSelectedUniversitiesCount = (exchangeId: string) => {
    const selection = exchangeSelections.find((sel) => sel.elective_exchange_id === exchangeId)
    return selection?.selected_university_ids?.length || 0
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
  if (isLoading && exchangePrograms.length === 0) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("student.exchange.title")}</h1>
            <p className="text-muted-foreground">{t("student.exchange.subtitle")}</p>
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
          <h1 className="text-3xl font-bold tracking-tight">{t("student.exchange.title")}</h1>
          <p className="text-muted-foreground">{t("student.exchange.subtitle")}</p>
        </div>

        {fetchError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{fetchError}</AlertDescription>
          </Alert>
        )}

        {!fetchError && exchangePrograms.length === 0 && !isLoading && !profileLoading && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Inbox className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-muted-foreground">{t("student.exchange.noExchangeFound")}</p>
              <p className="text-sm text-muted-foreground mt-1">{t("student.exchange.checkBackLater")}</p>
            </CardContent>
          </Card>
        )}

        {!fetchError && exchangePrograms.length > 0 && (
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
            {exchangePrograms.map((exchange) => {
              const selectionStatus = getSelectionStatus(exchange.id)
              const selectedCount = getSelectedUniversitiesCount(exchange.id)
              const deadlinePassed = isDeadlinePassed(exchange.deadline)
              const name = language === "ru" && exchange.name_ru ? exchange.name_ru : exchange.name

              return (
                <Card
                  key={exchange.id}
                  className={`h-full transition-all hover:shadow-md ${
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
                        <CardTitle className="text-xl">{name}</CardTitle>
                        {selectionStatus ? (
                          <Badge className={getStatusColor(selectionStatus)} variant="secondary">
                            <span className="flex items-center space-x-1">
                              {getStatusIcon(selectionStatus)}
                              <span className="capitalize ml-1">
                                {t(`student.exchange.status.${selectionStatus}` as any, selectionStatus)}
                              </span>
                            </span>
                          </Badge>
                        ) : (
                          <Badge className={getStatusColor(null)} variant="secondary">
                            <span className="flex items-center space-x-1">
                              {getStatusIcon(null)}
                              <span className="capitalize ml-1">{t("student.exchange.noSelection")}</span>
                            </span>
                          </Badge>
                        )}
                      </div>
                      {exchange.status === "draft" ? (
                        <Badge variant="outline">{t("student.exchange.comingSoon")}</Badge>
                      ) : exchange.status === "closed" ? (
                        <Badge variant="destructive">{t("student.exchange.closed")}</Badge>
                      ) : deadlinePassed ? (
                        <Badge variant="destructive">{t("student.exchange.closed")}</Badge>
                      ) : (
                        <Badge variant="secondary">{t("student.exchange.open")}</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="flex-grow"></CardContent>
                  <CardFooter className="flex flex-col pt-0 pb-4 gap-4">
                    <div className="flex flex-col gap-y-2 text-sm w-full">
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground">{t("student.exchange.deadline")}:</span>
                        <span className={deadlinePassed ? "text-red-600" : ""}>{formatDate(exchange.deadline)}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted-foreground">{t("student.exchange.limit")}:</span>
                          <span>{exchange.max_selections}</span>
                        </div>
                      </div>
                    </div>

                    <div
                      className={`flex items-center justify-between rounded-md p-2 w-full ${
                        selectionStatus === "approved"
                          ? "bg-green-100/50 dark:bg-green-900/20"
                          : selectionStatus === "pending"
                            ? "bg-yellow-100/50 dark:bg-yellow-900/20"
                            : "bg-gray-100/50 dark:bg-gray-900/20"
                      }`}
                    >
                      <span className="text-sm">
                        {t("student.exchange.selected")}: {selectedCount}/{exchange.max_selections}
                      </span>
                      <Link href={`/student/exchange/${exchange.id}`}>
                        <Button
                          size="sm"
                          variant={
                            exchange.status === "draft" ||
                            exchange.status === "closed" ||
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
                              : exchange.status === "draft" ||
                                  exchange.status === "closed" ||
                                  (deadlinePassed && selectionStatus !== "approved" && selectionStatus !== "pending")
                                ? "border-gray-200 hover:bg-gray-100 dark:border-gray-800 dark:hover:bg-gray-900/30"
                                : ""
                          }`}
                          disabled={exchange.status === "draft" || exchange.status === "closed"}
                        >
                          <>
                            <span>{t("student.exchange.view")}</span>
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
