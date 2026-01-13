"use client"

import { useEffect, useState, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { BookOpen, GlobeIcon } from "lucide-react"
import Link from "next/link"
import { UserRole } from "@/lib/types"
import { useLanguage } from "@/lib/language-context"
import { useRouter } from "next/navigation"
import { useCachedManagerProfile } from "@/hooks/use-cached-manager-profile"
import { Skeleton } from "@/components/ui/skeleton"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { formatDate, calculateDaysLeft } from "@/lib/utils"

// Cache constants
const ELECTIVE_COUNTS_CACHE_KEY = "managerDashboardElectiveCounts"
const DEADLINES_CACHE_KEY = "managerDashboardDeadlines"
const USER_ID_CACHE_KEY = "managerDashboardUserId"
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
  courses: number
  exchange: number
}

export default function ManagerDashboard() {
  const { t, language } = useLanguage()
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()

  // Use a ref to track if this is the initial mount
  const isInitialMount = useRef(true)

  // State for user ID with caching
  const [userId, setUserId] = useState<string | undefined>(() => {
    // Try to get userId from cache on initial render
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

  // State for loading
  const [isLoadingCounts, setIsLoadingCounts] = useState(true)
  const [isLoadingDeadlines, setIsLoadingDeadlines] = useState(true)

  // Fetch current user ID only once on mount
  useEffect(() => {
    const fetchUserId = async () => {
      // Skip if we already have a userId from cache
      if (userId) return

      try {
        const { data, error } = await supabase.auth.getUser()

        if (error) {
          console.error("Auth error:", error)
          router.push("/manager/login") // Redirect to manager login if auth error
          return
        }
        if (data?.user) {
          const newUserId = data.user.id
          setUserId(newUserId)
          // Cache the userId
          setCachedData(USER_ID_CACHE_KEY, newUserId)
        } else {
          console.log("No authenticated user found")
          router.push("/manager/login") // Redirect to manager login if no user
        }
      } catch (error) {
        console.error("Error fetching user ID:", error)
        router.push("/manager/login") // Redirect to manager login on other errors
      }
    }

    fetchUserId()
  }, [supabase, router, userId]) // Added userId to dependency array

  // Fetch manager profile using the cached hook
  const { profile, isLoading: isLoadingProfile } = useCachedManagerProfile(userId)

  // State for deadlines and elective counts
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<DeadlineItem[]>([])
  const [electiveCounts, setElectiveCounts] = useState<ElectiveCounts>({
    courses: 0,
    exchange: 0,
  })

  // Fetch elective counts with caching
  useEffect(() => {
    const fetchElectiveCounts = async () => {

      try {
        setIsLoadingCounts(true)

        // Check for cached data
        const cachedCounts = getCachedData(ELECTIVE_COUNTS_CACHE_KEY)
        if (cachedCounts) {
          console.log("Using cached elective counts data")
          setElectiveCounts(cachedCounts)
          setIsLoadingCounts(false)
          return
        }

        console.log("Fetching fresh elective counts data")

        // Fetch course electives count
        const { count: courseCount, error: courseError } = await supabase
          .from("elective_courses")
          .select("*", { count: "exact", head: true })

        // Fetch exchange electives count
        const { count: exchangeCount, error: exchangeError } = await supabase
          .from("elective_exchange")
          .select("*", { count: "exact", head: true })

        if (!courseError && !exchangeError) {
          const counts = {
            courses: courseCount || 0,
            exchange: exchangeCount || 0,
          }

          setElectiveCounts(counts)

          // Cache the data
          setCachedData(ELECTIVE_COUNTS_CACHE_KEY, counts)
        }
      } catch (error) {
        console.error("Error fetching elective counts:", error)
      } finally {
        setIsLoadingCounts(false)
      }
    }

    fetchElectiveCounts()
  }, [supabase])

  // Fetch upcoming deadlines with caching
  useEffect(() => {
    const fetchUpcomingDeadlines = async () => {

      try {
        setIsLoadingDeadlines(true)

        // Check for cached data
        const cachedDeadlines = getCachedData(DEADLINES_CACHE_KEY)
        if (cachedDeadlines) {
          console.log("Using cached deadlines data")
          setUpcomingDeadlines(cachedDeadlines)
          setIsLoadingDeadlines(false)
          return
        }

        console.log("Fetching fresh deadlines data")

        // Get current date
        const now = new Date()

        // Fetch course electives with deadlines
        // elective_courses has name, deadline, status directly
        const { data: courseElectives, error: courseError } = await supabase
          .from("elective_courses")
          .select("id, name, name_ru, deadline, status")
          .eq("status", "active")
          .not("deadline", "is", null)
          .gte("deadline", now.toISOString())
          .order("deadline", { ascending: true })
          .limit(5)

        // Fetch exchange programs with deadlines
        const { data: exchangePrograms, error: exchangeError } = await supabase
          .from("elective_exchange")
          .select("id, name, name_ru, deadline, status")
          .eq("status", "published")
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
      } finally {
        setIsLoadingDeadlines(false)
      }
    }

    fetchUpcomingDeadlines()
  }, [supabase, language])

  // Set up real-time subscriptions for instant updates
  useEffect(() => {
    // Helper function to refetch and update a specific stat
    const refetchStat = async (table: string, statKey: "courses" | "exchange") => {
      try {
        console.log(`Refetching ${table} count for manager dashboard...`)
        const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true })
        if (error) {
          console.error(`Error fetching ${table} count:`, error)
          return
        }
        console.log(`${table} count updated:`, count)

        // Update the specific stat in state
        if (statKey === "courses") {
          setElectiveCounts(prev => ({ ...prev, courses: count || 0 }))
        } else if (statKey === "exchange") {
          setElectiveCounts(prev => ({ ...prev, exchange: count || 0 }))
        }

        // Clear cache to force fresh data on next load
        localStorage.removeItem(ELECTIVE_COUNTS_CACHE_KEY)
      } catch (error) {
        console.error(`Error in refetchStat for ${table}:`, error)
      }
    }

    // Helper function to refetch deadlines
    const refetchDeadlines = async () => {
      try {
        console.log("Refetching deadlines for manager dashboard...")

        // Get current date
        const now = new Date()

        // Fetch course electives with deadlines
        const { data: courseElectives, error: courseError } = await supabase
          .from("elective_courses")
          .select("id, name, name_ru, deadline, status")
          .eq("status", "active")
          .not("deadline", "is", null)
          .gte("deadline", now.toISOString())
          .order("deadline", { ascending: true })
          .limit(5)

        // Fetch exchange programs with deadlines
        const { data: exchangePrograms, error: exchangeError } = await supabase
          .from("elective_exchange")
          .select("id, name, name_ru, deadline, status")
          .eq("status", "published")
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

          // Clear deadlines cache
          localStorage.removeItem(DEADLINES_CACHE_KEY)
        }
      } catch (error) {
        console.error("Error refetching deadlines:", error)
      }
    }

    const channels = [
      supabase
        .channel("elective-courses-manager-dashboard")
        .on("postgres_changes", { event: "*", schema: "public", table: "elective_courses" }, (payload) => {
          console.log("Elective courses change detected:", payload)
          refetchStat("elective_courses", "courses")
          refetchDeadlines()
        })
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            console.log("✓ Manager dashboard subscribed to elective_courses changes")
          } else if (status === "CHANNEL_ERROR") {
            console.error("✗ Error subscribing to elective_courses changes")
          }
        }),

      supabase
        .channel("elective-exchange-manager-dashboard")
        .on("postgres_changes", { event: "*", schema: "public", table: "elective_exchange" }, (payload) => {
          console.log("Elective exchange change detected:", payload)
          refetchStat("elective_exchange", "exchange")
          refetchDeadlines()
        })
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            console.log("✓ Manager dashboard subscribed to elective_exchange changes")
          } else if (status === "CHANNEL_ERROR") {
            console.error("✗ Error subscribing to elective_exchange changes")
          }
        }),
    ]

    // Cleanup subscriptions on unmount
    return () => {
      channels.forEach((channel) => {
        supabase.removeChannel(channel)
      })
    }
  }, [supabase, language])

  // Log when component mounts/unmounts to track re-renders
  useEffect(() => {
    console.log("Manager Dashboard mounted")

    // Mark that we're no longer on initial mount
    isInitialMount.current = false

    return () => {
      console.log("Manager Dashboard unmounted")
    }
  }, [])


  return (
    <DashboardLayout userRole={UserRole.PROGRAM_MANAGER}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("manager.dashboard.title")}</h1>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("manager.dashboard.courseElectives")}</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoadingCounts ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{electiveCounts.courses}</div>
              )}
              <p className="text-xs text-muted-foreground">{t("manager.dashboard.totalCourseElectives")}</p>
              <Button asChild className="w-full mt-4" size="sm">
                <Link href="/manager/electives/course">{t("manager.dashboard.manageCourseElectives")}</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("manager.dashboard.exchangePrograms")}</CardTitle>
              <GlobeIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoadingCounts ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{electiveCounts.exchange}</div>
              )}
              <p className="text-xs text-muted-foreground">{t("manager.dashboard.totalExchangePrograms")}</p>
              <Button asChild className="w-full mt-4" size="sm">
                <Link href="/manager/electives/exchange">{t("manager.dashboard.manageExchangePrograms")}</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle>{t("manager.dashboard.yourInformation")}</CardTitle>
              <CardDescription>{t("manager.dashboard.managerDetails")}</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingProfile ? (
                <div className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ) : (
                <dl className="space-y-2">
                  <div className="flex justify-between">
                    <dt className="font-medium">{t("manager.dashboard.name")}:</dt>
                    <dd>{profile?.full_name || "-"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium">{t("manager.dashboard.degree")}:</dt>
                    <dd>{profile?.degrees ? (language === "ru" && profile.degrees.name_ru ? profile.degrees.name_ru : profile.degrees.name) : "-"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium">{t("manager.dashboard.year")}:</dt>
                    <dd>{profile?.academic_year || "-"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium">{t("manager.dashboard.email")}:</dt>
                    <dd>{profile?.email || "-"}</dd>
                  </div>
                </dl>
              )}
            </CardContent>
          </Card>

          <Card className="col-span-1">
            <CardHeader>
              <CardTitle>{t("manager.dashboard.upcomingDeadlines")}</CardTitle>
              <CardDescription>{t("manager.dashboard.importantDates")}</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingDeadlines ? (
                <div className="space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : upcomingDeadlines.length > 0 ? (
                <div className="space-y-4">
                  {upcomingDeadlines.map((deadline) => (
                    <div key={deadline.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{deadline.title}</p>
                        <p className="text-sm text-muted-foreground">{formatDate(deadline.date)}</p>
                      </div>
                      <Link
                        href={
                          deadline.type === "course"
                            ? `/manager/electives/course/${deadline.id}`
                            : `/manager/electives/exchange/${deadline.id}`
                        }
                      >
                        <div
                          className={`px-2 py-1 rounded-md text-xs font-medium cursor-pointer ${
                            deadline.daysLeft < 7
                              ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                              : deadline.daysLeft < 30
                                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                                : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          }`}
                        >
                          {deadline.daysLeft} {t("manager.dashboard.daysLeft")}
                        </div>
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  {t("manager.dashboard.noUpcomingDeadlines", "No upcoming deadlines")}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
