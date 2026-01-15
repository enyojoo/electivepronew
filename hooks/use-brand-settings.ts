"use client"

import { useState, useEffect, useCallback } from "react"
import { useLanguage } from "@/lib/language-context"
import {
  DEFAULT_PLATFORM_NAME,
  DEFAULT_PLATFORM_DESCRIPTION,
  DEFAULT_LOGO_URL,
  DEFAULT_FAVICON_URL,
  DEFAULT_PRIMARY_COLOR,
  DEFAULT_CONTACT_EMAIL,
  DEFAULT_APP_URL,
} from "@/lib/constants"

export interface BrandSettings {
  platformName: string
  platformDescription: string
  logo: string
  favicon: string
  primaryColor: string
  institutionName: string
  contactEmail: string
  appUrl: string
  isLoading: boolean
  hasData: boolean
}

const BRAND_SETTINGS_STORAGE_KEY = "epro-brand-settings"
const BRAND_SETTINGS_VERSION = "2" // Increment to invalidate old cache

// Helper to get cached settings from localStorage
function getCachedSettings(): any | null {
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

    return parsed.settings as any
  } catch {
    return null
  }
}

// Helper to save settings to localStorage
function saveCachedSettings(settings: any) {
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

/**
 * React hook for brand settings with no-flash logic
 * Returns empty strings during loading to prevent default flash
 */
export function useBrandSettings(): BrandSettings {
  const { language } = useLanguage()
  const [settings, setSettings] = useState<any>(getCachedSettings)
  const [isLoading, setIsLoading] = useState(true)
  const [hasConfirmedData, setHasConfirmedData] = useState(false)

  // Fetch brand settings from API
  const fetchBrandSettings = useCallback(async () => {
    try {
      const response = await fetch("/api/brand-settings")
      if (!response.ok) return { platformSettings: null }

      const data = await response.json()
      return data
    } catch (error) {
      console.error("Error fetching brand settings:", error)
      return { platformSettings: null }
    }
  }, [])

  // Load settings on mount
  useEffect(() => {
    let mounted = true

    const loadSettings = async () => {
      try {
        const data = await fetchBrandSettings()
        if (!mounted) return

        const platformSettings = data?.platformSettings || null

        // Check if ANY custom branding exists in database
        const hasCustomInDb = platformSettings && !!(
          platformSettings.name ||
          platformSettings.name_ru ||
          platformSettings.logo_url ||
          platformSettings.logo_url_en ||
          platformSettings.logo_url_ru ||
          platformSettings.favicon_url ||
          platformSettings.primary_color
        )

        // Mark that we've confirmed from Supabase
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("epro-brand-confirmed", "true")
            localStorage.setItem("epro-brand-has-custom", hasCustomInDb ? "true" : "false")
          } catch {
            // Ignore localStorage errors
          }
        }

        // Cache the settings
        saveCachedSettings(platformSettings)

        setSettings(platformSettings)
        setHasConfirmedData(true)
      } catch (error) {
        console.error("Error loading brand settings:", error)
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    // Use cached data immediately if available
    const cached = getCachedSettings()
    if (cached) {
      setSettings(cached)
      setHasConfirmedData(true)
    }

    // Always fetch fresh data (background update)
    loadSettings()

    return () => {
      mounted = false
    }
  }, [fetchBrandSettings])

  // Check if any custom branding is set
  const hasCustomBranding =
    hasConfirmedData &&
    !!(
      settings?.name ||
      settings?.name_ru ||
      settings?.logo_url ||
      settings?.logo_url_en ||
      settings?.logo_url_ru ||
      settings?.favicon_url ||
      settings?.primary_color
    )

  // CRITICAL: Return empty strings during loading to prevent default flash
  const getValue = (
    customValueEn: string | null | undefined,
    customValueRu: string | null | undefined,
    defaultValue: string
  ): string => {
    if (isLoading || !hasConfirmedData) return "" // No defaults during loading!

    // If we've confirmed no custom branding exists, use default for both languages
    if (hasConfirmedData && !hasCustomBranding) {
      return defaultValue
    }

    // Determine which value to use based on language
    // Only use custom values if custom branding exists
    const customValue = language === "ru" && customValueRu ? customValueRu : customValueEn

    // If custom branding exists and we have a custom value, use it
    if (hasCustomBranding && customValue) {
      return customValue
    }

    // If custom branding exists but this field is empty, use default
    if (hasCustomBranding && !customValue) {
      return defaultValue
    }

    return "" // Custom branding exists but value is empty
  }

  // Helper function to get logo URL (language-aware with fallback chain)
  const getLogoUrl = (): string => {
    if (isLoading || !hasConfirmedData) return "" // No defaults during loading!

    // If no custom branding exists, use default for both languages
    if (hasConfirmedData && !hasCustomBranding) {
      return DEFAULT_LOGO_URL
    }

    // Determine which logo URL to use based on language
    // Priority: language-specific > generic logo_url > default
    // Only use custom values if custom branding exists
    let logoUrl: string | null = null
    if (language === "ru") {
      logoUrl = settings?.logo_url_ru || settings?.logo_url || null
    } else {
      logoUrl = settings?.logo_url_en || settings?.logo_url || null
    }

    // If custom branding exists and we have a logo URL, use it
    if (hasCustomBranding && logoUrl) {
      return logoUrl
    }

    // If custom branding exists but no logo URL, use default
    if (hasCustomBranding && !logoUrl) {
      return DEFAULT_LOGO_URL
    }

    return "" // Custom branding exists but no logo
  }

  // Get platform name - language-aware
  const platformNameValue = getValue(
    settings?.name,
    settings?.name_ru,
    DEFAULT_PLATFORM_NAME
  )

  return {
    platformName: platformNameValue,
    platformDescription: DEFAULT_PLATFORM_DESCRIPTION,
    logo: getLogoUrl(),
    favicon: getValue(
      settings?.favicon_url,
      null, // Favicon doesn't have language variants
      DEFAULT_FAVICON_URL
    ),
    primaryColor: getValue(
      settings?.primary_color,
      null, // Color doesn't have language variants
      DEFAULT_PRIMARY_COLOR
    ),
    institutionName: platformNameValue,
    contactEmail: DEFAULT_CONTACT_EMAIL,
    appUrl: DEFAULT_APP_URL,
    isLoading,
    hasData: hasConfirmedData,
  }
}
