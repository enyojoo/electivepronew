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
  UserPlus,
  Target
} from "lucide-react"
import { cn } from "@/lib/utils"

// Cache configuration
const CHECKLIST_CACHE_KEY = "admin_onboarding_checklist"
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

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
  electives: boolean
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
    electives: false,
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

  // Only show for admin users and when not all steps are complete
  const isAdmin = pathname.includes("/admin")
  const allStepsComplete = useMemo(() =>
    Object.values(checklistStatus).every(status => status),
    [checklistStatus]
  )
  const shouldShow = isAdmin && !allStepsComplete

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

  // Check completion status from database
  const checkCompletionStatus = async (): Promise<ChecklistStatus> => {
    try {
      // Check brand settings
      const { data: brandData } = await supabase
        .from("brand_settings")
        .select("institution_name")
        .limit(1)
      const brandSettings = brandData && brandData.length > 0 && brandData[0].institution_name

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
        electives,
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
    if (!shouldShow) return

    const loadChecklistStatus = async () => {
      setIsLoading(true)

      // Check cache first
      const cached = getCachedStatus()
      if (cached) {
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
  }, [shouldShow])

  // Handle collapse state changes
  const toggleCollapsed = () => {
    const newCollapsed = !isCollapsed
    setIsCollapsed(newCollapsed)
    localStorage.setItem("admin_checklist_collapsed", JSON.stringify(newCollapsed))
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
    {
      id: "electives",
      title: t("admin.checklist.electives", "Setup Electives"),
      description: t("admin.checklist.electivesDesc", "Ask managers to create elective courses"),
      icon: <Target className="h-4 w-4" />,
      link: "/admin/dashboard",
      completed: checklistStatus.electives,
    },
  ]

  // Don't render if shouldn't show
  if (!shouldShow) return null

  return (
    <div className="mx-4 mb-4">
      <Card className="shadow-sm border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-medium">
                {t("admin.checklist.title", "Setup Checklist")}
              </CardTitle>
              <Badge variant="secondary" className="text-xs">
                {completedCount}/{totalCount}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleCollapsed}
              className="h-6 w-6 p-0"
            >
              {isCollapsed ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronUp className="h-3 w-3" />
              )}
            </Button>
          </div>

          {!isCollapsed && (
            <div className="space-y-2">
              <Progress value={progressPercentage} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {progressPercentage === 100
                  ? t("admin.checklist.complete", "All setup steps completed!")
                  : t("admin.checklist.progress", `${completedCount} of ${totalCount} steps completed`)
                }
              </p>
            </div>
          )}
        </CardHeader>

        {!isCollapsed && (
          <CardContent className="pt-0">
            <div className="space-y-2">
              {checklistItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => navigateToStep(item.link)}
                  className={cn(
                    "w-full text-left p-3 rounded-md transition-colors hover:bg-accent/50",
                    "flex items-start gap-3",
                    item.completed ? "opacity-75" : "cursor-pointer"
                  )}
                  disabled={item.completed}
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
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "flex-shrink-0",
                        item.completed ? "text-green-600" : "text-foreground"
                      )}>
                        {item.icon}
                      </div>
                      <h4 className={cn(
                        "text-sm font-medium truncate",
                        item.completed ? "text-green-700" : "text-foreground"
                      )}>
                        {item.title}
                      </h4>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
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