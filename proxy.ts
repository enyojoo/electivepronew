import { createServerClient } from "@supabase/ssr"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Define protected routes and their required roles
const protectedRoutes = {
  "/admin": "admin",
  "/student": "student",
  "/manager": "program_manager",
} as const

// Login pages for each role
const loginPages = {
  admin: "/admin/login",
  student: "/student/login",
  "program_manager": "/manager/login",
} as const

export default async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname

  // If accessing the root, redirect to admin login
  if (path === "/") {
    return NextResponse.redirect(new URL("/admin/login", req.url))
  }

  // Redirect base role paths to their login pages
  if (path === "/admin" || path === "/admin/") {
    return NextResponse.redirect(new URL("/admin/login", req.url))
  }

  if (path === "/student" || path === "/student/") {
    return NextResponse.redirect(new URL("/student/login", req.url))
  }

  if (path === "/manager" || path === "/manager/") {
    return NextResponse.redirect(new URL("/manager/login", req.url))
  }

  // Check if the current path is a protected route
  const protectedRoute = Object.keys(protectedRoutes).find(route =>
    path.startsWith(route) &&
    path !== `${route}/login` &&
    path !== `${route}/signup` &&
    path !== `${route}/forgot-password` &&
    path !== `${route}/reset-password`
  )

  if (!protectedRoute) {
    // Not a protected route, continue normally
    return NextResponse.next()
  }

  const requiredRole = protectedRoutes[protectedRoute as keyof typeof protectedRoutes]

  // Create Supabase server client
  const response = NextResponse.next()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  try {
    // Get the current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError || !session) {
      // No valid session, redirect to appropriate login page
      const loginUrl = new URL(loginPages[requiredRole], req.url)
      return NextResponse.redirect(loginUrl)
    }

    // Get user profile to check role
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single()

    if (profileError) {
      console.error("Profile fetch error in proxy:", profileError)
      // If profile fetch fails, redirect to login
      const loginUrl = new URL(loginPages[requiredRole], req.url)
      return NextResponse.redirect(loginUrl)
    }

    if (!profile || profile.role !== requiredRole) {
      // User doesn't have the required role, redirect to their appropriate dashboard or login
      if (profile && profile.role in loginPages) {
        // User has a different valid role, redirect to their dashboard
        const userLoginPage = loginPages[profile.role as keyof typeof loginPages]
        const dashboardUrl = userLoginPage.replace('/login', '/dashboard')
        return NextResponse.redirect(new URL(dashboardUrl, req.url))
      } else {
        // Invalid role or no role, redirect to login for the requested route
        const loginUrl = new URL(loginPages[requiredRole], req.url)
        return NextResponse.redirect(loginUrl)
      }
    }

    // User is authenticated and has correct role, allow the request
    return response
  } catch (error) {
    console.error("Proxy error:", error)
    // On error, redirect to login
    const loginUrl = new URL(loginPages[requiredRole], req.url)
    return NextResponse.redirect(loginUrl)
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg|api/auth).*)"],
}
