"use client"

import { useAuthSession } from "@/hooks/use-auth-session"
import { Loader2 } from "lucide-react"

interface AuthGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  showLoadingSpinner?: boolean
}

/**
 * AuthGuard component that wraps protected pages
 * Automatically handles session expiration and redirects to appropriate login pages
 */
export function AuthGuard({
  children,
  fallback,
  showLoadingSpinner = true
}: AuthGuardProps) {
  const { isLoading, isAuthenticated } = useAuthSession()

  // Show loading spinner while checking authentication
  if (isLoading) {
    if (showLoadingSpinner) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )
    }
    return fallback || null
  }

  // If not authenticated, the useAuthSession hook will handle redirection
  // So we just return null while it redirects
  if (!isAuthenticated) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  // User is authenticated, render the protected content
  return <>{children}</>
}