import sgMail from "@sendgrid/mail"
import {
  welcomeTemplate,
  courseSelectionSubmittedTemplate,
  exchangeSelectionSubmittedTemplate,
  selectionApprovedTemplate,
  selectionRejectedTemplate,
  newSelectionNotificationTemplate,
  userInvitationTemplate,
} from "./email-templates"
import type {
  WelcomeEmailData,
  CourseSelectionSubmittedEmailData,
  ExchangeSelectionSubmittedEmailData,
  SelectionApprovedEmailData,
  SelectionRejectedEmailData,
  NewSelectionNotificationEmailData,
  UserInvitationEmailData,
} from "./email-types"

// Initialize SendGrid
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY
if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY)
} else {
  console.warn("SENDGRID_API_KEY is not set. Email functionality will be disabled.")
}

// Email configuration - will be enhanced with brand settings when sending
const getEmailConfig = async () => {
  const { getBrandSettings } = await import("@/lib/supabase/brand-settings")
  const brandSettings = await getBrandSettings()
  
  return {
    fromEmail: process.env.SENDGRID_FROM_EMAIL || "noreply@electivepro.org",
    fromName: process.env.SENDGRID_FROM_NAME || brandSettings.platformName,
    replyTo: process.env.SENDGRID_REPLY_TO || brandSettings.contactEmail,
  }
}

export interface SendEmailResponse {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Generic email sending function
 */
async function sendEmail(
  to: string,
  subject: string | ((data: any) => string | Promise<string>),
  html: (data: any) => Promise<string>,
  text: (data: any) => string | Promise<string>,
  data: any
): Promise<SendEmailResponse> {
  if (!SENDGRID_API_KEY) {
    console.warn("SendGrid API key not configured. Email not sent.")
    return {
      success: false,
      error: "SendGrid API key not configured",
    }
  }

  try {
    const subjectText = typeof subject === "function" ? await subject(data) : subject
    const htmlContent = await html(data)
    const textContent = typeof text === "function" ? await text(data) : text
    const config = await getEmailConfig()

    const msg = {
      to,
      from: {
        email: config.fromEmail,
        name: config.fromName,
      },
      replyTo: config.replyTo,
      subject: subjectText,
      text: textContent,
      html: htmlContent,
    }

    const [response] = await sgMail.send(msg)

    return {
      success: true,
      messageId: response.headers["x-message-id"] as string,
    }
  } catch (error: any) {
    console.error("Error sending email:", error)
    return {
      success: false,
      error: error.message || "Failed to send email",
    }
  }
}

/**
 * Send welcome email
 */
export async function sendWelcomeEmail(
  data: WelcomeEmailData
): Promise<SendEmailResponse> {
  return sendEmail(
    data.email,
    welcomeTemplate.subject,
    welcomeTemplate.html,
    welcomeTemplate.text,
    data
  )
}

/**
 * Send course selection submitted email
 */
export async function sendCourseSelectionSubmittedEmail(
  data: CourseSelectionSubmittedEmailData
): Promise<SendEmailResponse> {
  return sendEmail(
    data.email,
    courseSelectionSubmittedTemplate.subject,
    courseSelectionSubmittedTemplate.html,
    courseSelectionSubmittedTemplate.text,
    data
  )
}

/**
 * Send exchange selection submitted email
 */
export async function sendExchangeSelectionSubmittedEmail(
  data: ExchangeSelectionSubmittedEmailData
): Promise<SendEmailResponse> {
  return sendEmail(
    data.email,
    exchangeSelectionSubmittedTemplate.subject,
    exchangeSelectionSubmittedTemplate.html,
    exchangeSelectionSubmittedTemplate.text,
    data
  )
}

/**
 * Send selection approved email
 */
export async function sendSelectionApprovedEmail(
  data: SelectionApprovedEmailData
): Promise<SendEmailResponse> {
  return sendEmail(
    data.email,
    selectionApprovedTemplate.subject,
    selectionApprovedTemplate.html,
    selectionApprovedTemplate.text,
    data
  )
}

/**
 * Send selection rejected email
 */
export async function sendSelectionRejectedEmail(
  data: SelectionRejectedEmailData
): Promise<SendEmailResponse> {
  return sendEmail(
    data.email,
    selectionRejectedTemplate.subject,
    selectionRejectedTemplate.html,
    selectionRejectedTemplate.text,
    data
  )
}

/**
 * Send new selection notification email (to admin/manager)
 */
export async function sendNewSelectionNotificationEmail(
  data: NewSelectionNotificationEmailData
): Promise<SendEmailResponse> {
  return sendEmail(
    data.adminEmail,
    newSelectionNotificationTemplate.subject,
    newSelectionNotificationTemplate.html,
    newSelectionNotificationTemplate.text,
    data
  )
}

/**
 * Send user invitation email
 */
export async function sendUserInvitationEmail(
  data: UserInvitationEmailData
): Promise<SendEmailResponse> {
  return sendEmail(
    data.email,
    userInvitationTemplate.subject,
    userInvitationTemplate.html,
    userInvitationTemplate.text,
    data
  )
}
