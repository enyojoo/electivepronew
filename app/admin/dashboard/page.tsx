"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Users, BookOpen, Globe, Layers, Building } from "lucide-react"
import Link from "next/link"
import { useLanguage } from "@/lib/language-context"
import { Skeleton } from "@/components/ui/skeleton"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

// Cache keys
const DASHBOARD_STATS_CACHE_KEY = "admin_dashboard_stats_cache"

// Cache expiry time (1 hour)
const CACHE_EXPIRY = 60 * 60 * 1000

interface DashboardStats {
  users: { count: number; isLoading: boolean }
  courses: { count: number; isLoading: boolean }
  groups: { count: number; isLoading: boolean }
  courseElectives: { count: number; isLoading: boolean }
  exchangePrograms: { count: number; isLoading: boolean }
  universities: { count: number; isLoading: boolean }
}

export default function AdminDashboard() {
  const { t } = useLanguage()
  const { toast } = useToast()
  const supabase = getSupabaseBrowserClient()
  const router = useRouter()

  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    users: { count: 0, isLoading: true },
    courses: { count: 0, isLoading: true },
    groups: { count: 0, isLoading: true },
    courseElectives: { count: 0, isLoading: true },
    exchangePrograms: { count: 0, isLoading: true },
    universities: { count: 0, isLoading: true },
  })

  // Load cached data on initial render
  useEffect(() => {
    const loadCachedData = () => {
      try {
        const cachedStats = localStorage.getItem(DASHBOARD_STATS_CACHE_KEY)
        if (cachedStats) {
          const { data, timestamp } = JSON.parse(cachedStats)
          if (Date.now() - timestamp < CACHE_EXPIRY) {
            setDashboardStats(data)
            return
          }
        }
      } catch (error) {
        console.error("Error loading cached dashboard stats:", error)
      }
    }

    loadCachedData()
  }, [])

  // Check authentication first
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()

        if (error || !user) {
          console.error("Auth error:", error)
          router.push("/admin/login")
          return
        }

        // Verify user is admin
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single()

        if (profileError || !profile || profile.role !== "admin") {
          console.error("Not an admin user:", profileError)
          router.push("/admin/login")
          return
        }
      } catch (error) {
        console.error("Error checking auth:", error)
        router.push("/admin/login")
      }
    }

    checkAuth()
  }, [supabase, router])

  // Fetch dashboard stats from Supabase
  useEffect(() => {
    const fetchDashboardStats = async () => {
      // Check authentication first
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return // Auth check will handle redirect
      }

      // Check if we already have valid cached data
      // But still fetch if stats are all at 0 (might be initial load)
      const cachedStats = localStorage.getItem(DASHBOARD_STATS_CACHE_KEY)
      if (cachedStats) {
        const { data, timestamp } = JSON.parse(cachedStats)
        const cacheAge = Date.now() - timestamp
        if (cacheAge < CACHE_EXPIRY) {
          // Check if any stat is still loading or if we have valid data
          const hasValidData = Object.values(data).some(
            (stat: any) => stat.count > 0 || !stat.isLoading
          )
          if (hasValidData) {
            // Already loaded from cache in previous effect, skip fetch
            return
          }
        }
      }

      // Set loading state
      setDashboardStats((prev) => ({
        users: { ...prev.users, isLoading: true },
        courses: { ...prev.courses, isLoading: true },
        groups: { ...prev.groups, isLoading: true },
        courseElectives: { ...prev.courseElectives, isLoading: true },
        exchangePrograms: { ...prev.exchangePrograms, isLoading: true },
        universities: { ...prev.universities, isLoading: true },
      }))

      try {
        // Fetch all counts in parallel - destructure count directly like manager dashboard
        const [
          { count: usersCount, error: usersError },
          { count: coursesCount, error: coursesError },
          { count: groupsCount, error: groupsError },
          { count: electivesCount, error: electivesError },
          { count: exchangeCount, error: exchangeError },
          { count: universitiesCount, error: universitiesError },
        ] = await Promise.all([
          supabase.from("profiles").select("*", { count: "exact", head: true }),
          supabase.from("courses").select("*", { count: "exact", head: true }),
          supabase.from("groups").select("*", { count: "exact", head: true }),
          supabase.from("elective_courses").select("*", { count: "exact", head: true }),
          supabase.from("elective_exchange").select("*", { count: "exact", head: true }),
          supabase.from("universities").select("*", { count: "exact", head: true }),
        ])

        // Log errors for debugging
        if (usersError) {
          console.error("Error fetching users count:", usersError)
          throw usersError
        }
        if (coursesError) {
          console.error("Error fetching courses count:", coursesError)
          throw coursesError
        }
        if (groupsError) {
          console.error("Error fetching groups count:", groupsError)
          throw groupsError
        }
        if (electivesError) {
          console.error("Error fetching elective courses count:", electivesError)
          throw electivesError
        }
        if (exchangeError) {
          console.error("Error fetching exchange programs count:", exchangeError)
          throw exchangeError
        }
        if (universitiesError) {
          console.error("Error fetching universities count:", universitiesError)
          throw universitiesError
        }

        const newStats: DashboardStats = {
          users: { count: usersCount || 0, isLoading: false },
          courses: { count: coursesCount || 0, isLoading: false },
          groups: { count: groupsCount || 0, isLoading: false },
          courseElectives: { count: electivesCount || 0, isLoading: false },
          exchangePrograms: { count: exchangeCount || 0, isLoading: false },
          universities: { count: universitiesCount || 0, isLoading: false },
        }

        console.log("Dashboard stats loaded:", newStats)
        setDashboardStats(newStats)

        // Cache the stats
        localStorage.setItem(
          DASHBOARD_STATS_CACHE_KEY,
          JSON.stringify({
            data: newStats,
            timestamp: Date.now(),
          }),
        )
      } catch (error: any) {
        console.error("Error fetching dashboard stats:", error)
        console.error("Error details:", {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        })
        toast({
          title: t("admin.dashboard.error"),
          description: error.message || t("admin.dashboard.errorLoadingStats"),
          variant: "destructive",
        })

        // Set all loading states to false even on error
        setDashboardStats((prev) => ({
          users: { ...prev.users, isLoading: false },
          courses: { ...prev.courses, isLoading: false },
          groups: { ...prev.groups, isLoading: false },
          courseElectives: { ...prev.courseElectives, isLoading: false },
          exchangePrograms: { ...prev.exchangePrograms, isLoading: false },
          universities: { ...prev.universities, isLoading: false },
        }))
      }
    }

    fetchDashboardStats()
  }, [supabase, toast, router])

  // Set up real-time subscriptions for instant updates
  useEffect(() => {
    // Helper function to refetch and update a specific stat
    const refetchStat = async (table: string, statKey: keyof DashboardStats) => {
      try {
        console.log(`Refetching ${table} count for dashboard...`)
        const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true })
        if (error) {
          console.error(`Error fetching ${table} count:`, error)
          setDashboardStats((prev) => ({
            ...prev,
            [statKey]: { ...prev[statKey], isLoading: false },
          }))
          return
        }
        console.log(`${table} count updated:`, count)
        setDashboardStats((prev) => {
          const updated = {
            ...prev,
            [statKey]: { count: count || 0, isLoading: false },
          }
          // Update cache
          localStorage.setItem(
            DASHBOARD_STATS_CACHE_KEY,
            JSON.stringify({
              data: updated,
              timestamp: Date.now(),
            }),
          )
          return updated
        })
      } catch (error) {
        console.error(`Error in refetchStat for ${table}:`, error)
        setDashboardStats((prev) => ({
          ...prev,
          [statKey]: { ...prev[statKey], isLoading: false },
        }))
      }
    }

    const channels = [
      supabase
        .channel("profiles-changes")
        .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, (payload) => {
          console.log("Profiles change detected:", payload)
          localStorage.removeItem(DASHBOARD_STATS_CACHE_KEY)
          setDashboardStats((prev) => ({
            ...prev,
            users: { ...prev.users, isLoading: true },
          }))
          refetchStat("profiles", "users")
        })
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            console.log("✓ Subscribed to profiles changes")
          } else if (status === "CHANNEL_ERROR") {
            console.error("✗ Error subscribing to profiles changes")
          }
        }),
      supabase
        .channel("groups-changes")
        .on("postgres_changes", { event: "*", schema: "public", table: "groups" }, (payload) => {
          console.log("Groups change detected:", payload)
          localStorage.removeItem(DASHBOARD_STATS_CACHE_KEY)
          setDashboardStats((prev) => ({
            ...prev,
            groups: { ...prev.groups, isLoading: true },
          }))
          refetchStat("groups", "groups")
        })
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            console.log("✓ Subscribed to groups changes")
          } else if (status === "CHANNEL_ERROR") {
            console.error("✗ Error subscribing to groups changes")
          }
        }),
      supabase
        .channel("courses-changes")
        .on("postgres_changes", { event: "*", schema: "public", table: "courses" }, (payload) => {
          console.log("Courses change detected:", payload)
          localStorage.removeItem(DASHBOARD_STATS_CACHE_KEY)
          setDashboardStats((prev) => ({
            ...prev,
            courses: { ...prev.courses, isLoading: true },
          }))
          refetchStat("courses", "courses")
        })
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            console.log("✓ Subscribed to courses changes")
          } else if (status === "CHANNEL_ERROR") {
            console.error("✗ Error subscribing to courses changes")
          }
        }),
      supabase
        .channel("elective-courses-changes")
        .on("postgres_changes", { event: "*", schema: "public", table: "elective_courses" }, (payload) => {
          console.log("Elective courses change detected:", payload)
          localStorage.removeItem(DASHBOARD_STATS_CACHE_KEY)
          setDashboardStats((prev) => ({
            ...prev,
            courseElectives: { ...prev.courseElectives, isLoading: true },
          }))
          refetchStat("elective_courses", "courseElectives")
        })
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            console.log("✓ Subscribed to elective_courses changes")
          } else if (status === "CHANNEL_ERROR") {
            console.error("✗ Error subscribing to elective_courses changes")
          }
        }),
      supabase
        .channel("elective-exchange-changes")
        .on("postgres_changes", { event: "*", schema: "public", table: "elective_exchange" }, (payload) => {
          console.log("Elective exchange change detected:", payload)
          localStorage.removeItem(DASHBOARD_STATS_CACHE_KEY)
          setDashboardStats((prev) => ({
            ...prev,
            exchangePrograms: { ...prev.exchangePrograms, isLoading: true },
          }))
          refetchStat("elective_exchange", "exchangePrograms")
        })
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            console.log("✓ Subscribed to elective_exchange changes")
          } else if (status === "CHANNEL_ERROR") {
            console.error("✗ Error subscribing to elective_exchange changes")
          }
        }),
      supabase
        .channel("universities-changes")
        .on("postgres_changes", { event: "*", schema: "public", table: "universities" }, (payload) => {
          console.log("Universities change detected:", payload)
          localStorage.removeItem(DASHBOARD_STATS_CACHE_KEY)
          setDashboardStats((prev) => ({
            ...prev,
            universities: { ...prev.universities, isLoading: true },
          }))
          refetchStat("universities", "universities")
        })
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            console.log("✓ Subscribed to universities changes")
          } else if (status === "CHANNEL_ERROR") {
            console.error("✗ Error subscribing to universities changes")
          }
        }),
    ]

    // Cleanup subscriptions on unmount
    return () => {
      channels.forEach((channel) => {
        supabase.removeChannel(channel)
      })
    }
  }, [supabase])

  return (
    <DashboardLayout userRole="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("admin.dashboard.title")}</h1>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3">
          {/* Course Electives Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("admin.dashboard.courseElectives")}</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {dashboardStats.courseElectives.isLoading ? (
                <Skeleton className="h-8 w-16 mb-1" />
              ) : (
                <div className="text-2xl font-bold">{dashboardStats.courseElectives.count}</div>
              )}
              <p className="text-xs text-muted-foreground">{t("admin.dashboard.totalCourseElectives")}</p>
              <Button asChild className="w-full mt-4" size="sm">
                <Link href="/admin/electives/course">{t("admin.dashboard.manage")}</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Exchange Programs Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("admin.dashboard.exchangePrograms")}</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {dashboardStats.exchangePrograms.isLoading ? (
                <Skeleton className="h-8 w-16 mb-1" />
              ) : (
                <div className="text-2xl font-bold">{dashboardStats.exchangePrograms.count}</div>
              )}
              <p className="text-xs text-muted-foreground">{t("admin.dashboard.totalExchangePrograms")}</p>
              <Button asChild className="w-full mt-4" size="sm">
                <Link href="/admin/electives/exchange">{t("admin.dashboard.manage")}</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Courses Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("admin.sidebar.courses")}</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {dashboardStats.courses.isLoading ? (
                <Skeleton className="h-8 w-16 mb-1" />
              ) : (
                <div className="text-2xl font-bold">{dashboardStats.courses.count}</div>
              )}
              <p className="text-xs text-muted-foreground">{t("admin.dashboard.totalCourses")}</p>
              <Button asChild className="w-full mt-4" size="sm">
                <Link href="/admin/courses">{t("admin.dashboard.manage")}</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Groups Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("admin.sidebar.groups")}</CardTitle>
              <Layers className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {dashboardStats.groups.isLoading ? (
                <Skeleton className="h-8 w-16 mb-1" />
              ) : (
                <div className="text-2xl font-bold">{dashboardStats.groups.count}</div>
              )}
              <p className="text-xs text-muted-foreground">{t("admin.dashboard.totalGroups")}</p>
              <Button asChild className="w-full mt-4" size="sm">
                <Link href="/admin/groups">{t("admin.dashboard.manage")}</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Universities Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("admin.dashboard.universities")}</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {dashboardStats.universities.isLoading ? (
                <Skeleton className="h-8 w-16 mb-1" />
              ) : (
                <div className="text-2xl font-bold">{dashboardStats.universities.count}</div>
              )}
              <p className="text-xs text-muted-foreground">{t("admin.dashboard.totalUniversities")}</p>
              <Button asChild className="w-full mt-4" size="sm">
                <Link href="/admin/universities">{t("admin.dashboard.manage")}</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Users Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("admin.sidebar.users")}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {dashboardStats.users.isLoading ? (
                <Skeleton className="h-8 w-16 mb-1" />
              ) : (
                <div className="text-2xl font-bold">{dashboardStats.users.count}</div>
              )}
              <p className="text-xs text-muted-foreground">{t("admin.dashboard.totalUsers")}</p>
              <Button asChild className="w-full mt-4" size="sm">
                <Link href="/admin/settings?tab=users">{t("admin.dashboard.manage")}</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
