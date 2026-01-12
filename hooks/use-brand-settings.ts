"use client"

import { useState, useEffect } from "react"
import { useBrand } from "@/lib/brand-context"
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
  const [hasConfirmedData, setHasConfirmedData] = useState(false)

  // Track when we've confirmed data from database
  useEffect(() => {
    if (!isLoading && settings !== null) {
      setHasConfirmedData(true)
    }
  }, [isLoading, settings])

  // Check if any custom branding is set
  const hasCustomBranding =
    hasConfirmedData &&
    !!(
      settings?.name ||
      settings?.logo_url ||
      settings?.favicon_url ||
      settings?.primary_color
    )

  // Helper function to get value with smart fallback
  const getValue = (
    customValue: string | null | undefined,
    defaultValue: string
  ): string => {
    // If we haven't confirmed data yet, return empty string (no defaults)
    if (!hasConfirmedData) {
      return ""
    }

    // If custom branding exists and we have a custom value, use it
    if (hasCustomBranding && customValue) {
      return customValue
    }

    // If we've confirmed no custom branding exists, use default
    if (hasConfirmedData && !hasCustomBranding) {
      return defaultValue
    }

    // If custom branding exists but this field is empty, use default
    if (hasCustomBranding && !customValue) {
      return defaultValue
    }

    return ""
  }

  return {
    platformName: DEFAULT_PLATFORM_NAME,
    platformDescription: DEFAULT_PLATFORM_DESCRIPTION,
    logo: getValue(settings?.logo_url, DEFAULT_LOGO_URL),
    favicon: getValue(settings?.favicon_url, DEFAULT_FAVICON_URL),
    primaryColor: getValue(settings?.primary_color, DEFAULT_PRIMARY_COLOR),
    institutionName: getValue(settings?.name, DEFAULT_PLATFORM_NAME),
    contactEmail: DEFAULT_CONTACT_EMAIL,
    appUrl: DEFAULT_APP_URL,
    isLoading,
    hasData: hasConfirmedData,
  }
}
