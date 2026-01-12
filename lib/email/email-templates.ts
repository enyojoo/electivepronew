import {
  WelcomeEmailData,
  CourseSelectionSubmittedEmailData,
  ExchangeSelectionSubmittedEmailData,
  SelectionApprovedEmailData,
  SelectionRejectedEmailData,
  NewSelectionNotificationEmailData,
  UserInvitationEmailData,
} from "./email-types"
import {
  generateBaseEmailTemplate,
  generateSelectionDetails,
  generateStatusDetails,
} from "./email-generator"

export interface EmailTemplate {
  subject: string | ((data: any) => string | Promise<string>)
  html: (data: any) => Promise<string>
  text: (data: any) => string | Promise<string>
}

/**
 * Welcome email template
 */
export const welcomeTemplate: EmailTemplate = {
  subject: async (data: WelcomeEmailData) => {
    const { getBrandSettings } = await import("@/lib/supabase/brand-settings")
    const brandSettings = await getBrandSettings()
    return `Welcome to ${brandSettings.platformName}!`
  },
  html: async (data: WelcomeEmailData) => {
    const { getBrandSettings } = await import("@/lib/supabase/brand-settings")
    const brandSettings = await getBrandSettings()
    const { getBrandSettingsForEmail } = await import("./email-generator")
    const emailBrandSettings = await getBrandSettingsForEmail()
    const content = `
      <p>Hi ${data.firstName},</p>
      <p>Welcome to ${brandSettings.platformName}! We're excited to have you on board.</p>
      <p>Your account has been successfully created. You can now start exploring elective courses and exchange programs.</p>
      <p>Get started by visiting your dashboard to browse available programs and make your selections.</p>
    `
    return generateBaseEmailTemplate(
      `Welcome to ${brandSettings.platformName}!`,
      "Your learning journey starts here",
      content,
      { text: "Go to Dashboard", url: data.dashboardUrl },
      emailBrandSettings
    )
  },
  text: async (data: WelcomeEmailData) => {
    const { getBrandSettings } = await import("@/lib/supabase/brand-settings")
    const brandSettings = await getBrandSettings()
    return `
Welcome to ${brandSettings.platformName}!

Hi ${data.firstName},

Welcome to ${brandSettings.platformName}! We're excited to have you on board.

Your account has been successfully created. You can now start exploring elective courses and exchange programs.

Get started by visiting your dashboard: ${data.dashboardUrl}

Best regards,
The ${brandSettings.platformName} Team
    `.trim()
  },
}

/**
 * Course selection submitted template
 */
export const courseSelectionSubmittedTemplate: EmailTemplate = {
  subject: async (data: CourseSelectionSubmittedEmailData) => {
    const { getBrandSettings } = await import("@/lib/supabase/brand-settings")
    const brandSettings = await getBrandSettings()
    return `Course Selection Submitted - ${data.programName}`
  },
  html: async (data: CourseSelectionSubmittedEmailData) => {
    const { getBrandSettingsForEmail } = await import("./email-generator")
    const emailBrandSettings = await getBrandSettingsForEmail()
    const content = `
      <p>Hi ${data.firstName},</p>
      <p>Your course selection has been successfully submitted!</p>
      ${generateSelectionDetails("course", {
        programName: data.programName,
        courses: data.selectedCourses,
        submittedAt: data.submittedAt,
      }, emailBrandSettings.primaryColor)}
      <p>Your selection is now pending review. You will be notified once a decision has been made.</p>
    `
    return generateBaseEmailTemplate(
      "Course Selection Submitted",
      "Your selection has been received",
      content,
      { text: "View Selection", url: data.selectionUrl },
      emailBrandSettings
    )
  },
  text: async (data: CourseSelectionSubmittedEmailData) => {
    const { getBrandSettings } = await import("@/lib/supabase/brand-settings")
    const brandSettings = await getBrandSettings()
    return `
Course Selection Submitted

Hi ${data.firstName},

Your course selection has been successfully submitted!

Program: ${data.programName}
Selected Courses:
${data.selectedCourses.map((c, i) => `${i + 1}. ${c}`).join("\n")}

Submitted: ${new Date(data.submittedAt).toLocaleString()}

Your selection is now pending review. You will be notified once a decision has been made.

View your selection: ${data.selectionUrl}

Best regards,
The ${brandSettings.platformName} Team
    `.trim()
  },
}

/**
 * Exchange selection submitted template
 */
export const exchangeSelectionSubmittedTemplate: EmailTemplate = {
  subject: async (data: ExchangeSelectionSubmittedEmailData) => {
    const { getBrandSettings } = await import("@/lib/supabase/brand-settings")
    const brandSettings = await getBrandSettings()
    return `Exchange Selection Submitted - ${data.programName}`
  },
  html: async (data: ExchangeSelectionSubmittedEmailData) => {
    const { getBrandSettingsForEmail } = await import("./email-generator")
    const emailBrandSettings = await getBrandSettingsForEmail()
    const content = `
      <p>Hi ${data.firstName},</p>
      <p>Your exchange program selection has been successfully submitted!</p>
      ${generateSelectionDetails("exchange", {
        programName: data.programName,
        universities: data.selectedUniversities,
        submittedAt: data.submittedAt,
      }, emailBrandSettings.primaryColor)}
      <p>Your selection is now pending review. You will be notified once a decision has been made.</p>
    `
    return generateBaseEmailTemplate(
      "Exchange Selection Submitted",
      "Your selection has been received",
      content,
      { text: "View Selection", url: data.selectionUrl },
      emailBrandSettings
    )
  },
  text: async (data: ExchangeSelectionSubmittedEmailData) => {
    const { getBrandSettings } = await import("@/lib/supabase/brand-settings")
    const brandSettings = await getBrandSettings()
    return `
Exchange Selection Submitted

Hi ${data.firstName},

Your exchange program selection has been successfully submitted!

Program: ${data.programName}
Selected Universities:
${data.selectedUniversities
  .sort((a, b) => a.preferenceOrder - b.preferenceOrder)
  .map((u, i) => `${i + 1}. ${u.name} - ${u.city}, ${u.country}`)
  .join("\n")}

Submitted: ${new Date(data.submittedAt).toLocaleString()}

Your selection is now pending review. You will be notified once a decision has been made.

View your selection: ${data.selectionUrl}

Best regards,
The ${brandSettings.platformName} Team
    `.trim()
  },
}

/**
 * Selection approved template
 */
export const selectionApprovedTemplate: EmailTemplate = {
  subject: async (data: SelectionApprovedEmailData) => {
    const { getBrandSettings } = await import("@/lib/supabase/brand-settings")
    const brandSettings = await getBrandSettings()
    return `Selection Approved - ${data.programName}`
  },
  html: async (data: SelectionApprovedEmailData) => {
    const { getBrandSettingsForEmail } = await import("./email-generator")
    const emailBrandSettings = await getBrandSettingsForEmail()
    const content = `
      <p>Hi ${data.firstName},</p>
      <p>Great news! Your ${data.selectionType === "course" ? "course" : "exchange"} selection has been approved.</p>
      ${generateStatusDetails("approved", data.programName, data.approvedAt)}
      <p>Congratulations! You can now proceed with the next steps in the process.</p>
    `
    return generateBaseEmailTemplate(
      "Selection Approved",
      "Congratulations!",
      content,
      { text: "View Selection", url: data.selectionUrl },
      emailBrandSettings
    )
  },
  text: async (data: SelectionApprovedEmailData) => {
    const { getBrandSettings } = await import("@/lib/supabase/brand-settings")
    const brandSettings = await getBrandSettings()
    return `
Selection Approved

Hi ${data.firstName},

Great news! Your ${data.selectionType === "course" ? "course" : "exchange"} selection has been approved.

Program: ${data.programName}
Status: Approved
Updated: ${new Date(data.approvedAt).toLocaleString()}

Congratulations! You can now proceed with the next steps in the process.

View your selection: ${data.selectionUrl}

Best regards,
The ${brandSettings.platformName} Team
    `.trim()
  },
}

/**
 * Selection rejected template
 */
export const selectionRejectedTemplate: EmailTemplate = {
  subject: async (data: SelectionRejectedEmailData) => {
    const { getBrandSettings } = await import("@/lib/supabase/brand-settings")
    const brandSettings = await getBrandSettings()
    return `Selection Update - ${data.programName}`
  },
  html: async (data: SelectionRejectedEmailData) => {
    const { getBrandSettingsForEmail } = await import("./email-generator")
    const emailBrandSettings = await getBrandSettingsForEmail()
    const content = `
      <p>Hi ${data.firstName},</p>
      <p>We regret to inform you that your ${data.selectionType === "course" ? "course" : "exchange"} selection has been rejected.</p>
      ${generateStatusDetails("rejected", data.programName, data.rejectedAt, data.rejectionReason)}
      <p>If you have any questions or would like to discuss this decision, please contact your program manager.</p>
    `
    return generateBaseEmailTemplate(
      "Selection Update",
      "Important update regarding your selection",
      content,
      { text: "View Selection", url: data.selectionUrl },
      emailBrandSettings
    )
  },
  text: async (data: SelectionRejectedEmailData) => {
    const { getBrandSettings } = await import("@/lib/supabase/brand-settings")
    const brandSettings = await getBrandSettings()
    return `
Selection Update

Hi ${data.firstName},

We regret to inform you that your ${data.selectionType === "course" ? "course" : "exchange"} selection has been rejected.

Program: ${data.programName}
Status: Rejected
${data.rejectionReason ? `Reason: ${data.rejectionReason}` : ""}
Updated: ${new Date(data.rejectedAt).toLocaleString()}

If you have any questions or would like to discuss this decision, please contact your program manager.

View your selection: ${data.selectionUrl}

Best regards,
The ${brandSettings.platformName} Team
    `.trim()
  },
}

/**
 * New selection notification template (for admins/managers)
 */
export const newSelectionNotificationTemplate: EmailTemplate = {
  subject: async (data: NewSelectionNotificationEmailData) => {
    const { getBrandSettings } = await import("@/lib/supabase/brand-settings")
    const brandSettings = await getBrandSettings()
    return `New ${data.selectionType === "course" ? "Course" : "Exchange"} Selection - ${data.programName}`
  },
  html: async (data: NewSelectionNotificationEmailData) => {
    const { getBrandSettingsForEmail } = await import("./email-generator")
    const emailBrandSettings = await getBrandSettingsForEmail()
    const content = `
      <p>Hello,</p>
      <p>A new ${data.selectionType === "course" ? "course" : "exchange"} selection has been submitted and requires your review.</p>
      <div style="background-color: #f9f9f9; border-left: 4px solid ${emailBrandSettings.primaryColor}; padding: 16px; margin: 16px 0; border-radius: 4px;">
        <p style="margin: 0 0 8px; color: #666666; font-size: 14px;"><strong>Student:</strong> ${data.studentName} (${data.studentEmail})</p>
        <p style="margin: 0 0 8px; color: #666666; font-size: 14px;"><strong>Program:</strong> ${data.programName}</p>
        <p style="margin: 0; color: #666666; font-size: 12px;">Submitted: ${new Date(data.submittedAt).toLocaleString()}</p>
      </div>
      <p>Please review the selection and update its status accordingly.</p>
    `
    return generateBaseEmailTemplate(
      `New ${data.selectionType === "course" ? "Course" : "Exchange"} Selection`,
      "Action required",
      content,
      { text: "Review Selection", url: data.selectionUrl },
      emailBrandSettings
    )
  },
  text: async (data: NewSelectionNotificationEmailData) => {
    const { getBrandSettings } = await import("@/lib/supabase/brand-settings")
    const brandSettings = await getBrandSettings()
    return `
New ${data.selectionType === "course" ? "Course" : "Exchange"} Selection

Hello,

A new ${data.selectionType === "course" ? "course" : "exchange"} selection has been submitted and requires your review.

Student: ${data.studentName} (${data.studentEmail})
Program: ${data.programName}
Submitted: ${new Date(data.submittedAt).toLocaleString()}

Please review the selection and update its status accordingly.

Review selection: ${data.selectionUrl}

Best regards,
The ${brandSettings.platformName} Team
    `.trim()
  },
}

/**
 * User invitation template
 */
export const userInvitationTemplate: EmailTemplate = {
  subject: async (data: UserInvitationEmailData) => {
    const { getBrandSettings } = await import("@/lib/supabase/brand-settings")
    const brandSettings = await getBrandSettings()
    return `Welcome to ${brandSettings.platformName} - Account Created`
  },
  html: async (data: UserInvitationEmailData) => {
    const { getBrandSettings } = await import("@/lib/supabase/brand-settings")
    const { getBrandSettingsForEmail } = await import("./email-generator")
    const brandSettings = await getBrandSettings()
    const emailBrandSettings = await getBrandSettingsForEmail()
    const roleText =
      data.role === "admin"
        ? "Administrator"
        : data.role === "program_manager"
          ? "Program Manager"
          : "Student"
    const content = `
      <p>Hi ${data.name},</p>
      <p>An account has been created for you on ${brandSettings.platformName} as a ${roleText}.</p>
      <div style="background-color: #f9f9f9; border-left: 4px solid ${emailBrandSettings.primaryColor}; padding: 16px; margin: 16px 0; border-radius: 4px;">
        <p style="margin: 0 0 8px; color: #666666; font-size: 14px;"><strong>Email:</strong> ${data.email}</p>
        <p style="margin: 0 0 8px; color: #666666; font-size: 14px;"><strong>Temporary Password:</strong> <code style="background-color: #e5e5e5; padding: 2px 6px; border-radius: 3px; font-family: monospace;">${data.tempPassword}</code></p>
        <p style="margin: 12px 0 0; color: #ef4444; font-size: 12px; font-weight: 600;">⚠️ Please change your password after first login for security.</p>
      </div>
      <p>You can now log in to your account and start using ${brandSettings.platformName}.</p>
    `
    return generateBaseEmailTemplate(
      `Welcome to ${brandSettings.platformName}`,
      "Your account has been created",
      content,
      { text: "Log In", url: data.loginUrl },
      emailBrandSettings
    )
  },
  text: async (data: UserInvitationEmailData) => {
    const { getBrandSettings } = await import("@/lib/supabase/brand-settings")
    const brandSettings = await getBrandSettings()
    const roleText =
      data.role === "admin"
        ? "Administrator"
        : data.role === "program_manager"
          ? "Program Manager"
          : "Student"
    return `
Welcome to ${brandSettings.platformName}

Hi ${data.name},

An account has been created for you on ${brandSettings.platformName} as a ${roleText}.

Email: ${data.email}
Temporary Password: ${data.tempPassword}

⚠️ IMPORTANT: Please change your password after first login for security.

You can now log in to your account: ${data.loginUrl}

Best regards,
The ${brandSettings.platformName} Team
    `.trim()
  },
}
