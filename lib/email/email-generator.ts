import { getBrandSettings } from "@/lib/supabase/brand-settings"
import { DEFAULT_APP_URL, DEFAULT_PLATFORM_NAME } from "@/lib/constants"
import { getEmailTranslation } from "./email-translations"

// Powered by logo for emails (black version for light backgrounds)
const POWERED_BY_LOGO_URL_BLACK_EN = "https://cldup.com/XP1QkOrY2d.png"
const POWERED_BY_LOGO_URL_BLACK_RU = "https://cldup.com/8RX9GenGPk.png"
const POWERED_BY_LOGO_URL_WHITE = "https://cldup.com/JV3FsweqaQ.png"
const PLATFORM_WEBSITE = "https://www.electivepro.net/"

export interface EmailBrandSettings {
  platformName: string
  primaryColor: string
  contactEmail: string
  appUrl: string
  language?: "en" | "ru"
}

/**
 * Generate base email template with consistent styling
 */
export async function generateBaseEmailTemplate(
  title: string,
  subtitle: string,
  content: string,
  ctaButton?: { text: string; url: string },
  brandSettings?: EmailBrandSettings,
  language: "en" | "ru" = "en"
): Promise<string> {
  const settings = brandSettings || (await getBrandSettingsForEmail())
  // Use custom brand settings, fallback to defaults if not provided
  const platformName = settings.platformName || DEFAULT_PLATFORM_NAME
  const contactEmail = settings.contactEmail || "support@electivepro.org"
  const appUrl = settings.appUrl || DEFAULT_APP_URL
  const primaryColor = settings.primaryColor || DEFAULT_PRIMARY_COLOR
  const poweredByLogoUrl = language === "ru" ? POWERED_BY_LOGO_URL_BLACK_RU : POWERED_BY_LOGO_URL_BLACK_EN

  const ctaButtonHtml = ctaButton
    ? `
      <tr>
        <td style="padding: 20px 40px;">
          <table border="0" cellspacing="0" cellpadding="0" width="100%">
            <tr>
              <td align="center">
                <a href="${ctaButton.url}" style="display: inline-block; padding: 12px 24px; background-color: ${primaryColor}; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">${ctaButton.text}</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `
    : ""

  return `
<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table border="0" cellspacing="0" cellpadding="0" width="100%" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table border="0" cellspacing="0" cellpadding="0" width="600" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; background-color: #ffffff; text-align: center;">
              <h1 style="margin: 0; color: #1a1a1a; font-size: 24px; font-weight: 600;">${title}</h1>
              ${subtitle ? `<p style="margin: 8px 0 0; color: #666666; font-size: 16px;">${subtitle}</p>` : ""}
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 20px 40px;">
              <div style="color: #333333; font-size: 16px; line-height: 1.6;">
                ${content}
              </div>
            </td>
          </tr>
          
          ${ctaButtonHtml}
          
          <!-- Footer -->
          <tr>
            <td class="email-footer" style="padding: 20px 40px; background-color: #f9f9f9; border-top: 1px solid #e5e5e5; text-align: center;">
              <div class="powered-by-container" style="margin-bottom: 12px;">
                <a href="${PLATFORM_WEBSITE}" target="_blank" rel="noopener noreferrer">
                  <img 
                    src="${poweredByLogoUrl}" 
                    alt="Powered by ${DEFAULT_PLATFORM_NAME}" 
                    style="height: 12px; width: auto; display: block; margin: 0 auto;"
                  />
                </a>
              </div>
              <p style="margin: 0; color: #999999; font-size: 11px; line-height: 1.5;">
                ${language === "ru" 
                  ? `Вы получаете это письмо, потому что создали аккаунт на платформе ${platformName}.`
                  : `You are receiving this email because you created an account on ${platformName} platform.`}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

/**
 * Get brand settings for email (server-side)
 */
export async function getBrandSettingsForEmail(): Promise<EmailBrandSettings> {
  const settings = await getBrandSettings()
  return {
    platformName: settings.platformName,
    primaryColor: settings.primaryColor,
    contactEmail: settings.contactEmail,
    appUrl: settings.appUrl,
  }
}

/**
 * Generate selection details box
 */
export function generateSelectionDetails(
  selectionType: "course" | "exchange",
  details: {
    programName: string
    courses?: string[]
    universities?: Array<{ name: string; country: string; city: string; preferenceOrder: number }>
    submittedAt: string
  },
  primaryColor: string = "#000000",
  language: "en" | "ru" = "en"
): string {
  const t = getEmailTranslation(language)
  const locale = language === "ru" ? "ru-RU" : "en-US"

  if (selectionType === "course" && details.courses) {
    return `
      <div style="background-color: #f9f9f9; border-left: 4px solid ${primaryColor}; padding: 16px; margin: 16px 0; border-radius: 4px;">
        <h3 style="margin: 0 0 12px; color: #1a1a1a; font-size: 18px; font-weight: 600;">${t.courseSelectionSubmitted.programLabel} ${details.programName}</h3>
        <p style="margin: 0 0 8px; color: #666666; font-size: 14px;"><strong>${t.courseSelectionSubmitted.coursesLabel}</strong></p>
        <ul style="margin: 0; padding-left: 20px; color: #333333; font-size: 14px;">
          ${details.courses.map((course) => `<li>${course}</li>`).join("")}
        </ul>
        <p style="margin: 12px 0 0; color: #666666; font-size: 12px;">${t.courseSelectionSubmitted.submittedLabel} ${new Date(details.submittedAt).toLocaleString(locale)}</p>
      </div>
    `
  }

  if (selectionType === "exchange" && details.universities) {
    return `
      <div style="background-color: #f9f9f9; border-left: 4px solid ${primaryColor}; padding: 16px; margin: 16px 0; border-radius: 4px;">
        <h3 style="margin: 0 0 12px; color: #1a1a1a; font-size: 18px; font-weight: 600;">${t.exchangeSelectionSubmitted.programLabel} ${details.programName}</h3>
        <p style="margin: 0 0 8px; color: #666666; font-size: 14px;"><strong>${t.exchangeSelectionSubmitted.universitiesLabel}</strong></p>
        <ol style="margin: 0; padding-left: 20px; color: #333333; font-size: 14px;">
          ${details.universities
            .sort((a, b) => a.preferenceOrder - b.preferenceOrder)
            .map((uni) => `<li>${uni.name} - ${uni.city}, ${uni.country}</li>`)
            .join("")}
        </ol>
        <p style="margin: 12px 0 0; color: #666666; font-size: 12px;">${t.exchangeSelectionSubmitted.submittedLabel} ${new Date(details.submittedAt).toLocaleString(locale)}</p>
      </div>
    `
  }

  return ""
}

/**
 * Generate status details box
 */
export function generateStatusDetails(
  status: "approved" | "rejected",
  programName: string,
  updatedAt: string,
  rejectionReason?: string,
  language: "en" | "ru" = "en"
): string {
  const t = getEmailTranslation(language)
  const locale = language === "ru" ? "ru-RU" : "en-US"
  const statusColor = status === "approved" ? "#10b981" : "#ef4444"
  const statusText = status === "approved" 
    ? (language === "ru" ? t.selectionApproved.statusApproved : "Approved")
    : (language === "ru" ? t.selectionRejected.statusRejected : "Rejected")

  return `
    <div style="background-color: #f9f9f9; border-left: 4px solid ${statusColor}; padding: 16px; margin: 16px 0; border-radius: 4px;">
      <h3 style="margin: 0 0 8px; color: #1a1a1a; font-size: 18px; font-weight: 600;">${t.selectionApproved.statusLabel} <span style="color: ${statusColor};">${statusText}</span></h3>
      <p style="margin: 0 0 8px; color: #666666; font-size: 14px;"><strong>${t.selectionApproved.programLabel}</strong> ${programName}</p>
      ${rejectionReason ? `<p style="margin: 8px 0; color: #666666; font-size: 14px;"><strong>${t.selectionRejected.reasonLabel}</strong> ${rejectionReason}</p>` : ""}
      <p style="margin: 12px 0 0; color: #666666; font-size: 12px;">${t.selectionApproved.updatedLabel} ${new Date(updatedAt).toLocaleString(locale)}</p>
    </div>
  `
}
