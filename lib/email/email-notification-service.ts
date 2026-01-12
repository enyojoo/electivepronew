import { supabaseAdmin } from "@/lib/supabase"
import {
  sendWelcomeEmail,
  sendCourseSelectionSubmittedEmail,
  sendExchangeSelectionSubmittedEmail,
  sendSelectionApprovedEmail,
  sendSelectionRejectedEmail,
  sendNewSelectionNotificationEmail,
  sendUserInvitationEmail,
} from "./email-service"
import type {
  WelcomeEmailData,
  CourseSelectionSubmittedEmailData,
  ExchangeSelectionSubmittedEmailData,
  SelectionApprovedEmailData,
  SelectionRejectedEmailData,
  NewSelectionNotificationEmailData,
  UserInvitationEmailData,
} from "./email-types"
import { DEFAULT_APP_URL } from "@/lib/constants"

// Get app URL from env (server-side only)
function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_APP_URL
}

const APP_URL = getAppUrl()

/**
 * Send welcome email to new user
 */
export async function sendWelcomeEmailNotification(
  userEmail: string,
  firstName: string,
  language: "en" | "ru" = "en"
): Promise<void> {
  try {
    const nameParts = firstName.split(" ")
    const lastName = nameParts.slice(1).join(" ") || ""
    const dashboardUrl = `${APP_URL}/student/dashboard`

    const emailData: WelcomeEmailData = {
      firstName: nameParts[0] || firstName,
      lastName,
      email: userEmail,
      dashboardUrl,
      language,
    }

    await sendWelcomeEmail(emailData)
  } catch (error) {
    console.error("Error sending welcome email:", error)
    // Don't throw - email failures shouldn't break workflows
  }
}

/**
 * Send course selection submitted email
 */
export async function sendCourseSelectionSubmittedEmailNotification(
  selectionId: string,
  language: "en" | "ru" = "en"
): Promise<void> {
  try {
    // Fetch selection with related data
    const { data: selection, error } = await supabaseAdmin
      .from("course_selections")
      .select(
        `
        id,
        student_id,
        elective_courses_id,
        selected_course_ids,
        created_at,
        profiles:student_id (id, full_name, email),
        elective_courses:elective_courses_id (id, name, name_ru)
      `
      )
      .eq("id", selectionId)
      .single()

    if (error || !selection) {
      console.error("Error fetching course selection:", error)
      return
    }

    const profile = selection.profiles as any
    const program = selection.elective_courses as any
    const nameParts = (profile?.full_name || "").split(" ")

    // Fetch course details
    // Handle both selected_course_ids (array) and selected_ids (legacy)
    const courseIds = (selection.selected_course_ids || selection.selected_ids || []) as string[]
    const { data: courses } = await supabaseAdmin
      .from("courses")
      .select("id, name, name_ru")
      .in("id", courseIds)

    const selectedCourses = (courses || []).map((c: any) => c.name || c.name_ru || "Unknown Course")

    const emailData: CourseSelectionSubmittedEmailData = {
      firstName: nameParts[0] || "Student",
      lastName: nameParts.slice(1).join(" ") || "",
      email: profile?.email || "",
      courseSelectionId: selection.id,
      programName: program?.name || program?.name_ru || "Unknown Program",
      selectedCourses,
      submittedAt: selection.created_at,
      selectionUrl: `${APP_URL}/student/courses`,
      language,
    }

    await sendCourseSelectionSubmittedEmail(emailData)
  } catch (error) {
    console.error("Error sending course selection email:", error)
  }
}

/**
 * Send exchange selection submitted email
 */
export async function sendExchangeSelectionSubmittedEmailNotification(
  selectionId: string,
  language: "en" | "ru" = "en"
): Promise<void> {
  try {
    // Fetch selection with related data
    const { data: selection, error } = await supabaseAdmin
      .from("exchange_selections")
      .select(
        `
        id,
        student_id,
        elective_exchange_id,
        selected_university_ids,
        created_at,
        profiles:student_id (id, full_name, email),
        elective_exchange:elective_exchange_id (id, name, name_ru)
      `
      )
      .eq("id", selectionId)
      .single()

    if (error || !selection) {
      console.error("Error fetching exchange selection:", error)
      return
    }

    const profile = selection.profiles as any
    const program = selection.elective_exchange as any
    const nameParts = (profile?.full_name || "").split(" ")

    // Fetch university details
    const universityIds = (selection.selected_university_ids || []) as string[]
    const { data: universities } = await supabaseAdmin
      .from("exchange_universities")
      .select("id, name, name_ru, country, city")
      .in("id", universityIds)

    const selectedUniversities = (universities || []).map((u: any, index: number) => ({
      name: u.name || u.name_ru || "Unknown University",
      country: u.country || "",
      city: u.city || "",
      preferenceOrder: index + 1,
    }))

    const emailData: ExchangeSelectionSubmittedEmailData = {
      firstName: nameParts[0] || "Student",
      lastName: nameParts.slice(1).join(" ") || "",
      email: profile?.email || "",
      exchangeSelectionId: selection.id,
      programName: program?.name || program?.name_ru || "Unknown Program",
      selectedUniversities,
      submittedAt: selection.created_at,
      selectionUrl: `${APP_URL}/student/exchange`,
      language,
    }

    await sendExchangeSelectionSubmittedEmail(emailData)
  } catch (error) {
    console.error("Error sending exchange selection email:", error)
  }
}

/**
 * Send selection approved email
 */
export async function sendSelectionApprovedEmailNotification(
  selectionId: string,
  selectionType: "course" | "exchange",
  language: "en" | "ru" = "en"
): Promise<void> {
  try {
    const tableName =
      selectionType === "course" ? "course_selections" : "exchange_selections"
    const programRelation =
      selectionType === "course" ? "elective_courses" : "elective_exchange"

    const { data: selection, error } = await supabaseAdmin
      .from(tableName)
      .select(
        `
        id,
        student_id,
        ${selectionType === "course" ? "elective_courses_id" : "elective_exchange_id"},
        updated_at,
        profiles:student_id (id, full_name, email),
        ${programRelation}:${selectionType === "course" ? "elective_courses_id" : "elective_exchange_id"} (id, name, name_ru)
      `
      )
      .eq("id", selectionId)
      .single()

    if (error || !selection) {
      console.error(`Error fetching ${selectionType} selection:`, error)
      return
    }

    const profile = selection.profiles as any
    const program = selection[programRelation] as any
    const nameParts = (profile?.full_name || "").split(" ")

    const emailData: SelectionApprovedEmailData = {
      firstName: nameParts[0] || "Student",
      lastName: nameParts.slice(1).join(" ") || "",
      email: profile?.email || "",
      selectionId: selection.id,
      selectionType,
      programName: program?.name || program?.name_ru || "Unknown Program",
      approvedAt: selection.updated_at,
      selectionUrl: `${APP_URL}/student/${selectionType === "course" ? "courses" : "exchange"}`,
      language,
    }

    await sendSelectionApprovedEmail(emailData)
  } catch (error) {
    console.error("Error sending selection approved email:", error)
  }
}

/**
 * Send selection rejected email
 */
export async function sendSelectionRejectedEmailNotification(
  selectionId: string,
  selectionType: "course" | "exchange",
  language: "en" | "ru" = "en"
): Promise<void> {
  try {
    const tableName =
      selectionType === "course" ? "course_selections" : "exchange_selections"
    const programRelation =
      selectionType === "course" ? "elective_courses" : "elective_exchange"

    const { data: selection, error } = await supabaseAdmin
      .from(tableName)
      .select(
        `
        id,
        student_id,
        ${selectionType === "course" ? "elective_courses_id" : "elective_exchange_id"},
        updated_at,
        profiles:student_id (id, full_name, email),
        ${programRelation}:${selectionType === "course" ? "elective_courses_id" : "elective_exchange_id"} (id, name, name_ru)
      `
      )
      .eq("id", selectionId)
      .single()

    if (error || !selection) {
      console.error(`Error fetching ${selectionType} selection:`, error)
      return
    }

    const profile = selection.profiles as any
    const program = selection[programRelation] as any
    const nameParts = (profile?.full_name || "").split(" ")

    const emailData: SelectionRejectedEmailData = {
      firstName: nameParts[0] || "Student",
      lastName: nameParts.slice(1).join(" ") || "",
      email: profile?.email || "",
      selectionId: selection.id,
      selectionType,
      programName: program?.name || program?.name_ru || "Unknown Program",
      rejectedAt: selection.updated_at,
      selectionUrl: `${APP_URL}/student/${selectionType === "course" ? "courses" : "exchange"}`,
      rejectionReason: (selection as any).rejection_reason,
      language,
    }

    await sendSelectionRejectedEmail(emailData)
  } catch (error) {
    console.error("Error sending selection rejected email:", error)
  }
}

/**
 * Send new selection notification to admin/manager
 */
export async function sendNewSelectionNotificationEmailNotification(
  selectionId: string,
  selectionType: "course" | "exchange",
  language: "en" | "ru" = "en"
): Promise<void> {
  try {
    const tableName =
      selectionType === "course" ? "course_selections" : "exchange_selections"
    const programRelation =
      selectionType === "course" ? "elective_courses" : "elective_exchange"

    const { data: selection, error } = await supabaseAdmin
      .from(tableName)
      .select(
        `
        id,
        student_id,
        ${selectionType === "course" ? "elective_courses_id" : "elective_exchange_id"},
        created_at,
        profiles:student_id (id, full_name, email),
        ${programRelation}:${selectionType === "course" ? "elective_courses_id" : "elective_exchange_id"} (id, name, name_ru)
      `
      )
      .eq("id", selectionId)
      .single()

    if (error || !selection) {
      console.error(`Error fetching ${selectionType} selection:`, error)
      return
    }

    const profile = selection.profiles as any
    const program = selection[programRelation] as any

    // Get admin/manager emails
    const { data: admins } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .in("role", ["admin", "program_manager"])

    if (!admins || admins.length === 0) {
      console.warn("No admins/managers found to notify")
      return
    }

    const emailData: NewSelectionNotificationEmailData = {
      adminEmail: admins[0].email, // Send to first admin (could be enhanced to send to all)
      studentName: profile?.full_name || "Unknown Student",
      studentEmail: profile?.email || "",
      selectionId: selection.id,
      selectionType,
      programName: program?.name || program?.name_ru || "Unknown Program",
      submittedAt: selection.created_at,
      selectionUrl: `${APP_URL}/${selectionType === "course" ? "manager/electives/course" : "manager/electives/exchange"}/${selectionType === "course" ? (selection as any).elective_courses_id : (selection as any).elective_exchange_id}`,
      language,
    }

    await sendNewSelectionNotificationEmail(emailData)
  } catch (error) {
    console.error("Error sending new selection notification email:", error)
  }
}

/**
 * Send user invitation email
 */
export async function sendUserInvitationEmailNotification(
  email: string,
  name: string,
  role: "admin" | "program_manager" | "student",
  tempPassword: string,
  language: "en" | "ru" = "en"
): Promise<void> {
  try {
    const roleRoute =
      role === "admin"
        ? "/admin/login"
        : role === "program_manager"
          ? "/manager/login"
          : "/student/login"

    const emailData: UserInvitationEmailData = {
      email,
      name,
      role,
      tempPassword,
      loginUrl: `${APP_URL}${roleRoute}`,
      language,
    }

    await sendUserInvitationEmail(emailData)
  } catch (error) {
    console.error("Error sending user invitation email:", error)
  }
}
