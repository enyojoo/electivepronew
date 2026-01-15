"use client"

import { createContext, useContext, useEffect, type ReactNode } from "react"
import { useRouter, usePathname } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase"

interface AuthContextType {
  // Add any auth-related state/methods here if needed
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event, session?.user?.id)

      // If user signed out or session expired
      if (event === "SIGNED_OUT" || (event === "TOKEN_REFRESHED" && !session)) {
        console.log("Session expired or user signed out, redirecting to login")

        // Determine appropriate login page based on current path
        let loginPath = "/admin/login"
        if (pathname?.startsWith("/student")) {
          loginPath = "/student/login"
        } else if (pathname?.startsWith("/manager")) {
          loginPath = "/manager/login"
        }

        // Redirect to appropriate login page
        router.push(loginPath)
      }

      // If user signed in
      if (event === "SIGNED_IN" && session) {
        // User successfully signed in, they should already be on the correct page
        console.log("User signed in:", session.user.id)
      }

      // Handle token refresh errors
      if (event === "TOKEN_REFRESHED" && session) {
        console.log("Token refreshed successfully")
      }
    })

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe()
    }
  }, [router, pathname, supabase])

  return <AuthContext.Provider value={{}}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return context
}