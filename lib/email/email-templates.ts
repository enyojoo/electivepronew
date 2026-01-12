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
import { getEmailTranslation } from "./email-translations"

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
    const lang = data.language || "en"
    const t = getEmailTranslation(lang)
    return t.welcome.subject(brandSettings.platformName)
  },
  html: async (data: WelcomeEmailData) => {
    const { getBrandSettings } = await import("@/lib/supabase/brand-settings")
    const brandSettings = await getBrandSettings()
    const { getBrandSettingsForEmail } = await import("./email-generator")
    const emailBrandSettings = await getBrandSettingsForEmail()
    const lang = data.language || "en"
    const t = getEmailTranslation(lang)
    const content = `
      <p>${t.welcome.greeting(data.firstName)}</p>
      <p>${t.welcome.body1(brandSettings.platformName)}</p>
      <p>${t.welcome.body2}</p>
      <p>${t.welcome.body3}</p>
    `
    return generateBaseEmailTemplate(
      t.welcome.title(brandSettings.platformName),
      t.welcome.subtitle,
      content,
      { text: t.welcome.cta, url: data.dashboardUrl },
      emailBrandSettings,
      lang
    )
  },
  text: async (data: WelcomeEmailData) => {
    const { getBrandSettings } = await import("@/lib/supabase/brand-settings")
    const brandSettings = await getBrandSettings()
    const lang = data.language || "en"
    const t = getEmailTranslation(lang)
    return `
${t.welcome.title(brandSettings.platformName)}

${t.welcome.greeting(data.firstName)}

${t.welcome.body1(brandSettings.platformName)}

${t.welcome.body2}

${t.welcome.body3}

${t.welcome.cta}: ${data.dashboardUrl}

${lang === "ru" ? "С уважением," : "Best regards,"}
${brandSettings.platformName} ${lang === "ru" ? "Команда" : "Team"}
    `.trim()
  },
}

/**
 * Course selection submitted template
 */
export const courseSelectionSubmittedTemplate: EmailTemplate = {
  subject: async (data: CourseSelectionSubmittedEmailData) => {
    const lang = data.language || "en"
    const t = getEmailTranslation(lang)
    return t.courseSelectionSubmitted.subject(data.programName)
  },
  html: async (data: CourseSelectionSubmittedEmailData) => {
    const { getBrandSettingsForEmail } = await import("./email-generator")
    const emailBrandSettings = await getBrandSettingsForEmail()
    const lang = data.language || "en"
    const t = getEmailTranslation(lang)
    const content = `
      <p>${t.courseSelectionSubmitted.greeting(data.firstName)}</p>
      <p>${t.courseSelectionSubmitted.body1}</p>
      ${generateSelectionDetails("course", {
        programName: data.programName,
        courses: data.selectedCourses,
        submittedAt: data.submittedAt,
      }, emailBrandSettings.primaryColor, lang)}
      <p>${t.courseSelectionSubmitted.body2}</p>
    `
    return generateBaseEmailTemplate(
      t.courseSelectionSubmitted.title,
      t.courseSelectionSubmitted.subtitle,
      content,
      { text: t.courseSelectionSubmitted.cta, url: data.selectionUrl },
      emailBrandSettings,
      lang
    )
  },
  text: async (data: CourseSelectionSubmittedEmailData) => {
    const { getBrandSettings } = await import("@/lib/supabase/brand-settings")
    const brandSettings = await getBrandSettings()
    const lang = data.language || "en"
    const t = getEmailTranslation(lang)
    return `
${t.courseSelectionSubmitted.title}

${t.courseSelectionSubmitted.greeting(data.firstName)}

${t.courseSelectionSubmitted.body1}

${t.courseSelectionSubmitted.programLabel} ${data.programName}
${t.courseSelectionSubmitted.coursesLabel}
${data.selectedCourses.map((c, i) => `${i + 1}. ${c}`).join("\n")}

${t.courseSelectionSubmitted.submittedLabel} ${new Date(data.submittedAt).toLocaleString(lang === "ru" ? "ru-RU" : "en-US")}

${t.courseSelectionSubmitted.body2}

${t.courseSelectionSubmitted.cta}: ${data.selectionUrl}

${lang === "ru" ? "С уважением," : "Best regards,"}
${brandSettings.platformName} ${lang === "ru" ? "Команда" : "Team"}
    `.trim()
  },
}

/**
 * Exchange selection submitted template
 */
export const exchangeSelectionSubmittedTemplate: EmailTemplate = {
  subject: async (data: ExchangeSelectionSubmittedEmailData) => {
    const lang = data.language || "en"
    const t = getEmailTranslation(lang)
    return t.exchangeSelectionSubmitted.subject(data.programName)
  },
  html: async (data: ExchangeSelectionSubmittedEmailData) => {
    const { getBrandSettingsForEmail } = await import("./email-generator")
    const emailBrandSettings = await getBrandSettingsForEmail()
    const lang = data.language || "en"
    const t = getEmailTranslation(lang)
    const content = `
      <p>${t.exchangeSelectionSubmitted.greeting(data.firstName)}</p>
      <p>${t.exchangeSelectionSubmitted.body1}</p>
      ${generateSelectionDetails("exchange", {
        programName: data.programName,
        universities: data.selectedUniversities,
        submittedAt: data.submittedAt,
      }, emailBrandSettings.primaryColor, lang)}
      <p>${t.exchangeSelectionSubmitted.body2}</p>
    `
    return generateBaseEmailTemplate(
      t.exchangeSelectionSubmitted.title,
      t.exchangeSelectionSubmitted.subtitle,
      content,
      { text: t.exchangeSelectionSubmitted.cta, url: data.selectionUrl },
      emailBrandSettings,
      lang
    )
  },
  text: async (data: ExchangeSelectionSubmittedEmailData) => {
    const { getBrandSettings } = await import("@/lib/supabase/brand-settings")
    const brandSettings = await getBrandSettings()
    const lang = data.language || "en"
    const t = getEmailTranslation(lang)
    const locale = lang === "ru" ? "ru-RU" : "en-US"
    return `
${t.exchangeSelectionSubmitted.title}

${t.exchangeSelectionSubmitted.greeting(data.firstName)}

${t.exchangeSelectionSubmitted.body1}

${t.exchangeSelectionSubmitted.programLabel} ${data.programName}
${t.exchangeSelectionSubmitted.universitiesLabel}
${data.selectedUniversities
  .sort((a, b) => a.preferenceOrder - b.preferenceOrder)
  .map((u, i) => `${i + 1}. ${u.name} - ${u.city}, ${u.country}`)
  .join("\n")}

${t.exchangeSelectionSubmitted.submittedLabel} ${new Date(data.submittedAt).toLocaleString(locale)}

${t.exchangeSelectionSubmitted.body2}

${t.exchangeSelectionSubmitted.cta}: ${data.selectionUrl}

${lang === "ru" ? "С уважением," : "Best regards,"}
${brandSettings.platformName} ${lang === "ru" ? "Команда" : "Team"}
    `.trim()
  },
}

/**
 * Selection approved template
 */
export const selectionApprovedTemplate: EmailTemplate = {
  subject: async (data: SelectionApprovedEmailData) => {
    const lang = data.language || "en"
    const t = getEmailTranslation(lang)
    return t.selectionApproved.subject(data.programName)
  },
  html: async (data: SelectionApprovedEmailData) => {
    const { getBrandSettingsForEmail } = await import("./email-generator")
    const emailBrandSettings = await getBrandSettingsForEmail()
    const lang = data.language || "en"
    const t = getEmailTranslation(lang)
    const selectionTypeText = data.selectionType === "course" 
      ? (lang === "ru" ? "курса" : "course")
      : (lang === "ru" ? "программы обмена" : "exchange")
    const content = `
      <p>${t.selectionApproved.greeting(data.firstName)}</p>
      <p>${t.selectionApproved.body1(selectionTypeText)}</p>
      ${generateStatusDetails("approved", data.programName, data.approvedAt, undefined, lang)}
      <p>${t.selectionApproved.body2}</p>
    `
    return generateBaseEmailTemplate(
      t.selectionApproved.title,
      t.selectionApproved.subtitle,
      content,
      { text: t.selectionApproved.cta, url: data.selectionUrl },
      emailBrandSettings,
      lang
    )
  },
  text: async (data: SelectionApprovedEmailData) => {
    const { getBrandSettings } = await import("@/lib/supabase/brand-settings")
    const brandSettings = await getBrandSettings()
    const lang = data.language || "en"
    const t = getEmailTranslation(lang)
    const locale = lang === "ru" ? "ru-RU" : "en-US"
    const selectionTypeText = data.selectionType === "course" 
      ? (lang === "ru" ? "курса" : "course")
      : (lang === "ru" ? "программы обмена" : "exchange")
    return `
${t.selectionApproved.title}

${t.selectionApproved.greeting(data.firstName)}

${t.selectionApproved.body1(selectionTypeText)}

${t.selectionApproved.programLabel} ${data.programName}
${t.selectionApproved.statusLabel} ${t.selectionApproved.statusApproved}
${t.selectionApproved.updatedLabel} ${new Date(data.approvedAt).toLocaleString(locale)}

${t.selectionApproved.body2}

${t.selectionApproved.cta}: ${data.selectionUrl}

${lang === "ru" ? "С уважением," : "Best regards,"}
${brandSettings.platformName} ${lang === "ru" ? "Команда" : "Team"}
    `.trim()
  },
}

/**
 * Selection rejected template
 */
export const selectionRejectedTemplate: EmailTemplate = {
  subject: async (data: SelectionRejectedEmailData) => {
    const lang = data.language || "en"
    const t = getEmailTranslation(lang)
    return t.selectionRejected.subject(data.programName)
  },
  html: async (data: SelectionRejectedEmailData) => {
    const { getBrandSettingsForEmail } = await import("./email-generator")
    const emailBrandSettings = await getBrandSettingsForEmail()
    const lang = data.language || "en"
    const t = getEmailTranslation(lang)
    const selectionTypeText = data.selectionType === "course" 
      ? (lang === "ru" ? "курса" : "course")
      : (lang === "ru" ? "программы обмена" : "exchange")
    const content = `
      <p>${t.selectionRejected.greeting(data.firstName)}</p>
      <p>${t.selectionRejected.body1(selectionTypeText)}</p>
      ${generateStatusDetails("rejected", data.programName, data.rejectedAt, data.rejectionReason, lang)}
      <p>${t.selectionRejected.body2}</p>
    `
    return generateBaseEmailTemplate(
      t.selectionRejected.title,
      t.selectionRejected.subtitle,
      content,
      { text: t.selectionRejected.cta, url: data.selectionUrl },
      emailBrandSettings,
      lang
    )
  },
  text: async (data: SelectionRejectedEmailData) => {
    const { getBrandSettings } = await import("@/lib/supabase/brand-settings")
    const brandSettings = await getBrandSettings()
    const lang = data.language || "en"
    const t = getEmailTranslation(lang)
    const locale = lang === "ru" ? "ru-RU" : "en-US"
    const selectionTypeText = data.selectionType === "course" 
      ? (lang === "ru" ? "курса" : "course")
      : (lang === "ru" ? "программы обмена" : "exchange")
    return `
${t.selectionRejected.title}

${t.selectionRejected.greeting(data.firstName)}

${t.selectionRejected.body1(selectionTypeText)}

${t.selectionRejected.programLabel} ${data.programName}
${t.selectionRejected.statusLabel} ${t.selectionRejected.statusRejected}
${data.rejectionReason ? `${t.selectionRejected.reasonLabel} ${data.rejectionReason}` : ""}
${t.selectionRejected.updatedLabel} ${new Date(data.rejectedAt).toLocaleString(locale)}

${t.selectionRejected.body2}

${t.selectionRejected.cta}: ${data.selectionUrl}

${lang === "ru" ? "С уважением," : "Best regards,"}
${brandSettings.platformName} ${lang === "ru" ? "Команда" : "Team"}
    `.trim()
  },
}

/**
 * New selection notification template (for admins/managers)
 */
export const newSelectionNotificationTemplate: EmailTemplate = {
  subject: async (data: NewSelectionNotificationEmailData) => {
    const lang = data.language || "en"
    const t = getEmailTranslation(lang)
    const selectionTypeText = data.selectionType === "course" ? "Course" : "Exchange"
    return t.newSelectionNotification.subject(selectionTypeText, data.programName)
  },
  html: async (data: NewSelectionNotificationEmailData) => {
    const { getBrandSettingsForEmail } = await import("./email-generator")
    const emailBrandSettings = await getBrandSettingsForEmail()
    const lang = data.language || "en"
    const t = getEmailTranslation(lang)
    const locale = lang === "ru" ? "ru-RU" : "en-US"
    const selectionTypeText = data.selectionType === "course" ? "course" : "exchange"
    const selectionTypeTitle = data.selectionType === "course" ? "Course" : "Exchange"
    const content = `
      <p>${t.newSelectionNotification.greeting}</p>
      <p>${t.newSelectionNotification.body1(selectionTypeText)}</p>
      <div style="background-color: #f9f9f9; border-left: 4px solid ${emailBrandSettings.primaryColor}; padding: 16px; margin: 16px 0; border-radius: 4px;">
        <p style="margin: 0 0 8px; color: #666666; font-size: 14px;"><strong>${t.newSelectionNotification.studentLabel}</strong> ${data.studentName} (${data.studentEmail})</p>
        <p style="margin: 0 0 8px; color: #666666; font-size: 14px;"><strong>${t.newSelectionNotification.programLabel}</strong> ${data.programName}</p>
        <p style="margin: 0; color: #666666; font-size: 12px;">${t.newSelectionNotification.submittedLabel} ${new Date(data.submittedAt).toLocaleString(locale)}</p>
      </div>
      <p>${t.newSelectionNotification.body2}</p>
    `
    return generateBaseEmailTemplate(
      t.newSelectionNotification.title(selectionTypeTitle),
      t.newSelectionNotification.subtitle,
      content,
      { text: t.newSelectionNotification.cta, url: data.selectionUrl },
      emailBrandSettings,
      lang
    )
  },
  text: async (data: NewSelectionNotificationEmailData) => {
    const { getBrandSettings } = await import("@/lib/supabase/brand-settings")
    const brandSettings = await getBrandSettings()
    const lang = data.language || "en"
    const t = getEmailTranslation(lang)
    const locale = lang === "ru" ? "ru-RU" : "en-US"
    const selectionTypeText = data.selectionType === "course" ? "course" : "exchange"
    const selectionTypeTitle = data.selectionType === "course" ? "Course" : "Exchange"
    return `
${t.newSelectionNotification.title(selectionTypeTitle)}

${t.newSelectionNotification.greeting}

${t.newSelectionNotification.body1(selectionTypeText)}

${t.newSelectionNotification.studentLabel} ${data.studentName} (${data.studentEmail})
${t.newSelectionNotification.programLabel} ${data.programName}
${t.newSelectionNotification.submittedLabel} ${new Date(data.submittedAt).toLocaleString(locale)}

${t.newSelectionNotification.body2}

${t.newSelectionNotification.cta}: ${data.selectionUrl}

${lang === "ru" ? "С уважением," : "Best regards,"}
${brandSettings.platformName} ${lang === "ru" ? "Команда" : "Team"}
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
    const lang = data.language || "en"
    const t = getEmailTranslation(lang)
    return t.userInvitation.subject(brandSettings.platformName)
  },
  html: async (data: UserInvitationEmailData) => {
    const { getBrandSettings } = await import("@/lib/supabase/brand-settings")
    const { getBrandSettingsForEmail } = await import("./email-generator")
    const brandSettings = await getBrandSettings()
    const emailBrandSettings = await getBrandSettingsForEmail()
    const lang = data.language || "en"
    const t = getEmailTranslation(lang)
    const roleText =
      data.role === "admin"
        ? (lang === "ru" ? "Администратор" : "Administrator")
        : data.role === "program_manager"
          ? (lang === "ru" ? "Менеджер программы" : "Program Manager")
          : (lang === "ru" ? "Студент" : "Student")
    const content = `
      <p>${t.userInvitation.greeting(data.name)}</p>
      <p>${t.userInvitation.body1(brandSettings.platformName, roleText)}</p>
      <div style="background-color: #f9f9f9; border-left: 4px solid ${emailBrandSettings.primaryColor}; padding: 16px; margin: 16px 0; border-radius: 4px;">
        <p style="margin: 0 0 8px; color: #666666; font-size: 14px;"><strong>${t.userInvitation.emailLabel}</strong> ${data.email}</p>
        <p style="margin: 0 0 8px; color: #666666; font-size: 14px;"><strong>${t.userInvitation.passwordLabel}</strong> <code style="background-color: #e5e5e5; padding: 2px 6px; border-radius: 3px; font-family: monospace;">${data.tempPassword}</code></p>
        <p style="margin: 12px 0 0; color: #ef4444; font-size: 12px; font-weight: 600;">${t.userInvitation.warning}</p>
      </div>
      <p>${t.userInvitation.body2(brandSettings.platformName)}</p>
    `
    return generateBaseEmailTemplate(
      t.userInvitation.title(brandSettings.platformName),
      t.userInvitation.subtitle,
      content,
      { text: t.userInvitation.cta, url: data.loginUrl },
      emailBrandSettings,
      lang
    )
  },
  text: async (data: UserInvitationEmailData) => {
    const { getBrandSettings } = await import("@/lib/supabase/brand-settings")
    const brandSettings = await getBrandSettings()
    const lang = data.language || "en"
    const t = getEmailTranslation(lang)
    const roleText =
      data.role === "admin"
        ? (lang === "ru" ? "Администратор" : "Administrator")
        : data.role === "program_manager"
          ? (lang === "ru" ? "Менеджер программы" : "Program Manager")
          : (lang === "ru" ? "Студент" : "Student")
    return `
${t.userInvitation.title(brandSettings.platformName)}

${t.userInvitation.greeting(data.name)}

${t.userInvitation.body1(brandSettings.platformName, roleText)}

${t.userInvitation.emailLabel} ${data.email}
${t.userInvitation.passwordLabel} ${data.tempPassword}

${t.userInvitation.warning}

${t.userInvitation.body2(brandSettings.platformName)}

${t.userInvitation.cta}: ${data.loginUrl}

${lang === "ru" ? "С уважением," : "Best regards,"}
${brandSettings.platformName} ${lang === "ru" ? "Команда" : "Team"}
    `.trim()
  },
}
