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
  name_ru: string | null
  primary_color: string | null
  logo_url: string | null
  logo_url_en: string | null
  logo_url_ru: string | null
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
    // First, try to get initial data from server-side (data attributes)
    let initialServerData: { platformSettings: BrandSettings | null; hasCustomBranding: boolean; confirmed: boolean } | null = null
    if (typeof document !== "undefined") {
      try {
        const serverDataAttr = document.documentElement.getAttribute("data-initial-settings")
        if (serverDataAttr) {
          initialServerData = JSON.parse(serverDataAttr)
        }
      } catch {
        // Ignore parse errors
      }
    }

    // Initialize with server-side data if available, otherwise use cached settings
    const initialSettings = initialServerData?.platformSettings || getCachedSettings()
    
    // Apply initial settings immediately if they exist (before React renders)
    if (typeof document !== "undefined") {
      // Only apply if we have custom branding OR we've confirmed no custom branding exists
      const hasCustom = !!(initialSettings?.name || initialSettings?.name_ru || initialSettings?.primary_color || 
                          initialSettings?.logo_url || initialSettings?.logo_url_en || initialSettings?.logo_url_ru || 
                          initialSettings?.favicon_url)
      const confirmedNoCustom = initialServerData?.confirmed && !initialServerData?.hasCustomBranding
      
      if (hasCustom || confirmedNoCustom) {
        // Use initialSettings (from server or cache), not cached
        const nameEn = initialSettings?.name || ""
        const nameRu = initialSettings?.name_ru || ""
        
        // If we have custom branding, use custom names; if confirmed no custom, use defaults
        const finalNameEn = hasCustom ? nameEn : (confirmedNoCustom ? DEFAULT_PLATFORM_NAME : "")
        const finalNameRu = hasCustom ? nameRu : (confirmedNoCustom ? DEFAULT_PLATFORM_NAME : "")
        
        if (finalNameEn || finalNameRu || confirmedNoCustom) {
          document.documentElement.setAttribute("data-platform-name-en", finalNameEn || "")
          document.documentElement.setAttribute("data-platform-name-ru", finalNameRu || "")
          
          // Get current language - check data attribute first (from server-side script), then localStorage
          let currentLanguage: "en" | "ru" = "en"
          try {
            // First check server-side data attribute (which already checked localStorage)
            const serverLang = document.documentElement.getAttribute("data-initial-language")
            if (serverLang === "ru" || serverLang === "en") {
              currentLanguage = serverLang
            } else {
              // Fallback to localStorage if data attribute not set
              const storedLang = localStorage.getItem("epro-language")
              if (storedLang === "ru" || storedLang === "en") {
                currentLanguage = storedLang
              }
            }
          } catch {
            // Ignore localStorage errors
          }
          
          // Use Russian name when language is Russian, English name when English
          // Fallback to default if no custom branding exists
          const titleName = currentLanguage === "ru" 
            ? (finalNameRu || finalNameEn || DEFAULT_PLATFORM_NAME)
            : (finalNameEn || finalNameRu || DEFAULT_PLATFORM_NAME)
          
          if (titleName) {
            document.documentElement.setAttribute("data-platform-name", titleName)
            document.title = titleName
          }
        }
        
        // Apply other branding settings (colors, logos, favicons)
        // Only use defaults if we've confirmed no custom branding exists
        const primaryColor = initialSettings.primary_color || (confirmedNoCustom ? DEFAULT_PRIMARY_COLOR : null)
        const faviconUrl = initialSettings.favicon_url && /^https?:\/\//.test(initialSettings.favicon_url) 
          ? initialSettings.favicon_url 
          : (confirmedNoCustom ? DEFAULT_FAVICON_URL : null)
        const logoUrlEn = initialSettings.logo_url_en && /^https?:\/\//.test(initialSettings.logo_url_en) 
          ? initialSettings.logo_url_en 
          : (initialSettings.logo_url && /^https?:\/\//.test(initialSettings.logo_url) 
            ? initialSettings.logo_url 
            : (confirmedNoCustom ? DEFAULT_LOGO_URL : null))
        const logoUrlRu = initialSettings.logo_url_ru && /^https?:\/\//.test(initialSettings.logo_url_ru) 
          ? initialSettings.logo_url_ru 
          : (initialSettings.logo_url && /^https?:\/\//.test(initialSettings.logo_url) 
            ? initialSettings.logo_url 
            : (confirmedNoCustom ? DEFAULT_LOGO_URL : null))
        
        // Store logo URLs in data attributes
        document.documentElement.setAttribute("data-logo-url-en", logoUrlEn)
        document.documentElement.setAttribute("data-logo-url-ru", logoUrlRu)
        document.documentElement.setAttribute("data-logo-url", logoUrlEn)
        
        // Apply immediately to prevent default flash (only if we have values)
        if (primaryColor) {
          document.documentElement.style.setProperty("--primary", primaryColor)
          document.documentElement.style.setProperty("--color-primary", primaryColor)
          
          // Set RGB values for components that need them
          const hex = primaryColor.replace('#', '')
          const r = parseInt(hex.substr(0, 2), 16)
          const g = parseInt(hex.substr(2, 2), 16)
          const b = parseInt(hex.substr(4, 2), 16)
          document.documentElement.style.setProperty("--primary-rgb", `${r}, ${g}, ${b}`)
        }
        
        // Update favicon immediately (only if we have a URL)
        if (faviconUrl) {
          const allFaviconLinks = document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]')
          allFaviconLinks.forEach((link) => {
            (link as HTMLLinkElement).href = faviconUrl
          })
        }
        
        // Store logo URLs in data attributes
        if (logoUrlEn) {
          document.documentElement.setAttribute("data-logo-url-en", logoUrlEn)
        }
        if (logoUrlRu) {
          document.documentElement.setAttribute("data-logo-url-ru", logoUrlRu)
        }
        if (logoUrlEn) {
          document.documentElement.setAttribute("data-logo-url", logoUrlEn)
        }
      }
    }
    return initialSettings
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
      
      // Check if we've confirmed from database that no custom branding exists
      let confirmedNoCustom = false
      try {
        const confirmed = localStorage.getItem("epro-brand-confirmed")
        const hasCustomFlag = localStorage.getItem("epro-brand-has-custom")
        confirmedNoCustom = confirmed === "true" && hasCustomFlag === "false"
      } catch {
        // Ignore localStorage errors
      }
      
      // Check if any custom branding exists
      const hasCustom = !!(brandSettings.name || brandSettings.name_ru || brandSettings.primary_color || 
                          brandSettings.logo_url || brandSettings.logo_url_en || brandSettings.logo_url_ru || 
                          brandSettings.favicon_url)
      
      // Determine values: use custom if valid, otherwise fall back to defaults
      // Only use defaults if we've confirmed from database that no custom branding exists
      let primaryColor = brandSettings.primary_color || null
      let faviconUrl = isValidUrl(brandSettings.favicon_url) ? brandSettings.favicon_url! : null
      
      // Only use defaults if we've confirmed no custom branding exists
      if (confirmedNoCustom) {
        if (!primaryColor) primaryColor = DEFAULT_PRIMARY_COLOR
        if (!faviconUrl) faviconUrl = DEFAULT_FAVICON_URL
      }
      
      // Logo URLs - prefer language-specific, fallback to generic logo_url, then default
      // Only use defaults if we've confirmed from database that no custom branding exists
      let logoUrlEn = hasCustom && isValidUrl(brandSettings.logo_url_en) ? brandSettings.logo_url_en! : 
                     (hasCustom && isValidUrl(brandSettings.logo_url) ? brandSettings.logo_url! : null)
      let logoUrlRu = hasCustom && isValidUrl(brandSettings.logo_url_ru) ? brandSettings.logo_url_ru! : 
                     (hasCustom && isValidUrl(brandSettings.logo_url) ? brandSettings.logo_url! : null)
      
      // Only use defaults if we've confirmed no custom branding exists
      if (confirmedNoCustom && !logoUrlEn && !logoUrlRu) {
        logoUrlEn = DEFAULT_LOGO_URL
        logoUrlRu = DEFAULT_LOGO_URL
      } else if (!logoUrlEn && !logoUrlRu && !confirmedNoCustom) {
        // No logo and not confirmed - use empty strings
        logoUrlEn = ""
        logoUrlRu = ""
      }

      // Platform names - use language-specific
      // If custom branding exists, use custom names; if no custom branding, use defaults
      let nameEn = hasCustom ? (brandSettings.name || "") : (confirmedNoCustom ? DEFAULT_PLATFORM_NAME : "")
      let nameRu = hasCustom ? (brandSettings.name_ru || "") : (confirmedNoCustom ? DEFAULT_PLATFORM_NAME : "")

      console.log("Applying branding:", { primaryColor, faviconUrl, logoUrlEn, logoUrlRu, nameEn, nameRu, brandSettings, confirmedNoCustom })

      // Apply primary color as CSS variable (only if we have a value)
      if (primaryColor) {
        document.documentElement.style.setProperty("--primary", primaryColor)
        document.documentElement.style.setProperty("--color-primary", primaryColor)

        // Set RGB values for components that need them
        const primaryRgb = hexToRgb(primaryColor)
        if (primaryRgb) {
          document.documentElement.style.setProperty("--primary-rgb", `${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}`)
        }
      }

      // Update favicon - ensure we update all favicon link tags (only if we have a URL)
      if (faviconUrl) {
        updateFavicon(faviconUrl)
        
        // Also update any existing favicon links in head (override defaults from HTML)
        const allFaviconLinks = document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]')
        allFaviconLinks.forEach((link) => {
          const linkEl = link as HTMLLinkElement
          linkEl.href = faviconUrl
        })
      }

      // Store logo URLs in data attributes for components to use (language-specific)
      document.documentElement.setAttribute("data-logo-url-en", logoUrlEn)
      document.documentElement.setAttribute("data-logo-url-ru", logoUrlRu)
      // Keep backward compatibility
      document.documentElement.setAttribute("data-logo-url", logoUrlEn)

      // Store platform names in data attributes for synchronous access (prevents flicker)
      document.documentElement.setAttribute("data-platform-name-en", nameEn)
      document.documentElement.setAttribute("data-platform-name-ru", nameRu)
      
      // Get current language from localStorage to set appropriate title
      let currentLanguage: "en" | "ru" = "en"
      try {
        const storedLang = localStorage.getItem("epro-language")
        if (storedLang === "ru" || storedLang === "en") {
          currentLanguage = storedLang
        }
      } catch {
        // Ignore localStorage errors
      }
      
      // Update page title based on current language
      // Use Russian name when language is Russian, English name when English
      // If the language-specific name is not set but custom branding exists, fallback to the other language's name
      // If no custom branding exists, use default
      const titleName = currentLanguage === "ru" 
        ? (nameRu || nameEn || DEFAULT_PLATFORM_NAME)
        : (nameEn || nameRu || DEFAULT_PLATFORM_NAME)
      
      if (titleName) {
        document.documentElement.setAttribute("data-platform-name", titleName)
        document.title = titleName
      }
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

  // Load settings from API (background fetch to ensure we have latest)
  useEffect(() => {
    async function loadSettings() {
      try {
        // Use the API endpoint that returns raw data with confirmation flags
        const response = await fetch("/api/brand-settings")
        if (!response.ok) {
          throw new Error("Failed to fetch brand settings")
        }

        const data = await response.json()
        const { platformSettings, hasCustomBranding, confirmed } = data

        const brandSettings: BrandSettings = {
          name: platformSettings?.name || null,
          name_ru: platformSettings?.name_ru || null,
          primary_color: platformSettings?.primary_color || null,
          logo_url: platformSettings?.logo_url || null, // Keep for backward compatibility
          logo_url_en: platformSettings?.logo_url_en || null,
          logo_url_ru: platformSettings?.logo_url_ru || null,
          favicon_url: platformSettings?.favicon_url || null,
        }

        // Mark that we've confirmed from database (store in localStorage)
        if (typeof window !== "undefined" && confirmed) {
          try {
            localStorage.setItem("epro-brand-confirmed", "true")
            localStorage.setItem("epro-brand-has-custom", hasCustomBranding ? "true" : "false")
          } catch {
            // Ignore localStorage errors
          }
        }

        // Always update settings from database (even if same as cache)
        // This ensures custom settings are applied even after cache clear
        setSettings((prev) => {
          const hasChanged =
            prev?.name !== brandSettings.name ||
            prev?.name_ru !== brandSettings.name_ru ||
            prev?.primary_color !== brandSettings.primary_color ||
            prev?.logo_url !== brandSettings.logo_url ||
            prev?.logo_url_en !== brandSettings.logo_url_en ||
            prev?.logo_url_ru !== brandSettings.logo_url_ru ||
            prev?.favicon_url !== brandSettings.favicon_url

          // Always save to cache and apply branding when loading from API
          // This ensures cache is populated even if settings haven't changed
          saveCachedSettings(brandSettings)
          
          // Only apply branding if we have custom branding OR we've confirmed no custom branding exists
          if (hasCustomBranding || (confirmed && !hasCustomBranding)) {
            // If we have custom branding, apply it
            // If we've confirmed no custom branding exists, apply branding (will use defaults)
            applyBranding(brandSettings)
          }
          
          if (hasChanged || !prev) {
            // Settings changed or this is first load - update state
            return brandSettings
          }
          return prev
        })
      } catch (error) {
        console.error("Error loading brand settings:", error)
        // On error, don't use defaults - keep existing cached settings if available
        // Don't mark as confirmed on error
        setSettings((prev) => {
          if (prev) {
            // Keep existing cached settings
            return prev
          }
          // No cached settings and error - set to null (no defaults)
          return null
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadSettings()
  }, [applyBranding])

  // Re-apply branding when pathname changes (to handle admin page detection)
  useEffect(() => {
    if (settings) {
      applyBranding(settings)
    }
  }, [pathname, settings, applyBranding])

  // Update page title when language changes
  useEffect(() => {
    if (!settings) return
    
    const handleLanguageChange = () => {
      // Check if we've confirmed no custom branding exists
      let confirmedNoCustom = false
      try {
        const confirmed = localStorage.getItem("epro-brand-confirmed")
        const hasCustomFlag = localStorage.getItem("epro-brand-has-custom")
        confirmedNoCustom = confirmed === "true" && hasCustomFlag === "false"
      } catch {
        // Ignore localStorage errors
      }
      
      const hasCustom = !!(settings.name || settings.name_ru || settings.primary_color || 
                          settings.logo_url || settings.logo_url_en || settings.logo_url_ru || 
                          settings.favicon_url)
      
      // If custom branding exists, use custom names; if no custom branding, use defaults
      const nameEn = hasCustom ? (settings.name || "") : (confirmedNoCustom ? DEFAULT_PLATFORM_NAME : "")
      const nameRu = hasCustom ? (settings.name_ru || "") : (confirmedNoCustom ? DEFAULT_PLATFORM_NAME : "")
      
      let currentLanguage: "en" | "ru" = "en"
      try {
        const storedLang = localStorage.getItem("epro-language")
        if (storedLang === "ru" || storedLang === "en") {
          currentLanguage = storedLang
        }
      } catch {
        // Ignore localStorage errors
      }
      
      // Use Russian name when language is Russian, English name when English
      // If the language-specific name is not set but custom branding exists, fallback to the other language's name
      // If no custom branding exists, use default
      const titleName = currentLanguage === "ru" 
        ? (nameRu || nameEn || DEFAULT_PLATFORM_NAME)
        : (nameEn || nameRu || DEFAULT_PLATFORM_NAME)
      
      document.documentElement.setAttribute("data-platform-name", titleName)
      document.title = titleName
    }
    
    // Listen for storage events (when language changes in another tab/window)
    window.addEventListener("storage", handleLanguageChange)
    
    // Also listen for custom language change events
    const handleCustomLanguageChange = () => {
      // Small delay to ensure localStorage is updated
      setTimeout(handleLanguageChange, 0)
    }
    window.addEventListener("language-changed", handleCustomLanguageChange)
    
    // Check on mount and periodically (in case language changed without event)
    handleLanguageChange()
    const interval = setInterval(handleLanguageChange, 1000)
    
    return () => {
      window.removeEventListener("storage", handleLanguageChange)
      window.removeEventListener("language-changed", handleCustomLanguageChange)
      clearInterval(interval)
    }
  }, [settings])

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
          name_ru?: string | null
          primary_color?: string
          logo_url?: string | null
          logo_url_en?: string | null
          logo_url_ru?: string | null
          favicon_url?: string | null
          updated_at: string
        } = {
          updated_at: new Date().toISOString(),
        }

        // Include only the fields being updated
        if (updates.name !== undefined) {
          updateData.name = updates.name || DEFAULT_PLATFORM_NAME
        }
        if (updates.name_ru !== undefined) {
          updateData.name_ru = updates.name_ru
        }
        if (updates.primary_color !== undefined) {
          updateData.primary_color = updates.primary_color || DEFAULT_PRIMARY_COLOR
        }
        if (updates.logo_url !== undefined) {
          updateData.logo_url = updates.logo_url
        }
        if (updates.logo_url_en !== undefined) {
          updateData.logo_url_en = updates.logo_url_en
        }
        if (updates.logo_url_ru !== undefined) {
          updateData.logo_url_ru = updates.logo_url_ru
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
            .select("name, name_ru, primary_color, logo_url, logo_url_en, logo_url_ru, favicon_url")
            .single()
        } else {
          // Row doesn't exist - use INSERT
          const insertData = {
            name: updateData.name || DEFAULT_PLATFORM_NAME,
            name_ru: updateData.name_ru || null,
            primary_color: updateData.primary_color || DEFAULT_PRIMARY_COLOR,
            logo_url: updateData.logo_url || null,
            logo_url_en: updateData.logo_url_en || null,
            logo_url_ru: updateData.logo_url_ru || null,
            favicon_url: updateData.favicon_url || null,
            updated_at: updateData.updated_at,
          }
          result = await supabase
            .from("settings")
            .insert(insertData)
            .select("name, name_ru, primary_color, logo_url, logo_url_en, logo_url_ru, favicon_url")
            .single()
        }

        if (result.error) {
          throw result.error
        }

        // Update local state with merged settings
        const newSettings: BrandSettings = {
          name: result.data?.name || null,
          name_ru: result.data?.name_ru || null,
          primary_color: result.data?.primary_color || null,
          logo_url: result.data?.logo_url || null,
          logo_url_en: result.data?.logo_url_en || null,
          logo_url_ru: result.data?.logo_url_ru || null,
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
