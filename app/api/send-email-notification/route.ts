import { NextRequest, NextResponse } from "next/server"
import {
  sendWelcomeEmailNotification,
  sendCourseSelectionSubmittedEmailNotification,
  sendExchangeSelectionSubmittedEmailNotification,
  sendSelectionApprovedEmailNotification,
  sendSelectionRejectedEmailNotification,
  sendNewSelectionNotificationEmailNotification,
  sendUserInvitationEmailNotification,
} from "@/lib/email/email-notification-service"

/**
 * HTTP endpoint for triggering emails
 * Non-blocking: Returns immediately, sends emails async
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, ...params } = body

    // Validate type
    if (!type) {
      return NextResponse.json(
        { error: "Email type is required" },
        { status: 400 }
      )
    }

    // Route to appropriate service method based on type
    // All email sending is async and non-blocking
    switch (type) {
      case "welcome":
        if (!params.userEmail || !params.firstName) {
          return NextResponse.json(
            { error: "userEmail and firstName are required" },
            { status: 400 }
          )
        }
        // Send async, don't wait
        sendWelcomeEmailNotification(
          params.userEmail,
          params.firstName,
          params.language || "en"
        ).catch(console.error)
        return NextResponse.json({ success: true, message: "Welcome email queued" })

      case "course-selection-submitted":
        if (!params.selectionId) {
          return NextResponse.json(
            { error: "selectionId is required" },
            { status: 400 }
          )
        }
        sendCourseSelectionSubmittedEmailNotification(
          params.selectionId,
          params.language || "en"
        ).catch(console.error)
        return NextResponse.json({
          success: true,
          message: "Course selection email queued",
        })

      case "exchange-selection-submitted":
        if (!params.selectionId) {
          return NextResponse.json(
            { error: "selectionId is required" },
            { status: 400 }
          )
        }
        sendExchangeSelectionSubmittedEmailNotification(
          params.selectionId,
          params.language || "en"
        ).catch(console.error)
        return NextResponse.json({
          success: true,
          message: "Exchange selection email queued",
        })

      case "selection-approved":
        if (!params.selectionId || !params.selectionType) {
          return NextResponse.json(
            { error: "selectionId and selectionType are required" },
            { status: 400 }
          )
        }
        sendSelectionApprovedEmailNotification(
          params.selectionId,
          params.selectionType,
          params.language || "en"
        ).catch(console.error)
        return NextResponse.json({
          success: true,
          message: "Selection approved email queued",
        })

      case "selection-rejected":
        if (!params.selectionId || !params.selectionType) {
          return NextResponse.json(
            { error: "selectionId and selectionType are required" },
            { status: 400 }
          )
        }
        sendSelectionRejectedEmailNotification(
          params.selectionId,
          params.selectionType,
          params.language || "en"
        ).catch(console.error)
        return NextResponse.json({
          success: true,
          message: "Selection rejected email queued",
        })

      case "new-selection-notification":
        if (!params.selectionId || !params.selectionType) {
          return NextResponse.json(
            { error: "selectionId and selectionType are required" },
            { status: 400 }
          )
        }
        sendNewSelectionNotificationEmailNotification(
          params.selectionId,
          params.selectionType,
          params.language || "en"
        ).catch(console.error)
        return NextResponse.json({
          success: true,
          message: "New selection notification email queued",
        })

      case "user-invitation":
        if (!params.email || !params.name || !params.role || !params.tempPassword) {
          return NextResponse.json(
            {
              error: "email, name, role, and tempPassword are required",
            },
            { status: 400 }
          )
        }
        sendUserInvitationEmailNotification(
          params.email,
          params.name,
          params.role,
          params.tempPassword,
          params.language || "en"
        ).catch(console.error)
        return NextResponse.json({
          success: true,
          message: "User invitation email queued",
        })

      default:
        return NextResponse.json(
          { error: `Unknown email type: ${type}` },
          { status: 400 }
        )
    }
  } catch (error: any) {
    console.error("Error in send-email-notification endpoint:", error)
    return NextResponse.json(
      { error: error.message || "Failed to process email request" },
      { status: 500 }
    )
  }
}
