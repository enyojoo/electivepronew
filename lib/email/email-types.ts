/**
 * TypeScript interfaces for all email data types
 */

export interface WelcomeEmailData {
  firstName: string
  lastName: string
  email: string
  dashboardUrl: string
}

export interface CourseSelectionSubmittedEmailData {
  firstName: string
  lastName: string
  email: string
  courseSelectionId: string
  programName: string
  selectedCourses: string[]
  submittedAt: string
  selectionUrl: string
}

export interface ExchangeSelectionSubmittedEmailData {
  firstName: string
  lastName: string
  email: string
  exchangeSelectionId: string
  programName: string
  selectedUniversities: Array<{
    name: string
    country: string
    city: string
    preferenceOrder: number
  }>
  submittedAt: string
  selectionUrl: string
}

export interface SelectionApprovedEmailData {
  firstName: string
  lastName: string
  email: string
  selectionId: string
  selectionType: "course" | "exchange"
  programName: string
  approvedAt: string
  selectionUrl: string
}

export interface SelectionRejectedEmailData {
  firstName: string
  lastName: string
  email: string
  selectionId: string
  selectionType: "course" | "exchange"
  programName: string
  rejectedAt: string
  selectionUrl: string
  rejectionReason?: string
}

export interface NewSelectionNotificationEmailData {
  adminEmail: string
  studentName: string
  studentEmail: string
  selectionId: string
  selectionType: "course" | "exchange"
  programName: string
  submittedAt: string
  selectionUrl: string
}

export interface UserInvitationEmailData {
  email: string
  name: string
  role: "admin" | "program_manager" | "student"
  tempPassword: string
  loginUrl: string
}
