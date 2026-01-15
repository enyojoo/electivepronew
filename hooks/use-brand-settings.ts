"use client"

import { useState, useEffect } from "react"
import { useBrand } from "@/lib/brand-context"
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

export function useBrandSettings(): BrandSettings {
  const { settings, isLoading } = useBrand()
  const { language } = useLanguage()
  const [hasConfirmedData, setHasConfirmedData] = useState(false)

  // Track when we've confirmed data from database
  // Also update when settings change (for real-time updates)
  useEffect(() => {
    if (!isLoading && settings !== null) {
      setHasConfirmedData(true)
    }
  }, [isLoading, settings])
  
  // Force re-render when settings change to ensure logo updates
  useEffect(() => {
    // This effect ensures the component re-renders when settings change
    // The dependency on settings will trigger a re-render
  }, [settings])

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

  // Helper function to get value with smart fallback (language-aware)
  const getValue = (
    customValueEn: string | null | undefined,
    customValueRu: string | null | undefined,
    defaultValue: string,
    dataAttrKey: string
  ): string => {
    // If we haven't confirmed data yet, try to read from data attribute (synchronous, prevents flicker)
    if (!hasConfirmedData && typeof document !== "undefined") {
      const cachedValue = document.documentElement.getAttribute(dataAttrKey)
      if (cachedValue) {
        return cachedValue
      }
      // Return empty string to show skeleton if no cache
      return ""
    }

    // If we've confirmed no custom branding exists, use default for both languages
    if (hasConfirmedData && !hasCustomBranding) {
      return defaultValue
    }

    // Determine which value to use based on language
    // Only use custom values if custom branding exists
    // Apply fallback: use English for Russian if Russian not set
    let customValue = customValueEn
    if (language === "ru") {
      customValue = customValueRu || customValueEn // Use Russian if exists, otherwise English
    }

    // If custom branding exists and we have a custom value, use it
    if (hasCustomBranding && customValue) {
      return customValue
    }

    // If custom branding exists but this field is empty, use default
    if (hasCustomBranding && !customValue) {
      return defaultValue
    }

    // Fallback to default
    return defaultValue
  }

  // Helper function to get logo URL (language-aware with fallback chain)
  const getLogoUrl = (): string => {
    // If we haven't confirmed data yet, try to read from data attribute
    if (!hasConfirmedData && typeof document !== "undefined") {
      const cachedLogo = document.documentElement.getAttribute(
        language === "ru" ? "data-logo-url-ru" : "data-logo-url-en"
      ) || document.documentElement.getAttribute("data-logo-url")
      if (cachedLogo) {
        return cachedLogo
      }
      return ""
    }

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

    // Fallback to default
    return DEFAULT_LOGO_URL
  }

  // Get platform name - language-aware
  const platformNameValue = getValue(
    settings?.name,
    settings?.name_ru,
    DEFAULT_PLATFORM_NAME,
    language === "ru" ? "data-platform-name-ru" : "data-platform-name-en"
  )

  return {
    platformName: platformNameValue,
    platformDescription: DEFAULT_PLATFORM_DESCRIPTION,
    logo: getLogoUrl(),
    favicon: getValue(
      settings?.favicon_url,
      null, // Favicon doesn't have language variants
      DEFAULT_FAVICON_URL,
      "data-favicon-url"
    ),
    primaryColor: getValue(
      settings?.primary_color,
      null, // Color doesn't have language variants
      DEFAULT_PRIMARY_COLOR,
      "data-primary-color"
    ),
    institutionName: platformNameValue,
    contactEmail: DEFAULT_CONTACT_EMAIL,
    appUrl: DEFAULT_APP_URL,
    isLoading,
    hasData: hasConfirmedData,
  }
}
