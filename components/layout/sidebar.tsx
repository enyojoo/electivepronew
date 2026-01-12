"use client"

import type React from "react"

import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { cn } from "@/lib/utils"
import {
  BookOpen,
  Home,
  BookMarked,
  X,
  Globe,
  Group,
  CheckSquare,
  Settings,
  ChevronDown,
  ChevronRight,
} from "lucide-react"
import { useLanguage } from "@/lib/language-context"
import { useState } from "react"
import { DEFAULT_LOGO_URL } from "@/lib/constants"
import { useCachedSettings } from "@/hooks/use-cached-settings"
import Indicator from "@/components/indicator"
import { getSupabaseBrowserClient } from "@/lib/supabase"

interface SidebarProps {
  open: boolean
  setOpen: (open: boolean) => void
  className?: string
}

export function Sidebar({ open, setOpen, className }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { t, language } = useLanguage()
  const [electivesOpen, setElectivesOpen] = useState(pathname.includes("/electives"))
  const { settings } = useCachedSettings()

  // Determine user role based on URL path
  const isAdmin = pathname.includes("/admin")
  const isManager = pathname.includes("/manager")
  const isStudent = pathname.includes("/student")

  // Set the appropriate logout route based on user role
  const logoutRoute = isAdmin
    ? "/admin/login"
    : isManager
      ? "/manager/login"
      : isStudent
        ? "/student/login"
        : "/auth/login"

  // Handle logout
  const handleLogout = () => {
    // Sign out in the background (fire and forget)
    const supabase = getSupabaseBrowserClient()
    supabase.auth.signOut().catch((error) => {
      console.error("Error signing out:", error)
    })
    
    // Immediately redirect to appropriate login page
    router.push(logoutRoute)
    router.refresh() // Refresh to clear any cached data
  }

  // Helper function to validate if a URL is valid
  const isValidUrl = (url: string | null | undefined): boolean => {
    if (!url) return false
    try {
      const parsedUrl = new URL(url)
      return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:"
    } catch {
      return false
    }
  }

  // Use settings logo if available and valid, otherwise use default
  // For admin pages, always use default logo
  const logoUrl = isAdmin
    ? DEFAULT_LOGO_URL
    : isValidUrl(settings?.logo_url)
      ? settings.logo_url!
      : DEFAULT_LOGO_URL

  return (
    <>
      {/* Mobile sidebar backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-background border-r transform transition-transform duration-200 ease-in-out md:translate-x-0 md:relative md:z-0 flex flex-col",
          open ? "translate-x-0" : "-translate-x-full",
          className,
        )}
      >
        <div className="flex h-16 items-center border-b px-4 flex-shrink-0">
          <Link
            href={isAdmin ? "/admin/dashboard" : isManager ? "/manager/dashboard" : "/student/dashboard"}
            className="flex items-center gap-2"
            prefetch={true}
          >
            {/* Updated to use the appropriate logo based on user role */}
            <Image
              src={logoUrl || "/placeholder.svg"}
              alt="ElectivePRO Logo"
              width={110}
              height={30}
              className="h-7 w-auto"
              priority
            />
          </Link>
          <button
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 md:hidden"
            onClick={() => setOpen(false)}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
        </div>
        <div className="flex flex-col gap-1 p-2 overflow-y-auto flex-grow">
          {/* Admin Navigation */}
          {isAdmin && (
            <>
              <NavItem
                href="/admin/dashboard"
                icon={<Home className="h-4 w-4" />}
                active={pathname === "/admin/dashboard"}
              >
                {t("admin.sidebar.dashboard")}
              </NavItem>

              {/* Collapsible Electives Menu */}
              <div className="space-y-1">
                <button
                  onClick={() => setElectivesOpen(!electivesOpen)}
                  className={cn(
                    "flex w-full items-center justify-between px-3 py-2 text-sm rounded-md transition-colors",
                    pathname.startsWith("/admin/electives")
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  <div className="flex items-center">
                    <CheckSquare className="h-4 w-4 mr-2" />
                    <span>{t("admin.sidebar.electives")}</span>
                  </div>
                  {electivesOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>

                {electivesOpen && (
                  <div className="pl-6 space-y-1">
                    <NavItem
                      href="/admin/electives/course"
                      icon={<BookMarked className="h-4 w-4" />}
                      active={pathname.startsWith("/admin/electives/course")}
                    >
                      {t("manager.electives.courseElectives")}
                    </NavItem>
                    <NavItem
                      href="/admin/electives/exchange"
                      icon={<Globe className="h-4 w-4" />}
                      active={pathname.startsWith("/admin/electives/exchange")}
                    >
                      {t("manager.electives.exchangePrograms")}
                    </NavItem>
                  </div>
                )}
              </div>

              <NavItem
                href="/admin/courses"
                icon={<BookMarked className="h-4 w-4" />}
                active={pathname.startsWith("/admin/courses")}
              >
                {t("admin.sidebar.courses")}
              </NavItem>
              <NavItem
                href="/admin/universities"
                icon={<Globe className="h-4 w-4" />}
                active={pathname.startsWith("/admin/universities")}
              >
                {t("admin.sidebar.universities")}
              </NavItem>
              <NavItem
                href="/admin/groups"
                icon={<Group className="h-4 w-4" />}
                active={pathname.startsWith("/admin/groups")}
              >
                {t("admin.sidebar.groups")}
              </NavItem>
              <NavItem
                href="/admin/settings"
                icon={<Settings className="h-4 w-4" />}
                active={pathname.startsWith("/admin/settings")}
              >
                {t("admin.sidebar.settings")}
              </NavItem>
            </>
          )}

          {/* Manager Navigation */}
          {isManager && (
            <>
              <NavItem
                href="/manager/dashboard"
                icon={<Home className="h-4 w-4" />}
                active={pathname === "/manager/dashboard"}
              >
                {t("dashboard")}
              </NavItem>
              <NavItem
                href="/manager/electives/course"
                icon={<BookMarked className="h-4 w-4" />}
                active={pathname.startsWith("/manager/electives/course")}
              >
                {t("manager.electives.courseElectives")}
              </NavItem>
              <NavItem
                href="/manager/electives/exchange"
                icon={<Globe className="h-4 w-4" />}
                active={pathname.startsWith("/manager/electives/exchange")}
              >
                {t("manager.electives.exchangePrograms")}
              </NavItem>
            </>
          )}

          {/* Student Navigation */}
          {isStudent && (
            <>
              <NavItem
                href="/student/dashboard"
                icon={<Home className="h-4 w-4" />}
                active={pathname === "/student/dashboard"}
              >
                {t("dashboard")}
              </NavItem>
              <NavItem
                href="/student/courses"
                icon={<BookOpen className="h-4 w-4" />}
                active={pathname.startsWith("/student/courses")}
              >
                {t("courseSelection")}
              </NavItem>
              <NavItem
                href="/student/exchange"
                icon={<Globe className="h-4 w-4" />}
                active={pathname.startsWith("/student/exchange")}
              >
                {t("exchangeSelection")}
              </NavItem>
            </>
          )}
        </div>

        {/* Logout button at bottom with role-specific route */}
        <div className="mt-auto border-t flex-shrink-0">
          <div className="p-4">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent hover:text-accent-foreground w-full"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              {t("logout")}
            </button>
          </div>
          <Indicator />
        </div>
      </div>
    </>
  )
}

interface NavItemProps {
  href: string
  icon: React.ReactNode
  active: boolean
  children: React.ReactNode
}

function NavItem({ href, icon, active, children }: NavItemProps) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors",
        active ? "bg-primary text-primary-foreground" : "hover:bg-accent hover:text-accent-foreground",
      )}
      prefetch={true}
      scroll={false} // Add this to prevent scrolling to top on navigation
    >
      {icon}
      <span>{children}</span>
    </Link>
  )
}
