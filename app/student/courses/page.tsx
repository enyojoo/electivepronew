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
import { TableSkeleton } from "@/components/ui/table-skeleton"

export default function ElectivesPage() {
  const { t, language } = useLanguage()
  const { toast } = useToast()
  const { profile, isLoading: profileLoading, error: profileError } = useCachedStudentProfile()
  const [electiveCourses, setElectiveCourses] = useState<any[]>([])
  const [courseSelections, setCourseSelections] = useState<any[]>([])
  const supabaseClient = getSupabaseBrowserClient()
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    console.log("ElectivesPage: useEffect triggered.")
    if (profileLoading) {
      console.log("ElectivesPage: Profile is loading.")
      setIsLoading(true)
      return
    }

    if (profileError) {
      console.error("ElectivesPage: Profile loading error:", profileError)
      setFetchError(`Failed to load profile: ${profileError}`)
      setIsLoading(false)
      return
    }

    if (!profile?.id || !profile.group?.id) {
      console.log("ElectivesPage: Profile ID or Group ID missing.", profile)
      setFetchError(
        "Student profile information (including group assignment) is incomplete. Cannot fetch group-specific electives.",
      )
      setIsLoading(false)
      setElectiveCourses([])
      setCourseSelections([])
      return
    }

    console.log("ElectivesPage: Profile loaded:", profile)

    const fetchData = async () => {
      setIsLoading(true)
      setFetchError(null)
      console.log(
        "ElectivesPage: Starting data fetch for group:",
        profile.group.id,
      )
      try {
        // Fetch elective courses for the group
        // elective_courses is the main table with name, deadline, max_selections, etc.
        console.log("ElectivesPage: Fetching elective_courses...")
        const { data: coursesData, error: coursesError } = await supabaseClient
          .from("elective_courses")
          .select("*")
          .eq("group_id", profile.group.id)
          .eq("status", "published")
          .order("deadline", { ascending: false })

        if (coursesError) {
          console.error("ElectivesPage: Error fetching elective_courses:", coursesError)
          throw coursesError
        }
        console.log("ElectivesPage: elective_courses fetched:", coursesData)
        setElectiveCourses(coursesData || [])

        // Fetch student's course selections
        console.log("ElectivesPage: Fetching course_selections for student:", profile.id)
        const { data: selectionsData, error: selectionsError } = await supabaseClient
          .from("course_selections")
          .select("*")
          .eq("student_id", profile.id)

        if (selectionsError) {
          console.error("ElectivesPage: Error fetching course_selections:", selectionsError)
          throw selectionsError
        }
        console.log("ElectivesPage: course_selections fetched:", selectionsData)
        setCourseSelections(selectionsData || [])
      } catch (error: any) {
        console.error("ElectivesPage: Data fetching error:", error)
        setFetchError(error.message || "Failed to load elective courses data.")
        toast({
          title: "Error",
          description: error.message || "Failed to load elective courses",
          variant: "destructive",
        })
        setElectiveCourses([]) // Clear data on error
        setCourseSelections([])
      } finally {
        console.log("ElectivesPage: Data fetch finished.")
        setIsLoading(false)
      }
    }

    fetchData()
  }, [profile, profileLoading, profileError, toast])

  // Set up real-time subscriptions for instant updates
  useEffect(() => {
    if (!profile?.id || !profile?.group?.id) return

    const channel = supabaseClient
      .channel("student-courses-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "elective_courses" },
        async () => {
          console.log("Elective courses changed, refetching student courses")
          // Refetch data
          if (!profile?.id || !profile?.group?.id) return

          const fetchData = async () => {
            try {
              // Fetch elective courses for the group
              const { data: coursesData, error: coursesError } = await supabaseClient
                .from("elective_courses")
                .select("*")
                .eq("group_id", profile.group.id)
                .eq("status", "published")
                .order("deadline", { ascending: false })

              if (coursesError) throw coursesError
              setElectiveCourses(coursesData || [])

              // Fetch student's course selections
              const { data: selectionsData, error: selectionsError } = await supabaseClient
                .from("course_selections")
                .select("*")
                .eq("student_id", profile.id)

              if (selectionsError) throw selectionsError
              setCourseSelections(selectionsData || [])
            } catch (error: any) {
              console.error("Error refetching data:", error)
            }
          }

          await fetchData()
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "course_selections", filter: `student_id=eq.${profile.id}` },
        async () => {
          console.log("Student selections changed, refetching selections")
          // Refetch selections only
          const { data: selectionsData, error: selectionsError } = await supabaseClient
            .from("course_selections")
            .select("*")
            .eq("student_id", profile.id)

          if (!selectionsError) {
            setCourseSelections(selectionsData || [])
          }
        }
      )
      .subscribe()

    return () => {
      supabaseClient.removeChannel(channel)
    }
  }, [supabaseClient, profile?.id, profile?.group?.id])

  const formatDate = (dateString: string) => {
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

  if (profileLoading || isLoading) {
    return (
      <DashboardLayout userRole={UserRole.STUDENT}>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("student.courses.title")}</h1>
            <p className="text-muted-foreground">{t("student.courses.subtitle")}</p>
          </div>
          <TableSkeleton numberOfRows={3} />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout userRole={UserRole.STUDENT}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("student.courses.title")}</h1>
          <p className="text-muted-foreground">{t("student.courses.subtitle")}</p>
        </div>

        {fetchError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{fetchError}</AlertDescription>
          </Alert>
        )}

        {!fetchError && electiveCourses.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Inbox className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-muted-foreground">{t("student.courses.noCoursesFound")}</p>
              <p className="text-sm text-muted-foreground mt-1">{t("student.courses.checkBackLater")}</p>
            </CardContent>
          </Card>
        )}

        {!fetchError && electiveCourses.length > 0 && (
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
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
                  <CardFooter className="flex flex-col pt-0 pb-4 gap-4">
                    <div className="flex flex-col gap-y-2 text-sm w-full">
                      {deadline && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted-foreground">{t("student.courses.deadline")}:</span>
                          <span className={deadlinePassed ? "text-red-600" : ""}>{formatDate(deadline)}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-4">
                        {maxSelections && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground">{t("student.courses.limit")}:</span>
                            <span>{maxSelections}</span>
                          </div>
                        )}
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
                        {t("student.courses.selected")}: {selectedCount}{maxSelections ? `/${maxSelections}` : ""}
                      </span>
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
