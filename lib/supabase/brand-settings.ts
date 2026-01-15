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
  platformName: string | null
  platformDescription: string
  logo: string | null
  favicon: string | null
  primaryColor: string | null
  institutionName: string | null
  contactEmail: string
  appUrl: string
}

/**
 * Get brand settings with no-flash logic
 * - Return null/empty values during loading to prevent default flash
 * - Only show defaults after confirming from database that no custom branding exists
 * - Store raw database values, apply defaults only when confirmed
 */
export async function getBrandSettings(): Promise<BrandSettings> {
  // Since there's only one settings row, select without filtering by ID
  const { data: platformSettings, error } = await supabaseAdmin
    .from("settings")
    .select("*")
    .limit(1)
    .maybeSingle()

  // If we get a "not found" error (PGRST116), we can confirm no custom branding exists
  if (error && error.code === "PGRST116") {
    // Confirmed no custom branding exists - safe to use defaults
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

  // If any other error or no data, return null values to prevent flash
  // Don't show defaults until we've confirmed no custom branding exists
  if (!platformSettings || error) {
    return {
      platformName: null,
      platformDescription: DEFAULT_PLATFORM_DESCRIPTION,
      logo: null,
      favicon: null,
      primaryColor: null,
      institutionName: null,
      contactEmail: getContactEmail(),
      appUrl: getAppUrl(),
    }
  }

  // Check if ANY custom brand setting has been set in database
  const hasCustomBranding = !!(
    platformSettings.name ||
    platformSettings.name_ru ||
    platformSettings.logo_url ||
    platformSettings.logo_url_en ||
    platformSettings.logo_url_ru ||
    platformSettings.favicon_url ||
    platformSettings.primary_color
  )

  // If custom branding exists, return raw database values
  // Client-side hooks will apply defaults only when confirmed
  if (hasCustomBranding) {
    return {
      platformName: platformSettings.name || null, // Return null if empty, let client decide
      platformDescription: DEFAULT_PLATFORM_DESCRIPTION,
      logo: platformSettings.logo_url || null,
      favicon: platformSettings.favicon_url || null,
      primaryColor: platformSettings.primary_color || null,
      institutionName: platformSettings.name || null,
      contactEmail: getContactEmail(),
      appUrl: getAppUrl(),
    }
  }

  // No custom branding set in database - we've confirmed no custom branding exists
  // Safe to use defaults
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
