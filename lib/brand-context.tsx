"use client"

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react"
import { usePathname } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import {
  DEFAULT_PRIMARY_COLOR,
  DEFAULT_PLATFORM_NAME,
  DEFAULT_FAVICON_URL,
  DEFAULT_LOGO_URL,
} from "@/lib/constants"

interface BrandSettings {
  name: string | null
  primary_color: string | null
  logo_url: string | null
  favicon_url: string | null
}

interface BrandContextType {
  settings: BrandSettings | null
  updateSettings: (updates: Partial<BrandSettings>) => Promise<void>
  isLoading: boolean
}

const BrandContext = createContext<BrandContextType | undefined>(undefined)

export function BrandProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [settings, setSettings] = useState<BrandSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = getSupabaseBrowserClient()
  

  // Determine if we're in the admin section
  const isAdmin = pathname?.includes("/admin") || false

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

  // Helper function to convert hex color to RGB
  const hexToRgb = useCallback((hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? {
          r: Number.parseInt(result[1], 16),
          g: Number.parseInt(result[2], 16),
          b: Number.parseInt(result[3], 16),
        }
      : null
  }, [])

  // Update favicon in document head
  const updateFavicon = useCallback((url: string) => {
    let favicon = document.querySelector("link[rel='icon']") as HTMLLinkElement
    if (!favicon) {
      favicon = document.createElement("link")
      favicon.rel = "icon"
      document.head.appendChild(favicon)
    }
    favicon.href = url

    // Also update apple-touch-icon
    let appleIcon = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement
    if (!appleIcon) {
      appleIcon = document.createElement("link")
      appleIcon.rel = "apple-touch-icon"
      document.head.appendChild(appleIcon)
    }
    appleIcon.href = url
  }, [])

  // Apply branding to DOM
  const applyBranding = useCallback(
    (brandSettings: BrandSettings) => {
      // For admin pages, always use defaults
      if (isAdmin) {
        document.documentElement.style.setProperty("--primary", DEFAULT_PRIMARY_COLOR)
        document.documentElement.style.setProperty("--color-primary", DEFAULT_PRIMARY_COLOR)

        const primaryRgb = hexToRgb(DEFAULT_PRIMARY_COLOR)
        if (primaryRgb) {
          document.documentElement.style.setProperty(
            "--primary-rgb",
            `${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}`,
          )
        }

        updateFavicon(DEFAULT_FAVICON_URL)
        document.title = DEFAULT_PLATFORM_NAME
        document.documentElement.setAttribute("data-logo-url", DEFAULT_LOGO_URL)
        return
      }

      // For non-admin pages, use settings or defaults
      const primaryColor = brandSettings.primary_color || DEFAULT_PRIMARY_COLOR
      const faviconUrl = isValidUrl(brandSettings.favicon_url) ? brandSettings.favicon_url! : DEFAULT_FAVICON_URL
      const logoUrl = isValidUrl(brandSettings.logo_url) ? brandSettings.logo_url! : DEFAULT_LOGO_URL
      const name = brandSettings.name || DEFAULT_PLATFORM_NAME

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
    },
    [isAdmin, hexToRgb, updateFavicon],
  )

  // Load settings on mount
  useEffect(() => {
    async function loadSettings() {
      try {
        const { data, error } = await supabase
          .from("settings")
          .select("name, primary_color, logo_url, favicon_url")
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle()

        if (error && error.code !== "PGRST116") {
          // PGRST116 is "not found" - that's okay, we'll use defaults
          console.error("Error loading brand settings:", error)
          throw error
        }

        const brandSettings: BrandSettings = {
          name: data?.name || null,
          primary_color: data?.primary_color || null,
          logo_url: data?.logo_url || null,
          favicon_url: data?.favicon_url || null,
        }

        setSettings(brandSettings)
        applyBranding(brandSettings)
      } catch (error) {
        console.error("Error loading brand settings:", error)
        // Use defaults on error
        const defaultSettings: BrandSettings = {
          name: null,
          primary_color: null,
          logo_url: null,
          favicon_url: null,
        }
        setSettings(defaultSettings)
        applyBranding(defaultSettings)
      } finally {
        setIsLoading(false)
      }
    }

    loadSettings()
  }, [applyBranding, supabase])

  // Re-apply branding when pathname changes (to handle admin page detection)
  useEffect(() => {
    if (settings) {
      applyBranding(settings)
    }
  }, [pathname, settings, applyBranding])

  // Update settings in database and apply immediately
  const updateSettings = useCallback(
    async (updates: Partial<BrandSettings>) => {
      try {
        // Verify we have a valid session before attempting to update
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error("Error getting session:", sessionError)
          throw new Error("Authentication error: " + sessionError.message)
        }

        if (!session) {
          console.error("No active session found")
          throw new Error("You must be logged in to update settings")
        }

        // Get existing settings to preserve ID and other fields
        const { data: existingSettings, error: fetchError } = await supabase
          .from("settings")
          .select("*")
          .limit(1)
          .maybeSingle()

        if (fetchError) {
          console.error("Error fetching existing settings:", fetchError)
          throw fetchError
        }

        // Prepare update data
        const updateData: {
          name?: string
          primary_color?: string
          logo_url?: string | null
          favicon_url?: string | null
          updated_at: string
        } = {
          updated_at: new Date().toISOString(),
        }

        // Include only the fields being updated
        if (updates.name !== undefined) {
          updateData.name = updates.name || DEFAULT_PLATFORM_NAME
        }
        if (updates.primary_color !== undefined) {
          updateData.primary_color = updates.primary_color || DEFAULT_PRIMARY_COLOR
        }
        if (updates.logo_url !== undefined) {
          updateData.logo_url = updates.logo_url
        }
        if (updates.favicon_url !== undefined) {
          updateData.favicon_url = updates.favicon_url
        }

        // Ensure NOT NULL constraints are satisfied
        if (!updateData.name && existingSettings) {
          updateData.name = existingSettings.name || DEFAULT_PLATFORM_NAME
        }
        if (!updateData.primary_color && existingSettings) {
          updateData.primary_color = existingSettings.primary_color || DEFAULT_PRIMARY_COLOR
        }

        let result
        if (existingSettings?.id) {
          // Row exists - use UPDATE
          result = await supabase
            .from("settings")
            .update(updateData)
            .eq("id", existingSettings.id)
            .select("name, primary_color, logo_url, favicon_url")
            .single()
        } else {
          // Row doesn't exist - use INSERT
          const insertData = {
            name: updateData.name || DEFAULT_PLATFORM_NAME,
            primary_color: updateData.primary_color || DEFAULT_PRIMARY_COLOR,
            logo_url: updateData.logo_url || null,
            favicon_url: updateData.favicon_url || null,
            updated_at: updateData.updated_at,
          }
          result = await supabase
            .from("settings")
            .insert(insertData)
            .select("name, primary_color, logo_url, favicon_url")
            .single()
        }

        if (result.error) {
          throw result.error
        }

        // Update local state with merged settings
        const newSettings: BrandSettings = {
          name: result.data?.name || null,
          primary_color: result.data?.primary_color || null,
          logo_url: result.data?.logo_url || null,
          favicon_url: result.data?.favicon_url || null,
        }

        setSettings(newSettings)

        // Apply immediately to DOM
        applyBranding(newSettings)
      } catch (error) {
        console.error("Error updating brand settings:", error)
        throw error
      }
    },
    [applyBranding, supabase],
  )

  return <BrandContext.Provider value={{ settings, updateSettings, isLoading }}>{children}</BrandContext.Provider>
}

export function useBrand() {
  const context = useContext(BrandContext)
  if (context === undefined) {
    throw new Error("useBrand must be used within BrandProvider")
  }
  return context
}
