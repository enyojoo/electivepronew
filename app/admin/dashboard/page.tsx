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

// Cache keys
const DASHBOARD_STATS_CACHE_KEY = "admin_dashboard_stats_cache"

// Cache expiry time (1 hour)
const CACHE_EXPIRY = 60 * 60 * 1000

interface DashboardStats {
  users: { count: number; isLoading: boolean }
  programs: { count: number; isLoading: boolean }
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

  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    users: { count: 0, isLoading: true },
    programs: { count: 0, isLoading: true },
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

  // Fetch dashboard stats from Supabase
  useEffect(() => {
    const fetchDashboardStats = async () => {
      // Check if we already have valid cached data
      const cachedStats = localStorage.getItem(DASHBOARD_STATS_CACHE_KEY)
      if (cachedStats) {
        const { data, timestamp } = JSON.parse(cachedStats)
        if (Date.now() - timestamp < CACHE_EXPIRY) {
          // Already loaded from cache in previous effect
          return
        }
      }

      // Set loading state
      setDashboardStats((prev) => ({
        users: { ...prev.users, isLoading: true },
        programs: { ...prev.programs, isLoading: true },
        courses: { ...prev.courses, isLoading: true },
        groups: { ...prev.groups, isLoading: true },
        courseElectives: { ...prev.courseElectives, isLoading: true },
        exchangePrograms: { ...prev.exchangePrograms, isLoading: true },
        universities: { ...prev.universities, isLoading: true },
      }))

      try {
        // Fetch all counts in parallel
        const [
          usersResult,
          programsResult,
          coursesResult,
          groupsResult,
          electivesResult,
          exchangeResult,
          universitiesResult,
        ] = await Promise.all([
          supabase.from("profiles").select("*", { count: "exact", head: true }),
          supabase.from("programs").select("*", { count: "exact", head: true }),
          supabase.from("courses").select("*", { count: "exact", head: true }),
          supabase.from("groups").select("*", { count: "exact", head: true }),
          supabase.from("elective_courses").select("*", { count: "exact", head: true }),
          supabase.from("elective_exchange").select("*", { count: "exact", head: true }),
          supabase.from("exchange_universities").select("*", { count: "exact", head: true }),
        ])

        if (usersResult.error) throw usersResult.error
        if (programsResult.error) throw programsResult.error
        if (coursesResult.error) throw coursesResult.error
        if (groupsResult.error) throw groupsResult.error
        if (electivesResult.error) throw electivesResult.error
        if (exchangeResult.error) throw exchangeResult.error
        if (universitiesResult.error) throw universitiesResult.error

        const newStats: DashboardStats = {
          users: { count: usersResult.count || 0, isLoading: false },
          programs: { count: programsResult.count || 0, isLoading: false },
          courses: { count: coursesResult.count || 0, isLoading: false },
          groups: { count: groupsResult.count || 0, isLoading: false },
          courseElectives: { count: electivesResult.count || 0, isLoading: false },
          exchangePrograms: { count: exchangeResult.count || 0, isLoading: false },
          universities: { count: universitiesResult.count || 0, isLoading: false },
        }

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
        toast({
          title: "Error",
          description: "Failed to load dashboard statistics",
          variant: "destructive",
        })

        // Set all loading states to false even on error
        setDashboardStats((prev) => ({
          users: { ...prev.users, isLoading: false },
          programs: { ...prev.programs, isLoading: false },
          courses: { ...prev.courses, isLoading: false },
          groups: { ...prev.groups, isLoading: false },
          courseElectives: { ...prev.courseElectives, isLoading: false },
          exchangePrograms: { ...prev.exchangePrograms, isLoading: false },
          universities: { ...prev.universities, isLoading: false },
        }))
      }
    }

    fetchDashboardStats()
  }, [supabase, toast])

  // Set up real-time subscriptions for instant updates
  useEffect(() => {
    const channels = [
      supabase
        .channel("profiles-changes")
        .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
          // Invalidate cache and refetch
          localStorage.removeItem(DASHBOARD_STATS_CACHE_KEY)
          setDashboardStats((prev) => ({
            ...prev,
            users: { ...prev.users, isLoading: true },
          }))
          // Refetch users count
          supabase
            .from("profiles")
            .select("*", { count: "exact", head: true })
            .then(({ count }) => {
              setDashboardStats((prev) => ({
                ...prev,
                users: { count: count || 0, isLoading: false },
              }))
            })
        })
        .subscribe(),
      supabase
        .channel("groups-changes")
        .on("postgres_changes", { event: "*", schema: "public", table: "groups" }, () => {
          localStorage.removeItem(DASHBOARD_STATS_CACHE_KEY)
          setDashboardStats((prev) => ({
            ...prev,
            groups: { ...prev.groups, isLoading: true },
          }))
          supabase
            .from("groups")
            .select("*", { count: "exact", head: true })
            .then(({ count }) => {
              setDashboardStats((prev) => ({
                ...prev,
                groups: { count: count || 0, isLoading: false },
              }))
            })
        })
        .subscribe(),
      supabase
        .channel("courses-changes")
        .on("postgres_changes", { event: "*", schema: "public", table: "courses" }, () => {
          localStorage.removeItem(DASHBOARD_STATS_CACHE_KEY)
          setDashboardStats((prev) => ({
            ...prev,
            courses: { ...prev.courses, isLoading: true },
          }))
          supabase
            .from("courses")
            .select("*", { count: "exact", head: true })
            .then(({ count }) => {
              setDashboardStats((prev) => ({
                ...prev,
                courses: { count: count || 0, isLoading: false },
              }))
            })
        })
        .subscribe(),
      supabase
        .channel("elective-courses-changes")
        .on("postgres_changes", { event: "*", schema: "public", table: "elective_courses" }, () => {
          localStorage.removeItem(DASHBOARD_STATS_CACHE_KEY)
          setDashboardStats((prev) => ({
            ...prev,
            courseElectives: { ...prev.courseElectives, isLoading: true },
          }))
          supabase
            .from("elective_courses")
            .select("*", { count: "exact", head: true })
            .then(({ count }) => {
              setDashboardStats((prev) => ({
                ...prev,
                courseElectives: { count: count || 0, isLoading: false },
              }))
            })
        })
        .subscribe(),
      supabase
        .channel("elective-exchange-changes")
        .on("postgres_changes", { event: "*", schema: "public", table: "elective_exchange" }, () => {
          localStorage.removeItem(DASHBOARD_STATS_CACHE_KEY)
          setDashboardStats((prev) => ({
            ...prev,
            exchangePrograms: { ...prev.exchangePrograms, isLoading: true },
          }))
          supabase
            .from("elective_exchange")
            .select("*", { count: "exact", head: true })
            .then(({ count }) => {
              setDashboardStats((prev) => ({
                ...prev,
                exchangePrograms: { count: count || 0, isLoading: false },
              }))
            })
        })
        .subscribe(),
      supabase
        .channel("universities-changes")
        .on("postgres_changes", { event: "*", schema: "public", table: "universities" }, () => {
          localStorage.removeItem(DASHBOARD_STATS_CACHE_KEY)
          setDashboardStats((prev) => ({
            ...prev,
            universities: { ...prev.universities, isLoading: true },
          }))
          supabase
            .from("universities")
            .select("*", { count: "exact", head: true })
            .then(({ count }) => {
              setDashboardStats((prev) => ({
                ...prev,
                universities: { count: count || 0, isLoading: false },
              }))
            })
        })
        .subscribe(),
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
