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
import { createClient } from "@supabase/supabase-js"
import { useToast } from "@/hooks/use-toast"
import { useCachedStudentProfile } from "@/hooks/use-cached-student-profile"
import { TableSkeleton } from "@/components/ui/table-skeleton"

// Create a singleton Supabase client to prevent multiple instances
const supabaseClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export default function ExchangePage() {
  const { t, language } = useLanguage()
  const { toast } = useToast()
  const { profile, isLoading: profileLoading, error: profileError } = useCachedStudentProfile()
  const [exchangePrograms, setExchangePrograms] = useState<any[]>([])
  const [exchangeSelections, setExchangeSelections] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    console.log("ExchangePage: useEffect triggered.")
    if (profileLoading) {
      console.log("ExchangePage: Profile is loading.")
      setIsLoading(true)
      return
    }

    if (profileError) {
      console.error("ExchangePage: Profile loading error:", profileError)
      setFetchError(`Failed to load profile: ${profileError}`)
      setIsLoading(false)
      return
    }

    if (!profile?.id || !profile.group?.id) {
      console.log("ExchangePage: Profile ID or Group ID missing.", profile)
      setFetchError(
        "Student profile information (including group assignment) is incomplete. Cannot fetch group-specific exchange programs.",
      )
      setIsLoading(false)
      setExchangePrograms([])
      setExchangeSelections([])
      return
    }

    console.log("ExchangePage: Profile loaded:", profile)

    const fetchData = async () => {
      setIsLoading(true)
      setFetchError(null)
      console.log(
        "ExchangePage: Starting data fetch for group:",
        profile.group.id,
      )
      try {
        // Fetch exchange programs for the group
        console.log("ExchangePage: Fetching elective_exchange...")
        const { data: exchangeData, error: exchangeError } = await supabaseClient
          .from("elective_exchange")
          .select("*")
          .eq("group_id", profile.group.id)
          .order("deadline", { ascending: false })

        if (exchangeError) {
          console.error("ExchangePage: Error fetching elective_exchange:", exchangeError)
          throw exchangeError
        }
        console.log("ExchangePage: elective_exchange fetched:", exchangeData)
        setExchangePrograms(exchangeData || [])

        // Fetch student's exchange selections
        console.log("ExchangePage: Fetching exchange_selections for student:", profile.id)
        const { data: selectionsData, error: selectionsError } = await supabaseClient
          .from("exchange_selections")
          .select("*")
          .eq("student_id", profile.id)

        if (selectionsError) {
          console.error("ExchangePage: Error fetching exchange_selections:", selectionsError)
          throw selectionsError
        }
        console.log("ExchangePage: exchange_selections fetched:", selectionsData)
        setExchangeSelections(selectionsData || [])
      } catch (error: any) {
        console.error("ExchangePage: Data fetching error:", error)
        setFetchError(error.message || "Failed to load exchange programs data.")
        toast({
          title: "Error",
          description: error.message || "Failed to load exchange programs",
          variant: "destructive",
        })
        setExchangePrograms([])
        setExchangeSelections([])
      } finally {
        console.log("ExchangePage: Data fetch finished.")
        setIsLoading(false)
      }
    }

    fetchData()
  }, [profile, profileLoading, profileError, toast])

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

  if (profileLoading || isLoading) {
    return (
      <DashboardLayout userRole={UserRole.STUDENT}>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("student.exchange.title")}</h1>
            <p className="text-muted-foreground">{t("student.exchange.subtitle")}</p>
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

        {!fetchError && exchangePrograms.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Inbox className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-muted-foreground">{t("student.exchange.noExchangeFound")}</p>
              <p className="text-sm text-muted-foreground mt-1">{t("student.exchange.checkBackLater")}</p>
            </CardContent>
          </Card>
        )}

        {!fetchError && exchangePrograms.length > 0 && (
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
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
