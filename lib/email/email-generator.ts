import { getBrandSettings } from "@/lib/supabase/brand-settings"
import { DEFAULT_APP_URL, DEFAULT_PLATFORM_NAME } from "@/lib/constants"

// Powered by logo for emails (black version for light backgrounds)
const POWERED_BY_LOGO_URL_BLACK = "https://cldup.com/XP1QkOrY2d.png"
const POWERED_BY_LOGO_URL_WHITE = "https://cldup.com/JV3FsweqaQ.png"
const PLATFORM_WEBSITE = "https://www.electivepro.net/"

export interface EmailBrandSettings {
  platformName: string
  primaryColor: string
  contactEmail: string
  appUrl: string
}

/**
 * Generate base email template with consistent styling
 */
export async function generateBaseEmailTemplate(
  title: string,
  subtitle: string,
  content: string,
  ctaButton?: { text: string; url: string },
  brandSettings?: EmailBrandSettings
): Promise<string> {
  const settings = brandSettings || (await getBrandSettingsForEmail())
  const platformName = settings.platformName || "ElectivePRO"
  const contactEmail = settings.contactEmail || "support@electivepro.org"
  const appUrl = settings.appUrl || DEFAULT_APP_URL
  const primaryColor = settings.primaryColor || "#027659"

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
<html lang="en">
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
                    src="${POWERED_BY_LOGO_URL_BLACK}" 
                    alt="Powered by ${DEFAULT_PLATFORM_NAME}" 
                    style="height: 12px; width: auto; display: block; margin: 0 auto;"
                  />
                </a>
              </div>
              <p style="margin: 0; color: #999999; font-size: 11px; line-height: 1.5;">
                You are receiving this email because you created an account on ${platformName} platform.
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
  primaryColor: string = "#027659"
): string {
  if (selectionType === "course" && details.courses) {
    return `
      <div style="background-color: #f9f9f9; border-left: 4px solid ${primaryColor}; padding: 16px; margin: 16px 0; border-radius: 4px;">
        <h3 style="margin: 0 0 12px; color: #1a1a1a; font-size: 18px; font-weight: 600;">Program: ${details.programName}</h3>
        <p style="margin: 0 0 8px; color: #666666; font-size: 14px;"><strong>Selected Courses:</strong></p>
        <ul style="margin: 0; padding-left: 20px; color: #333333; font-size: 14px;">
          ${details.courses.map((course) => `<li>${course}</li>`).join("")}
        </ul>
        <p style="margin: 12px 0 0; color: #666666; font-size: 12px;">Submitted: ${new Date(details.submittedAt).toLocaleString()}</p>
      </div>
    `
  }

  if (selectionType === "exchange" && details.universities) {
    return `
      <div style="background-color: #f9f9f9; border-left: 4px solid ${primaryColor}; padding: 16px; margin: 16px 0; border-radius: 4px;">
        <h3 style="margin: 0 0 12px; color: #1a1a1a; font-size: 18px; font-weight: 600;">Program: ${details.programName}</h3>
        <p style="margin: 0 0 8px; color: #666666; font-size: 14px;"><strong>Selected Universities:</strong></p>
        <ol style="margin: 0; padding-left: 20px; color: #333333; font-size: 14px;">
          ${details.universities
            .sort((a, b) => a.preferenceOrder - b.preferenceOrder)
            .map((uni) => `<li>${uni.name} - ${uni.city}, ${uni.country}</li>`)
            .join("")}
        </ol>
        <p style="margin: 12px 0 0; color: #666666; font-size: 12px;">Submitted: ${new Date(details.submittedAt).toLocaleString()}</p>
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
  rejectionReason?: string
): string {
  const statusColor = status === "approved" ? "#10b981" : "#ef4444"
  const statusText = status === "approved" ? "Approved" : "Rejected"

  return `
    <div style="background-color: #f9f9f9; border-left: 4px solid ${statusColor}; padding: 16px; margin: 16px 0; border-radius: 4px;">
      <h3 style="margin: 0 0 8px; color: #1a1a1a; font-size: 18px; font-weight: 600;">Status: <span style="color: ${statusColor};">${statusText}</span></h3>
      <p style="margin: 0 0 8px; color: #666666; font-size: 14px;"><strong>Program:</strong> ${programName}</p>
      ${rejectionReason ? `<p style="margin: 8px 0; color: #666666; font-size: 14px;"><strong>Reason:</strong> ${rejectionReason}</p>` : ""}
      <p style="margin: 12px 0 0; color: #666666; font-size: 12px;">Updated: ${new Date(updatedAt).toLocaleString()}</p>
    </div>
  `
}
