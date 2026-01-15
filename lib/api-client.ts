import { getSupabaseBrowserClient } from "./supabase"

// Define login pages for each role
const loginPages = {
  admin: "/admin/login",
  student: "/student/login",
  program_manager: "/manager/login",
} as const

type UserRole = keyof typeof loginPages

/**
 * Enhanced fetch wrapper that handles authentication errors
 * Automatically redirects on 401/403 responses
 */
export async function authenticatedFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const response = await fetch(input, init)

  // Handle authentication errors
  if (response.status === 401 || response.status === 403) {
    console.log("API authentication error, redirecting to login")

    // Determine current route role for appropriate redirect
    const currentPath = window.location.pathname
    let currentRole: UserRole = "admin" // default

    if (currentPath.startsWith("/student")) currentRole = "student"
    else if (currentPath.startsWith("/manager")) currentRole = "program_manager"
    else if (currentPath.startsWith("/admin")) currentRole = "admin"

    // Clear cached data
    clearAuthCache()

    // Redirect to appropriate login page
    window.location.href = loginPages[currentRole]
    return response // Return the response anyway, though the redirect will happen
  }

  return response
}

/**
 * Clear authentication-related cache on logout/session expiration
 */
function clearAuthCache() {
  if (typeof window === "undefined") return

  try {
    // Clear localStorage caches that might contain stale data
    const keysToRemove = Object.keys(localStorage).filter(key =>
      key.includes("epro-") ||
      key.includes("managerDashboard") ||
      key.includes("studentDashboard") ||
      key.includes("adminDashboard") ||
      key.includes("courseDetailData") ||
      key.includes("courseSelectionsData")
    )

    keysToRemove.forEach(key => localStorage.removeItem(key))
  } catch (error) {
    console.error("Error clearing auth cache:", error)
  }
}

/**
 * Supabase client wrapper with automatic error handling
 */
export const supabaseClient = {
  ...getSupabaseBrowserClient(),

  // Override methods that make HTTP requests to add error handling
  async select(table: string, options?: any) {
    try {
      const result = await getSupabaseBrowserClient().from(table).select(options)
      return result
    } catch (error: any) {
      if (error?.message?.includes("JWT") || error?.message?.includes("auth")) {
        handleAuthError()
      }
      throw error
    }
  },

  // Add more wrapped methods as needed
}

/**
 * Handle authentication errors by clearing cache and redirecting
 */
function handleAuthError() {
  console.log("Supabase auth error detected, clearing cache and redirecting")

  clearAuthCache()

  // Determine current route role for appropriate redirect
  const currentPath = window.location.pathname
  let currentRole: UserRole = "admin"

  if (currentPath.startsWith("/student")) currentRole = "student"
  else if (currentPath.startsWith("/manager")) currentRole = "program_manager"

  window.location.href = loginPages[currentRole]
}