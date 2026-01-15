import { useEffect, useState, useCallback } from "react"
import { useRouter, usePathname } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import type { User } from "@supabase/supabase-js"

// Define login pages for each role
const loginPages = {
  admin: "/admin/login",
  student: "/student/login",
  program_manager: "/manager/login",
} as const

type UserRole = keyof typeof loginPages

interface AuthSessionState {
  user: User | null
  role: UserRole | null
  isLoading: boolean
  isAuthenticated: boolean
}

export function useAuthSession() {
  const [state, setState] = useState<AuthSessionState>({
    user: null,
    role: null,
    isLoading: true,
    isAuthenticated: false,
  })

  const router = useRouter()
  const pathname = usePathname()
  const supabase = getSupabaseBrowserClient()

  // Determine the current route's role based on pathname
  const getCurrentRouteRole = useCallback((): UserRole | null => {
    if (pathname.startsWith("/admin")) return "admin"
    if (pathname.startsWith("/student")) return "student"
    if (pathname.startsWith("/manager")) return "program_manager"
    return null
  }, [pathname])

  // Get user profile to determine role
  const fetchUserProfile = useCallback(async (userId: string): Promise<UserRole | null> => {
    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single()

      if (error || !profile) {
        console.error("Error fetching user profile:", error)
        return null
      }

      // Map database role to our UserRole type
      switch (profile.role) {
        case "admin":
          return "admin"
        case "student":
          return "student"
        case "program_manager":
          return "program_manager"
        default:
          console.warn("Unknown role:", profile.role)
          return null
      }
    } catch (error) {
      console.error("Error in fetchUserProfile:", error)
      return null
    }
  }, [supabase])

  // Handle session expiration - redirect to appropriate login page
  const handleSessionExpired = useCallback(() => {
    const currentRole = getCurrentRouteRole()
    const loginUrl = currentRole ? loginPages[currentRole] : "/admin/login"

    // Clear any cached data
    if (typeof window !== "undefined") {
      try {
        // Clear localStorage caches that might contain stale data
        Object.keys(localStorage).forEach(key => {
          if (key.includes("epro-") || key.includes("managerDashboard") || key.includes("studentDashboard")) {
            localStorage.removeItem(key)
          }
        })
      } catch (error) {
        console.error("Error clearing localStorage:", error)
      }
    }

    console.log("Session expired, redirecting to:", loginUrl)
    router.push(loginUrl)
  }, [getCurrentRouteRole, router])

  // Check if user has the correct role for current route
  const validateRoleAccess = useCallback((userRole: UserRole | null) => {
    const requiredRole = getCurrentRouteRole()
    if (!requiredRole) return true // Not a protected route
    return userRole === requiredRole
  }, [getCurrentRouteRole])

  // Initialize auth state
  useEffect(() => {
    let mounted = true

    const initializeAuth = async () => {
      try {
        // Get initial session
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) {
          console.error("Session error:", error)
          if (mounted) {
            setState({
              user: null,
              role: null,
              isLoading: false,
              isAuthenticated: false,
            })
            handleSessionExpired()
          }
          return
        }

        if (session?.user) {
          // Fetch user profile to get role
          const role = await fetchUserProfile(session.user.id)

          if (mounted) {
            const hasValidRole = validateRoleAccess(role)

            if (!hasValidRole) {
              // User doesn't have correct role for this route
              console.warn("User role mismatch, redirecting")
              handleSessionExpired()
              return
            }

            setState({
              user: session.user,
              role,
              isLoading: false,
              isAuthenticated: true,
            })
          }
        } else {
          // No session
          if (mounted) {
            setState({
              user: null,
              role: null,
              isLoading: false,
              isAuthenticated: false,
            })
            // Only redirect if we're on a protected route
            if (getCurrentRouteRole()) {
              handleSessionExpired()
            }
          }
        }
      } catch (error) {
        console.error("Auth initialization error:", error)
        if (mounted) {
          setState({
            user: null,
            role: null,
            isLoading: false,
            isAuthenticated: false,
          })
          handleSessionExpired()
        }
      }
    }

    initializeAuth()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth state change:", event, session?.user?.id)

        if (!mounted) return

        if (event === "SIGNED_OUT" || !session) {
          setState({
            user: null,
            role: null,
            isLoading: false,
            isAuthenticated: false,
          })
          handleSessionExpired()
        } else if (event === "SIGNED_IN" && session?.user) {
          const role = await fetchUserProfile(session.user.id)
          const hasValidRole = validateRoleAccess(role)

          if (!hasValidRole) {
            handleSessionExpired()
            return
          }

          setState({
            user: session.user,
            role,
            isLoading: false,
            isAuthenticated: true,
          })
        } else if (event === "TOKEN_REFRESHED" && session?.user) {
          // Token was refreshed, update state if needed
          const currentRole = state.role
          if (currentRole) {
            const hasValidRole = validateRoleAccess(currentRole)
            if (!hasValidRole) {
              handleSessionExpired()
              return
            }
          }

          setState(prev => ({
            ...prev,
            user: session.user,
            isLoading: false,
            isAuthenticated: true,
          }))
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [supabase, fetchUserProfile, validateRoleAccess, handleSessionExpired])

  return state
}