"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Users, BookOpen, Globe, Layers, Building } from "lucide-react"
import Link from "next/link"
import { useLanguage } from "@/lib/language-context"
import { Skeleton } from "@/components/ui/skeleton"
import { supabase } from "@/lib/supabase"
import { useDataCache } from "@/lib/data-cache-context"
import { useToast } from "@/hooks/use-toast"
export default function AdminDashboard() {
  const { t } = useLanguage()
  const { toast } = useToast()
  const { getCachedData, setCachedData } = useDataCache()

  const [dashboardStats, setDashboardStats] = useState({
    users: { count: 0, isLoading: true },
    programs: { count: 0, isLoading: true },
    courses: { count: 0, isLoading: true },
    groups: { count: 0, isLoading: true },
    courseElectives: { count: 0, isLoading: true },
    exchangePrograms: { count: 0, isLoading: true },
    universities: { count: 0, isLoading: true },
  })

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        // Try to get stats from cache
        const cachedStats = getCachedData<typeof dashboardStats>("dashboardStats")

        if (cachedStats) {
          setDashboardStats(cachedStats)
          return
        }

        // Fetch users count
        const { count: usersCount, error: usersError } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })

        if (usersError) throw usersError

        // Fetch programs count
        const { count: programsCount, error: programsError } = await supabase
          .from("programs")
          .select("*", { count: "exact", head: true })

        if (programsError) throw programsError

        // Fetch courses count
        const { count: coursesCount, error: coursesError } = await supabase
          .from("courses")
          .select("*", { count: "exact", head: true })

        if (coursesError) throw coursesError

        // Fetch groups count
        const { count: groupsCount, error: groupsError } = await supabase
          .from("groups")
          .select("*", { count: "exact", head: true })

        if (groupsError) throw groupsError

        // Fetch course electives count from elective_courses table
        const { count: electivesCount, error: electivesError } = await supabase
          .from("elective_courses")
          .select("*", { count: "exact", head: true })

        if (electivesError) throw electivesError

        // Fetch exchange programs count from elective_exchange table
        const { count: exchangeCount, error: exchangeError } = await supabase
          .from("elective_exchange")
          .select("*", { count: "exact", head: true })

        if (exchangeError) throw exchangeError

        // Fetch universities count
        const { count: universitiesCount, error: universitiesError } = await supabase
          .from("universities")
          .select("*", { count: "exact", head: true })

        if (universitiesError) throw universitiesError

        const newStats = {
          users: { count: usersCount || 0, isLoading: false },
          programs: { count: programsCount || 0, isLoading: false },
          courses: { count: coursesCount || 0, isLoading: false },
          groups: { count: groupsCount || 0, isLoading: false },
          courseElectives: { count: electivesCount || 0, isLoading: false },
          exchangePrograms: { count: exchangeCount || 0, isLoading: false },
          universities: { count: universitiesCount || 0, isLoading: false },
        }

        setDashboardStats(newStats)

        // Cache the stats
        setCachedData("dashboardStats", newStats)
      } catch (error) {
        console.error("Error fetching dashboard stats:", error)
        toast({
          title: "Error",
          description: "Failed to load dashboard statistics",
          variant: "destructive",
        })

        // Set all loading states to false even on error
        setDashboardStats((prev) => {
          const updated = { ...prev }
          Object.keys(updated).forEach((key) => {
            updated[key as keyof typeof updated].isLoading = false
          })
          return updated
        })
      }
    }

    fetchDashboardStats()
  }, [getCachedData, setCachedData, toast])

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
                <Link href="/admin/electives?tab=courses">{t("admin.dashboard.manage")}</Link>
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
                <Link href="/admin/electives?tab=exchange">{t("admin.dashboard.manage")}</Link>
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
                <Link href="/admin/users">{t("admin.dashboard.manage")}</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
