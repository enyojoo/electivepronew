"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { useLanguage } from "@/lib/language-context"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import {
  CheckCircle,
  Circle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Settings,
  GraduationCap,
  Users,
  Building,
  BookOpen,
  UserPlus
} from "lucide-react"
import { cn } from "@/lib/utils"

// Cache configuration
const CHECKLIST_CACHE_KEY = "admin_onboarding_checklist"
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
const DISMISSED_CACHE_KEY = "admin_checklist_dismissed"

interface ChecklistItem {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  link: string
  completed: boolean
  loading?: boolean
}

interface ChecklistStatus {
  brandSettings: boolean
  degrees: boolean
  groups: boolean
  universities: boolean
  courses: boolean
  users: boolean
}

interface CachedData {
  status: ChecklistStatus
  timestamp: number
}

export function OnboardingChecklist() {
  const { t } = useLanguage()
  const router = useRouter()
  const pathname = usePathname()
  const supabase = getSupabaseBrowserClient()

  const [checklistStatus, setChecklistStatus] = useState<ChecklistStatus>({
    brandSettings: false,
    degrees: false,
    groups: false,
    universities: false,
    courses: false,
    users: false,
  })

  const [isLoading, setIsLoading] = useState(true)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    // Load collapse state from localStorage
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("admin_checklist_collapsed")
      return saved ? JSON.parse(saved) : false
    }
    return false
  })
  const [forceRefresh, setForceRefresh] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  // Only show for admin users and when not dismissed
  const isAdmin = pathname.includes("/admin")
  const allStepsComplete = useMemo(() =>
    Object.values(checklistStatus).every(status => status),
    [checklistStatus]
  )

  // Check if checklist has been manually dismissed
  const isDismissed = useMemo(() => {
    if (typeof window === "undefined") return false
    try {
      return localStorage.getItem(DISMISSED_CACHE_KEY) === "true"
    } catch {
      return false
    }
  }, [])

  const shouldShow = isAdmin && !isDismissed

  // Get cached data
  const getCachedStatus = (): CachedData | null => {
    if (typeof window === "undefined") return null
    try {
      const cached = localStorage.getItem(CHECKLIST_CACHE_KEY)
      if (cached) {
        const parsed: CachedData = JSON.parse(cached)
        if (Date.now() - parsed.timestamp < CACHE_DURATION) {
          return parsed
        }
      }
    } catch (error) {
      console.error("Error reading checklist cache:", error)
    }
    return null
  }

  // Set cached data
  const setCachedStatus = (status: ChecklistStatus) => {
    if (typeof window === "undefined") return
    try {
      const cacheData: CachedData = {
        status,
        timestamp: Date.now(),
      }
      localStorage.setItem(CHECKLIST_CACHE_KEY, JSON.stringify(cacheData))
    } catch (error) {
      console.error("Error writing checklist cache:", error)
    }
  }

  // Selectively invalidate cache based on changed table
  const invalidateCacheForTable = (tableName: string) => {
    if (typeof window === "undefined") return

    try {
      const cached = getCachedStatus()
      if (!cached) return

      const updatedStatus = { ...cached.status }

      // Invalidate specific status based on table
      switch (tableName) {
        case "brand_settings":
          updatedStatus.brandSettings = false // Will be rechecked
          break
        case "degrees":
          updatedStatus.degrees = false
          break
        case "groups":
          updatedStatus.groups = false
          break
        case "universities":
          updatedStatus.universities = false
          break
        case "courses":
          updatedStatus.courses = false
          break
        case "profiles":
          updatedStatus.users = false
          break
      }

      // Update cache with invalidated status
      const cacheData: CachedData = {
        status: updatedStatus,
        timestamp: Date.now(),
      }
      localStorage.setItem(CHECKLIST_CACHE_KEY, JSON.stringify(cacheData))

    } catch (error) {
      console.error("Error invalidating cache for table:", error)
    }
  }

  // Check completion status from database
  const checkCompletionStatus = async (): Promise<ChecklistStatus> => {
    try {
      // Check brand settings - configured if English name exists OR (Russian name AND Russian logo exist)
      const { data: brandData } = await supabase
        .from("brand_settings")
        .select("institution_name, institution_name_ru, logo_url, logo_url_ru")
        .limit(1)
        .maybeSingle()

      const brandSettings = brandData && (
        // English version is configured
        brandData.institution_name ||
        // OR Russian version is fully configured (name + logo)
        (brandData.institution_name_ru && brandData.logo_url_ru)
      )

      // Check degrees
      const { count: degreesCount } = await supabase
        .from("degrees")
        .select("*", { count: "exact", head: true })
        .eq("status", "active")
      const degrees = (degreesCount || 0) > 0

      // Check groups
      const { count: groupsCount } = await supabase
        .from("groups")
        .select("*", { count: "exact", head: true })
        .eq("status", "active")
      const groups = (groupsCount || 0) > 0

      // Check universities
      const { count: universitiesCount } = await supabase
        .from("universities")
        .select("*", { count: "exact", head: true })
      const universities = (universitiesCount || 0) > 0

      // Check courses
      const { count: coursesCount } = await supabase
        .from("courses")
        .select("*", { count: "exact", head: true })
      const courses = (coursesCount || 0) > 0

      // Check users (students and program managers)
      const { count: usersCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .in("role", ["student", "program_manager"])
      const users = (usersCount || 0) > 0

      // Check electives (course electives or exchange programs)
      const { count: courseElectivesCount } = await supabase
        .from("elective_courses")
        .select("*", { count: "exact", head: true })

      const { count: exchangeElectivesCount } = await supabase
        .from("elective_exchange")
        .select("*", { count: "exact", head: true })

      const electives = ((courseElectivesCount || 0) + (exchangeElectivesCount || 0)) > 0

      const status: ChecklistStatus = {
        brandSettings: !!brandSettings,
        degrees,
        groups,
        universities,
        courses,
        users,
      }

      return status
    } catch (error) {
      console.error("Error checking completion status:", error)
      // Return current status on error to avoid breaking the UI
      return checklistStatus
    }
  }

  // Load checklist status on mount and when needed
  useEffect(() => {
    if (!isAdmin) return // Only load for admin users

    const loadChecklistStatus = async () => {
      setIsLoading(true)

      // Check cache first
      const cached = getCachedStatus()
      if (cached && forceRefresh === 0) {
        setChecklistStatus(cached.status)
        setIsLoading(false)
        return
      }

      // Fetch from database
      const status = await checkCompletionStatus()
      setChecklistStatus(status)
      setCachedStatus(status)
      setIsLoading(false)
    }

    loadChecklistStatus()
  }, [isAdmin, forceRefresh])

  // Real-time updates via database listeners
  useEffect(() => {
    if (!isAdmin) return

    const channel = supabase
      .channel("onboarding-checklist-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "brand_settings" },
        () => {
          console.log("Brand settings changed, invalidating cache")
          invalidateCacheForTable("brand_settings")
          setForceRefresh(prev => prev + 1)
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "degrees" },
        () => {
          console.log("Degrees changed, invalidating cache")
          invalidateCacheForTable("degrees")
          setForceRefresh(prev => prev + 1)
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "groups" },
        () => {
          console.log("Groups changed, invalidating cache")
          invalidateCacheForTable("groups")
          setForceRefresh(prev => prev + 1)
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "universities" },
        () => {
          console.log("Universities changed, invalidating cache")
          invalidateCacheForTable("universities")
          setForceRefresh(prev => prev + 1)
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "courses" },
        () => {
          console.log("Courses changed, invalidating cache")
          invalidateCacheForTable("courses")
          setForceRefresh(prev => prev + 1)
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => {
          console.log("Profiles changed, invalidating cache")
          invalidateCacheForTable("profiles")
          setForceRefresh(prev => prev + 1)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [isAdmin, supabase])

  // Data deletion recovery - detect when required data is deleted
  useEffect(() => {
    if (!isAdmin) return

    const checkForDataDeletion = () => {
      const cached = getCachedStatus()
      if (!cached) return

      // Check if previously completed steps are now incomplete
      const currentComplete = Object.values(checklistStatus).filter(Boolean).length
      const cachedComplete = Object.values(cached.status).filter(Boolean).length

      // If we had more completed steps cached than we have now, data was deleted
      // The checklist will automatically show again due to shouldShow logic
      if (cachedComplete > currentComplete) {
        console.log("Data deletion detected - checklist will show again")
      }
    }

    checkForDataDeletion()
  }, [checklistStatus, isAdmin])

  // Handle collapse state changes with animation
  const toggleCollapsed = () => {
    setIsAnimating(true)
    const newCollapsed = !isCollapsed
    setIsCollapsed(newCollapsed)
    localStorage.setItem("admin_checklist_collapsed", JSON.stringify(newCollapsed))

    // Reset animation state after transition
    setTimeout(() => setIsAnimating(false), 300)
  }

  // Handle manual dismissal of the checklist
  const dismissChecklist = () => {
    localStorage.setItem(DISMISSED_CACHE_KEY, "true")
    // The component will automatically hide on next render due to shouldShow logic
  }

  // Handle navigation to specific step
  const navigateToStep = (link: string) => {
    router.push(link)
  }

  // Calculate progress
  const completedCount = Object.values(checklistStatus).filter(Boolean).length
  const totalCount = Object.keys(checklistStatus).length
  const progressPercentage = (completedCount / totalCount) * 100

  // Define checklist items
  const checklistItems: ChecklistItem[] = [
    {
      id: "brandSettings",
      title: t("admin.checklist.brandSettings", "Update Brand Settings"),
      description: t("admin.checklist.brandSettingsDesc", "Set institution name, logo, and branding"),
      icon: <Settings className="h-4 w-4" />,
      link: "/admin/settings?tab=settings",
      completed: checklistStatus.brandSettings,
    },
    {
      id: "degrees",
      title: t("admin.checklist.degrees", "Create Degrees"),
      description: t("admin.checklist.degreesDesc", "Add academic degree programs"),
      icon: <GraduationCap className="h-4 w-4" />,
      link: "/admin/settings?tab=degrees",
      completed: checklistStatus.degrees,
    },
    {
      id: "groups",
      title: t("admin.checklist.groups", "Create Groups"),
      description: t("admin.checklist.groupsDesc", "Set up student groups within degrees"),
      icon: <Users className="h-4 w-4" />,
      link: "/admin/groups",
      completed: checklistStatus.groups,
    },
    {
      id: "universities",
      title: t("admin.checklist.universities", "Add Partner Universities"),
      description: t("admin.checklist.universitiesDesc", "Add exchange partner institutions"),
      icon: <Building className="h-4 w-4" />,
      link: "/admin/universities",
      completed: checklistStatus.universities,
    },
    {
      id: "courses",
      title: t("admin.checklist.courses", "Create Course Catalogues"),
      description: t("admin.checklist.coursesDesc", "Create available courses for electives"),
      icon: <BookOpen className="h-4 w-4" />,
      link: "/admin/courses",
      completed: checklistStatus.courses,
    },
    {
      id: "users",
      title: t("admin.checklist.users", "Import/Create Users"),
      description: t("admin.checklist.usersDesc", "Import or create student and manager accounts"),
      icon: <UserPlus className="h-4 w-4" />,
      link: "/admin/settings?tab=users",
      completed: checklistStatus.users,
    },
  ]

  // Don't render if shouldn't show
  if (!shouldShow) return null

  return (
    <div className="mx-2 sm:mx-4 mb-2 sm:mb-4">
      <Card
        className="shadow-sm border transition-all duration-300 hover:shadow-md"
        role="region"
        aria-labelledby="checklist-title"
        aria-describedby="checklist-progress"
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle id="checklist-title" className="text-xs font-medium">
                {t("admin.checklist.title", "Setup Checklist")}
              </CardTitle>
              <Badge variant="secondary" className="text-xs" aria-label={`${completedCount} of ${totalCount} steps completed`}>
                {completedCount}/{totalCount}
              </Badge>
            </div>
            {allStepsComplete ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={dismissChecklist}
                className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
                aria-label="Dismiss setup checklist"
              >
                <svg
                  className="h-3 w-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleCollapsed}
                className="h-6 w-6 p-0"
                aria-label={isCollapsed ? "Expand setup checklist" : "Collapse setup checklist"}
                aria-expanded={!isCollapsed}
                aria-controls="checklist-content"
              >
                {isCollapsed ? (
                  <ChevronDown className="h-3 w-3" aria-hidden="true" />
                ) : (
                  <ChevronUp className="h-3 w-3" aria-hidden="true" />
                )}
              </Button>
            )}
          </div>

          {!isCollapsed && (
            <div className={cn(
              "space-y-2 overflow-hidden transition-all duration-300 ease-in-out",
              isAnimating ? "animate-in slide-in-from-top-2" : ""
            )}>
              <Progress value={progressPercentage} className="h-2 transition-all duration-500" />
              <p id="checklist-progress" className="text-[10px] text-muted-foreground">
                {progressPercentage === 100
                  ? t("admin.checklist.readyToGo", "You're all set! Managers can now create electives.")
                  : t("admin.checklist.progress", `${completedCount} of ${totalCount} steps completed`)
                }
              </p>
            </div>
          )}

          {/* Show completion celebration when all steps are done */}
          {allStepsComplete && !isCollapsed && (
            <div className="px-4 pb-3 border-t bg-green-50/50 dark:bg-green-950/20">
              <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
                <CheckCircle className="h-4 w-4" />
                <span className="font-medium">
                  {t("admin.checklist.congratulations", "Congratulations!")}
                </span>
              </div>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                {t("admin.checklist.systemReady", "Your system is fully configured and ready to use.")}
              </p>
            </div>
          )}
        </CardHeader>

        {!isCollapsed && !allStepsComplete && (
          <CardContent
            id="checklist-content"
            className={cn(
              "pt-0 px-3 overflow-hidden transition-all duration-300 ease-in-out",
              isAnimating ? "animate-in slide-in-from-top-2" : ""
            )}
            aria-labelledby="checklist-progress"
          >
            <div className="space-y-2">
              {checklistItems.map((item, index) => (
                <button
                  key={item.id}
                  onClick={() => navigateToStep(item.link)}
                  className={cn(
                    "w-full text-left p-2 rounded-md transition-all duration-200 hover:bg-accent/50",
                    "flex items-start gap-2 group",
                    "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50",
                    item.completed ? "opacity-75 cursor-not-allowed" : "cursor-pointer hover:scale-[1.02]",
                    "sm:p-2" // Consistent smaller padding
                  )}
                  disabled={item.completed}
                  aria-label={`${item.title}: ${item.completed ? 'Completed' : 'Click to complete'}`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {item.loading ? (
                      <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                    ) : item.completed ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={cn(
                        "flex-shrink-0 transition-colors duration-200",
                        item.completed ? "text-green-600" : "text-foreground group-hover:text-primary"
                      )}>
                        {item.icon}
                      </div>
                      <h4 className={cn(
                        "text-xs font-medium truncate transition-colors duration-200",
                        item.completed ? "text-green-700" : "text-foreground group-hover:text-primary"
                      )}>
                        {item.title}
                      </h4>
                    </div>
                    <p className={cn(
                      "text-[10px] text-muted-foreground transition-colors duration-200",
                      "sm:block hidden leading-tight"
                    )}>
                      {item.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
}