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

const SETTINGS_ID = "00000000-0000-0000-0000-000000000000"

/**
 * Get brand settings with smart fallback logic
 * - If no record exists: Use defaults
 * - If record exists but no custom branding set: Use defaults
 * - If any custom branding is set: Use custom values where provided, defaults for empty fields
 */
export async function getBrandSettings(): Promise<BrandSettings> {
  const { data: platformSettings, error } = await supabaseAdmin
    .from("settings")
    .select("*")
    .eq("id", SETTINGS_ID)
    .single()

  // If no record exists at all, use defaults
  if (!platformSettings || error) {
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

  // Check if ANY custom brand setting has been set
  const hasCustomBranding = !!(
    platformSettings.name ||
    platformSettings.platform_name ||
    platformSettings.logo_url ||
    platformSettings.favicon_url ||
    platformSettings.primary_color ||
    platformSettings.platform_description ||
    platformSettings.contact_email ||
    platformSettings.app_url
  )

  // If admin has set custom branding, use custom values where set
  // Empty/null values fallback to defaults
  if (hasCustomBranding) {
    return {
      platformName: platformSettings.platform_name || DEFAULT_PLATFORM_NAME,
      platformDescription: platformSettings.platform_description || DEFAULT_PLATFORM_DESCRIPTION,
      logo: platformSettings.logo_url || DEFAULT_LOGO_URL,
      favicon: platformSettings.favicon_url || DEFAULT_FAVICON_URL,
      primaryColor: platformSettings.primary_color || DEFAULT_PRIMARY_COLOR,
      institutionName: platformSettings.name || DEFAULT_PLATFORM_NAME,
      contactEmail: platformSettings.contact_email || getContactEmail(),
      appUrl: platformSettings.app_url || getAppUrl(),
    }
  }

  // No custom branding set - use defaults
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
