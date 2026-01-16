"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { BookOpen, Calendar, ClipboardList, AlertCircle } from "lucide-react"
import Link from "next/link"
import { UserRole } from "@/lib/types"
import { useLanguage } from "@/lib/language-context"
import { useRouter } from "next/navigation"
import { useCachedStudentProfile } from "@/hooks/use-cached-student-profile"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { formatDate, calculateDaysLeft } from "@/lib/utils"

// Cache constants
const DEADLINES_CACHE_KEY = "studentDashboardDeadlines"
const USER_ID_CACHE_KEY = "studentDashboardUserId"
const getElectiveCountsCacheKey = (userId: string) => `studentDashboardElectiveCounts_${userId}`
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

interface DeadlineItem {
  id: string
  title: string
  date: string
  daysLeft: number
  type: "course" | "exchange"
}

interface ElectiveCounts {
  required: {
    courses: number
    exchange: number
    total: number
  }
  selected: {
    courses: number
    exchange: number
    total: number
  }
}

export default function StudentDashboard() {
  const { t, language } = useLanguage()
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()

  // Use a ref to track if this is the initial mount
  const isInitialMount = useRef(true)
  const hasInitialized = useRef(false)

  // Initialize state with cached data to prevent flash
  const [userId, setUserId] = useState<string | undefined>(() => {
    if (typeof window !== "undefined") {
      try {
        const cachedUserId = getCachedData(USER_ID_CACHE_KEY)
        return cachedUserId || undefined
      } catch (e) {
        return undefined
      }
    }
    return undefined
  })

  // Initialize elective counts with cached data
  const [electiveCounts, setElectiveCounts] = useState<ElectiveCounts>(() => {
    if (typeof window !== "undefined" && userId) {
      try {
        const cachedCounts = getCachedData(getElectiveCountsCacheKey(userId))
        if (cachedCounts) {
          return cachedCounts
        }
      } catch (e) {
        // Fall back to default
      }
    }
    return {
      required: { courses: 0, exchange: 0, total: 0 },
      selected: { courses: 0, exchange: 0, total: 0 },
    }
  })

  // Initialize deadlines with cached data
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<DeadlineItem[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cachedDeadlines = getCachedData(DEADLINES_CACHE_KEY)
        if (cachedDeadlines) {
          return cachedDeadlines
        }
      } catch (e) {
        // Fall back to empty array
      }
    }
    return []
  })


  // Fetch current user ID only once on mount
  useEffect(() => {
    const fetchUserId = async () => {
      // Skip if we already have a userId from cache
      if (userId) {
        hasInitialized.current = true
        return
      }

      try {
        const { data, error } = await supabase.auth.getUser()

        if (error) {
          console.error("Auth error:", error)
          router.push("/student/login")
          return
        }

        if (data?.user) {
          const newUserId = data.user.id
          console.log("Student Dashboard - Fetched user ID:", newUserId)
          setUserId(newUserId)
          // Cache the userId
          setCachedData(USER_ID_CACHE_KEY, newUserId)
          hasInitialized.current = true
        } else {
          console.log("No authenticated user found")
          router.push("/student/login")
        }
      } catch (error) {
        console.error("Error fetching user ID:", error)
        router.push("/student/login")
      }
    }

    if (!hasInitialized.current) {
      fetchUserId()
    }
  }, [supabase, router, userId])

  // Fetch student profile using the cached hook
  const { profile, isLoading: isLoadingProfile, error: profileError } = useCachedStudentProfile(userId)

  // Fetch elective counts and selections with caching
  const fetchElectiveCounts = useCallback(async () => {
    if (!userId || !profile?.group?.id) return

    try {
      console.log("Fetching fresh elective counts data")

      // Fetch available electives for student's group (required)
      const { count: availableCoursesCount, error: availableCoursesError } = await supabase
        .from("elective_courses")
        .select("*", { count: "exact", head: true })
        .eq("status", "published")
        .eq("group_id", profile.group.id)

      const { count: availableExchangeCount, error: availableExchangeError } = await supabase
        .from("elective_exchange")
        .select("*", { count: "exact", head: true })
        .eq("status", "published")
        .eq("group_id", profile.group.id)

      // Fetch student's course selections
      const { data: courseSelections, error: courseSelectionsError } = await supabase
        .from("course_selections")
        .select("*")
        .eq("student_id", userId)

      // Fetch student's exchange selections
      const { data: exchangeSelections, error: exchangeSelectionsError } = await supabase
        .from("exchange_selections")
        .select("*")
        .eq("student_id", userId)

      if (!availableCoursesError && !availableExchangeError && !courseSelectionsError && !exchangeSelectionsError) {
        const selectedCourses = courseSelections?.length || 0
        const selectedExchange = exchangeSelections?.length || 0

        const counts: ElectiveCounts = {
          required: {
            courses: availableCoursesCount || 0,
            exchange: availableExchangeCount || 0,
            total: (availableCoursesCount || 0) + (availableExchangeCount || 0),
          },
          selected: {
            courses: selectedCourses,
            exchange: selectedExchange,
            total: selectedCourses + selectedExchange,
          },
        }

        setElectiveCounts(counts)

        // Cache the data
        setCachedData(getElectiveCountsCacheKey(userId), counts)
      }
    } catch (error) {
      console.error("Error fetching elective counts:", error)
    }
  }, [supabase, userId, profile?.group?.id])

  useEffect(() => {
    fetchElectiveCounts()
  }, [fetchElectiveCounts])

  // Fetch upcoming deadlines
  const fetchUpcomingDeadlines = useCallback(async () => {
    if (!profile?.group?.id) return

    try {
      console.log("Fetching fresh deadlines data")

      // Get current date
      const now = new Date()

      // Fetch course electives with deadlines for student's group
      // elective_courses has name, deadline, status directly
      const { data: courseElectives, error: courseError } = await supabase
        .from("elective_courses")
        .select("id, name, name_ru, deadline, status")
        .eq("status", "published")
        .eq("group_id", profile.group.id)
        .not("deadline", "is", null)
        .gte("deadline", now.toISOString())
        .order("deadline", { ascending: true })
        .limit(5)

      // Fetch exchange programs with deadlines for student's group
      const { data: exchangePrograms, error: exchangeError } = await supabase
        .from("elective_exchange")
        .select("id, name, name_ru, deadline, status")
        .eq("status", "published")
        .eq("group_id", profile.group.id)
        .not("deadline", "is", null)
        .gte("deadline", now.toISOString())
        .order("deadline", { ascending: true })
        .limit(5)

      if (!courseError && !exchangeError) {
        // Process course electives
        const courseDeadlines = (courseElectives || []).map((item) => ({
          id: item.id,
          title: language === "ru" && item.name_ru ? item.name_ru : item.name,
          date: item.deadline,
          daysLeft: calculateDaysLeft(item.deadline),
          type: "course" as const,
        }))

        // Process exchange programs
        const exchangeDeadlines = (exchangePrograms || []).map((item) => ({
          id: item.id,
          title: language === "ru" && item.name_ru ? item.name_ru : item.name,
          date: item.deadline,
          daysLeft: calculateDaysLeft(item.deadline),
          type: "exchange" as const,
        }))

        // Combine and sort by closest deadline
        const allDeadlines = [...courseDeadlines, ...exchangeDeadlines]
          .sort((a, b) => a.daysLeft - b.daysLeft)
          .slice(0, 5) // Take top 5 closest deadlines

        setUpcomingDeadlines(allDeadlines)

        // Cache the data
        setCachedData(DEADLINES_CACHE_KEY, allDeadlines)
      }
    } catch (error) {
      console.error("Error fetching upcoming deadlines:", error)
    }
  }, [supabase, language, profile?.group?.id])

  // Fetch upcoming deadlines on mount
  useEffect(() => {
    fetchUpcomingDeadlines()
  }, [fetchUpcomingDeadlines])


  // Log when component mounts/unmounts to track re-renders
  useEffect(() => {
    console.log("Student Dashboard mounted")

    // Mark that we're no longer on initial mount
    isInitialMount.current = false

    return () => {
      console.log("Student Dashboard unmounted")
    }
  }, [])

  // Set up real-time subscriptions for instant updates
  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel("student-dashboard-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "elective_courses" },
        async () => {
          console.log("Elective courses changed, refetching student dashboard data")
          // Refetch elective counts and deadlines
          await Promise.all([fetchElectiveCounts(), fetchUpcomingDeadlines()])
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "elective_exchange" },
        async () => {
          console.log("Exchange programs changed, refetching student dashboard data")
          // Refetch elective counts and deadlines
          await Promise.all([fetchElectiveCounts(), fetchUpcomingDeadlines()])
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "course_selections", filter: `student_id=eq.${userId}` },
        async () => {
          console.log("Student course selections changed, refetching counts")
          await fetchElectiveCounts()
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "exchange_selections", filter: `student_id=eq.${userId}` },
        async () => {
          console.log("Student exchange selections changed, refetching counts")
          await fetchElectiveCounts()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, userId])

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">
            {t("student.dashboard.welcome", { name: profile?.full_name || t("student.dashboard.student") })}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">{t("student.dashboard.subtitle")}</p>
        </div>

        {profileError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{profileError}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("student.dashboard.requiredElectives")}</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{electiveCounts.required.total}</div>
              <p className="text-xs text-muted-foreground">
                {electiveCounts.required.courses} {t("student.dashboard.courses")}, {electiveCounts.required.exchange}{" "}
                {t("student.dashboard.exchange")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("student.dashboard.selectedElectives")}</CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{electiveCounts.selected.total}</div>
              <p className="text-xs text-muted-foreground">
                {electiveCounts.selected.courses} {t("student.dashboard.courses")}, {electiveCounts.selected.exchange}{" "}
                {t("student.dashboard.exchange")}
              </p>
            </CardContent>
          </Card>

        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle>{t("student.dashboard.yourInfo")}</CardTitle>
              <CardDescription>{t("student.dashboard.academicDetails")}</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingProfile ? (
                <div className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ) : (
                <dl className="space-y-2">
                  <div className="flex justify-between">
                    <dt className="font-medium">{t("student.dashboard.name")}:</dt>
                    <dd>{profile?.full_name || "-"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium">{t("student.dashboard.degree")}:</dt>
                    <dd>{profile?.degree ? (language === "ru" && profile.degree.name_ru ? profile.degree.name_ru : profile.degree.name) : "-"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium">{t("student.dashboard.year")}:</dt>
                    <dd>{profile?.year || "-"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium">{t("student.dashboard.group")}:</dt>
                    <dd>{profile?.group?.name || "-"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium">{t("student.dashboard.email")}:</dt>
                    <dd>{profile?.email || "-"}</dd>
                  </div>
                </dl>
              )}
            </CardContent>
          </Card>

          <Card className="col-span-1">
            <CardHeader>
              <CardTitle>{t("student.dashboard.upcomingDeadlines")}</CardTitle>
              <CardDescription>{t("student.dashboard.importantDates")}</CardDescription>
            </CardHeader>
            <CardContent>
              {upcomingDeadlines.length > 0 ? (
                <div className="max-h-48 overflow-y-auto pr-2 space-y-4">
                  {upcomingDeadlines.map((deadline) => (
                    <div key={deadline.id} className="flex items-center justify-between min-w-0">
                      <div className="flex-1 min-w-0 pr-2">
                        <p className="font-medium truncate">{deadline.title}</p>
                        <p className="text-sm text-muted-foreground truncate">{formatDate(deadline.date, language === "ru" ? "ru-RU" : "en-US")}</p>
                      </div>
                      <Link
                        href={
                          deadline.type === "course"
                            ? `/student/courses/${deadline.id}`
                            : `/student/exchange/${deadline.id}`
                        }
                        className="flex-shrink-0"
                      >
                        <div
                          className={`px-2 py-1 rounded-md text-xs font-medium cursor-pointer whitespace-nowrap ${
                            deadline.daysLeft < 7
                              ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                              : deadline.daysLeft < 30
                                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                                : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          }`}
                        >
                          {deadline.daysLeft} {t("student.dashboard.daysLeft")}
                        </div>
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  {t("student.dashboard.noUpcomingDeadlines", "No upcoming deadlines")}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
