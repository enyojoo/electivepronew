import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(req: NextRequest) {
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

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg|api/auth).*)"],
}
