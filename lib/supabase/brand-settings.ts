import { supabaseAdmin } from "@/lib/supabase"
import {
  DEFAULT_PLATFORM_NAME,
  DEFAULT_PLATFORM_DESCRIPTION,
  DEFAULT_LOGO_URL,
  DEFAULT_FAVICON_URL,
  DEFAULT_PRIMARY_COLOR,
  DEFAULT_CONTACT_EMAIL,
  DEFAULT_APP_URL,
} from "@/lib/constants"

// Get app URL from env (server-side only)
function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_APP_URL
}

function getContactEmail(): string {
  return process.env.NEXT_PUBLIC_CONTACT_EMAIL || DEFAULT_CONTACT_EMAIL
}

export interface BrandSettings {
  platformName: string
  platformDescription: string
  logo: string
  favicon: string
  primaryColor: string
  institutionName: string
  contactEmail: string
  appUrl: string
}

export interface RawBrandSettings {
  name: string | null
  name_ru: string | null
  primary_color: string | null
  logo_url: string | null
  logo_url_en: string | null
  logo_url_ru: string | null
  favicon_url: string | null
}

/**
 * Get raw brand settings from database (no defaults applied)
 * Used for server-side rendering and initial data loading
 */
export async function getRawBrandSettings(): Promise<{
  platformSettings: RawBrandSettings | null
  hasCustomBranding: boolean
}> {
  const { data: platformSettings, error } = await supabaseAdmin
    .from("settings")
    .select("name, name_ru, primary_color, logo_url, logo_url_en, logo_url_ru, favicon_url")
    .limit(1)
    .maybeSingle()

  if (error && error.code !== "PGRST116") {
    // PGRST116 is "not found" - that's okay
    console.error("Error fetching raw brand settings:", error)
    return {
      platformSettings: null,
      hasCustomBranding: false,
    }
  }

  // Type assertion to handle Supabase type inference issues
  const settings = platformSettings as RawBrandSettings | null

  // Check if ANY custom brand setting has been set
  const hasCustomBranding = !!(
    settings?.name ||
    settings?.name_ru ||
    settings?.logo_url ||
    settings?.logo_url_en ||
    settings?.logo_url_ru ||
    settings?.favicon_url ||
    settings?.primary_color
  )

  return {
    platformSettings: settings || null,
    hasCustomBranding,
  }
}

/**
 * Get brand settings with smart fallback logic
 * NOTE: This function still returns defaults for backward compatibility
 * For no-flash implementation, use getRawBrandSettings() instead
 */
export async function getBrandSettings(): Promise<BrandSettings> {
  const { platformSettings, hasCustomBranding } = await getRawBrandSettings()

  // If no record exists at all, use defaults
  if (!platformSettings || !hasCustomBranding) {
    return {
      platformName: DEFAULT_PLATFORM_NAME,
      platformDescription: DEFAULT_PLATFORM_DESCRIPTION,
      logo: DEFAULT_LOGO_URL,
      favicon: DEFAULT_FAVICON_URL,
      primaryColor: DEFAULT_PRIMARY_COLOR,
      institutionName: DEFAULT_PLATFORM_NAME,
      contactEmail: getContactEmail(),
      appUrl: getAppUrl(),
    }
  }

  // If admin has set custom branding, use custom values where set
  // Empty/null values fallback to defaults
  const customName = platformSettings.name || DEFAULT_PLATFORM_NAME
  return {
    platformName: customName,
    platformDescription: DEFAULT_PLATFORM_DESCRIPTION,
    logo: platformSettings.logo_url || DEFAULT_LOGO_URL,
    favicon: platformSettings.favicon_url || DEFAULT_FAVICON_URL,
    primaryColor: platformSettings.primary_color || DEFAULT_PRIMARY_COLOR,
    institutionName: customName,
    contactEmail: getContactEmail(),
    appUrl: getAppUrl(),
  }
}
