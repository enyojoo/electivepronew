"use client"

import { DEFAULT_FAVICON_URL, DEFAULT_PRIMARY_COLOR, DEFAULT_PLATFORM_NAME, DEFAULT_LOGO_URL } from "@/lib/constants"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"

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

export function DynamicBranding() {
  const pathname = usePathname()
  const [settings, setSettings] = useState<{
    name?: string
    primary_color?: string
    favicon_url?: string
    logo_url?: string
  } | null>(null)

  // Determine if we're in the admin section
  const isAdmin = pathname?.includes("/admin") || false

  // Load settings from database using public API route
  useEffect(() => {
    async function loadSettings() {
      try {
        // Use brand-settings API which has public read access
        const response = await fetch("/api/brand-settings")
        
        if (response.ok) {
          const data = await response.json()
          if (data) {
            setSettings({
              name: data.platformName,
              primary_color: data.primaryColor,
              favicon_url: data.faviconUrl,
              logo_url: data.logoUrl,
            })
          }
        }
      } catch (error) {
        console.error("Error loading settings:", error)
      }
    }

    loadSettings()
  }, [])

  useEffect(() => {
    // For admin pages, always use the default color, favicon, and platform name
    if (isAdmin) {
      document.documentElement.style.setProperty("--primary", DEFAULT_PRIMARY_COLOR)
      document.documentElement.style.setProperty("--color-primary", DEFAULT_PRIMARY_COLOR)

      // Set RGB values for components that need them
      const primaryRgb = hexToRgb(DEFAULT_PRIMARY_COLOR)
      if (primaryRgb) {
        document.documentElement.style.setProperty("--primary-rgb", `${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}`)
      }

      // Set default favicon for admin pages
      updateFavicon(DEFAULT_FAVICON_URL)

      // Set default platform name for admin pages
      document.title = DEFAULT_PLATFORM_NAME
    } else if (settings) {
      // For non-admin pages, use settings color, favicon, logo, and name if available
      const primaryColor = settings.primary_color || DEFAULT_PRIMARY_COLOR
      const faviconUrl = isValidUrl(settings.favicon_url) ? settings.favicon_url! : DEFAULT_FAVICON_URL
      const logoUrl = isValidUrl(settings.logo_url) ? settings.logo_url! : DEFAULT_LOGO_URL
      const name = settings.name || DEFAULT_PLATFORM_NAME

      // Apply primary color as CSS variable
      document.documentElement.style.setProperty("--primary", primaryColor)
      document.documentElement.style.setProperty("--color-primary", primaryColor)

      // Set RGB values for components that need them
      const primaryRgb = hexToRgb(primaryColor)
      if (primaryRgb) {
        document.documentElement.style.setProperty("--primary-rgb", `${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}`)
      }

      // Update favicon
      updateFavicon(faviconUrl)

      // Store logo URL in data attribute for components to use
      document.documentElement.setAttribute("data-logo-url", logoUrl)

      // Update page title with settings name
      document.title = name
    } else {
      // Fallback to defaults while loading
      document.documentElement.style.setProperty("--primary", DEFAULT_PRIMARY_COLOR)
      document.documentElement.style.setProperty("--color-primary", DEFAULT_PRIMARY_COLOR)
      updateFavicon(DEFAULT_FAVICON_URL)
      document.title = DEFAULT_PLATFORM_NAME
    }
  }, [settings, isAdmin, pathname])

  function updateFavicon(url: string) {
    const existingFavicon = document.querySelector("link[rel='icon']")
    if (existingFavicon) {
      existingFavicon.setAttribute("href", url)
    } else {
      const favicon = document.createElement("link")
      favicon.rel = "icon"
      favicon.href = url
      document.head.appendChild(favicon)
    }

    // Also update apple-touch-icon
    const existingAppleIcon = document.querySelector("link[rel='apple-touch-icon']")
    if (existingAppleIcon) {
      existingAppleIcon.setAttribute("href", url)
    } else {
      const appleIcon = document.createElement("link")
      appleIcon.rel = "apple-touch-icon"
      appleIcon.href = url
      document.head.appendChild(appleIcon)
    }
  }

  // Helper function to convert hex color to RGB
  function hexToRgb(hex: string) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? {
          r: Number.parseInt(result[1], 16),
          g: Number.parseInt(result[2], 16),
          b: Number.parseInt(result[3], 16),
        }
      : null
  }

  return null
}
