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

const BRAND_SETTINGS_STORAGE_KEY = "epro-brand-settings"
const BRAND_SETTINGS_VERSION = "1" // Increment to invalidate old cache

// Helper to get cached settings from localStorage
function getCachedSettings(): BrandSettings | null {
  if (typeof window === "undefined") return null
  
  try {
    const cached = localStorage.getItem(BRAND_SETTINGS_STORAGE_KEY)
    if (!cached) return null
    
    const parsed = JSON.parse(cached)
    // Check version to ensure cache is still valid
    if (parsed.version !== BRAND_SETTINGS_VERSION) {
      localStorage.removeItem(BRAND_SETTINGS_STORAGE_KEY)
      return null
    }
    
    return parsed.settings as BrandSettings
  } catch {
    return null
  }
}

// Helper to save settings to localStorage
function saveCachedSettings(settings: BrandSettings) {
  if (typeof window === "undefined") return
  
  try {
    localStorage.setItem(
      BRAND_SETTINGS_STORAGE_KEY,
      JSON.stringify({
        version: BRAND_SETTINGS_VERSION,
        settings,
        timestamp: Date.now(),
      })
    )
  } catch {
    // Ignore localStorage errors (e.g., quota exceeded)
  }
}

export function BrandProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [settings, setSettings] = useState<BrandSettings | null>(() => {
    // Initialize with cached settings immediately (synchronous, prevents flicker)
    const cached = getCachedSettings()
    // Apply cached settings immediately if they exist (before React renders)
    if (cached && typeof document !== "undefined") {
      // Apply synchronously to prevent any default flash
      const hasCustom = !!(cached.name || cached.primary_color || cached.logo_url || cached.favicon_url)
      if (hasCustom) {
        const primaryColor = cached.primary_color || DEFAULT_PRIMARY_COLOR
        const faviconUrl = cached.favicon_url && /^https?:\/\//.test(cached.favicon_url) ? cached.favicon_url : DEFAULT_FAVICON_URL
        const logoUrl = cached.logo_url && /^https?:\/\//.test(cached.logo_url) ? cached.logo_url : DEFAULT_LOGO_URL
        const name = cached.name || DEFAULT_PLATFORM_NAME
        
        // Apply immediately to prevent default flash
        document.documentElement.style.setProperty("--primary", primaryColor)
        document.documentElement.style.setProperty("--color-primary", primaryColor)
        document.title = name
        
        // Update favicon immediately
        const allFaviconLinks = document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]')
        allFaviconLinks.forEach((link) => {
          (link as HTMLLinkElement).href = faviconUrl
        })
      }
    }
    return cached
  })
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
    if (typeof document === "undefined") return
    
    // Update or create icon link
    let favicon = document.querySelector("link[rel='icon']") as HTMLLinkElement
    if (!favicon) {
      favicon = document.createElement("link")
      favicon.rel = "icon"
      document.head.appendChild(favicon)
    }
    // Force update by setting href to empty first, then to new URL
    if (favicon.href !== url) {
      favicon.href = ""
      favicon.href = url
    }

    // Update or create shortcut icon
    let shortcutIcon = document.querySelector("link[rel='shortcut icon']") as HTMLLinkElement
    if (!shortcutIcon) {
      shortcutIcon = document.createElement("link")
      shortcutIcon.rel = "shortcut icon"
      document.head.appendChild(shortcutIcon)
    }
    if (shortcutIcon.href !== url) {
      shortcutIcon.href = ""
      shortcutIcon.href = url
    }

    // Update or create apple-touch-icon
    let appleIcon = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement
    if (!appleIcon) {
      appleIcon = document.createElement("link")
      appleIcon.rel = "apple-touch-icon"
      document.head.appendChild(appleIcon)
    }
    if (appleIcon.href !== url) {
      appleIcon.href = ""
      appleIcon.href = url
    }
  }, [])


  // Apply branding to DOM
  const applyBranding = useCallback(
    (brandSettings: BrandSettings) => {
      if (typeof document === "undefined") return
      
      // Determine values: use custom if valid, otherwise fall back to defaults
      // This ensures custom branding is always respected when it exists
      const primaryColor = brandSettings.primary_color || DEFAULT_PRIMARY_COLOR
      const faviconUrl = isValidUrl(brandSettings.favicon_url) ? brandSettings.favicon_url! : DEFAULT_FAVICON_URL
      const logoUrl = isValidUrl(brandSettings.logo_url) ? brandSettings.logo_url! : DEFAULT_LOGO_URL
      const name = brandSettings.name || DEFAULT_PLATFORM_NAME

      console.log("Applying branding:", { primaryColor, faviconUrl, logoUrl, name, brandSettings })

      // Apply primary color as CSS variable
      document.documentElement.style.setProperty("--primary", primaryColor)
      document.documentElement.style.setProperty("--color-primary", primaryColor)

      // Set RGB values for components that need them
      const primaryRgb = hexToRgb(primaryColor)
      if (primaryRgb) {
        document.documentElement.style.setProperty("--primary-rgb", `${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}`)
      }

      // Update favicon - ensure we update all favicon link tags
      updateFavicon(faviconUrl)
      
      // Also update any existing favicon links in head (override defaults from HTML)
      const allFaviconLinks = document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]')
      allFaviconLinks.forEach((link) => {
        const linkEl = link as HTMLLinkElement
        linkEl.href = faviconUrl
      })

      // Store logo URL in data attribute for components to use
      document.documentElement.setAttribute("data-logo-url", logoUrl)

      // Update page title with settings name
      document.title = name
    },
    [isAdmin, hexToRgb, updateFavicon],
  )

  // Apply cached settings immediately on mount (before async fetch)
  useEffect(() => {
    const cachedSettings = settings
    if (cachedSettings) {
      // Apply cached settings immediately to prevent flicker
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        applyBranding(cachedSettings)
      })
    }
  }, [applyBranding]) // Include applyBranding in deps but only run once due to settings initial state

  // Load settings from database (background fetch to ensure we have latest)
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

        // Only update if settings have changed (prevents unnecessary re-renders)
        setSettings((prev) => {
          const hasChanged =
            prev?.name !== brandSettings.name ||
            prev?.primary_color !== brandSettings.primary_color ||
            prev?.logo_url !== brandSettings.logo_url ||
            prev?.favicon_url !== brandSettings.favicon_url

          if (hasChanged) {
            // Save to cache for next page load
            saveCachedSettings(brandSettings)
            // Apply updated branding
            applyBranding(brandSettings)
            return brandSettings
          }
          return prev
        })
      } catch (error) {
        console.error("Error loading brand settings:", error)
        // On error, use defaults only if we don't have cached settings
        const defaultSettings: BrandSettings = {
          name: null,
          primary_color: null,
          logo_url: null,
          favicon_url: null,
        }
        
        setSettings((prev) => {
          // If we have cached settings, keep them. Otherwise use defaults.
          if (prev) return prev
          
          saveCachedSettings(defaultSettings)
          applyBranding(defaultSettings)
          return defaultSettings
        })
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

        console.log("Settings updated, applying branding:", newSettings)
        
        // Save to cache for instant application on next page load
        saveCachedSettings(newSettings)
        
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
