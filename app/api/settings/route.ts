import { NextRequest, NextResponse } from "next/server"
import { createServerComponentClient, supabaseAdmin } from "@/lib/supabase"
import { getBrandSettings } from "@/lib/supabase/brand-settings"

/**
 * GET: Returns settings for admin
 * Works with existing settings table structure
 */
export async function GET(request: NextRequest) {
  try {
    // Use createServerComponentClient which properly reads cookies in API routes
    const supabase = await createServerComponentClient()
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError) {
      console.error("Session error:", sessionError)
    }

    if (!session) {
      console.error("No session found")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin using admin client to bypass RLS
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single()

    if (!profile || profile.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      )
    }

    // Get brand settings with smart fallback
    const brandSettings = await getBrandSettings()

    // Also get raw settings for admin editing using admin client to bypass RLS
    // Since there's only one settings row, we can select without filtering by ID
    const { data: settings, error } = await supabaseAdmin
      .from("settings")
      .select("*")
      .limit(1)
      .maybeSingle()

    if (error && error.code !== "PGRST116") {
      // PGRST116 is "not found" - that's okay, we'll use defaults
      console.error("Error fetching settings:", error)
    }

    return NextResponse.json({
      brandSettings,
      rawSettings: settings || null,
    })
  } catch (error) {
    console.error("Error in GET /api/settings:", error)
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    )
  }
}

/**
 * PUT: Updates settings (admin only)
 * Extends to support new fields
 * Maintains compatibility with existing BrandingSettings component
 */
export async function PUT(request: NextRequest) {
  try {
    // Use createServerComponentClient which properly reads cookies in API routes
    const supabase = await createServerComponentClient()
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError) {
      console.error("Session error:", sessionError)
    }

    if (!session) {
      console.error("No session found")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin using admin client to bypass RLS
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single()

    if (!profile || profile.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      )
    }

    const body = await request.json()

    // First, get existing settings to preserve values for fields not being updated and get the ID
    const { data: existingSettings } = await supabaseAdmin
      .from("settings")
      .select("*")
      .limit(1)
      .maybeSingle()

    // Get existing ID or generate new UUID for creating
    let settingsId: string
    if (existingSettings?.id) {
      // Use existing ID to update the row
      settingsId = existingSettings.id
    } else {
      // Generate a new UUID for the settings row
      // Use a simple UUID v4 generator
      settingsId = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0
        const v = c === "x" ? r : (r & 0x3) | 0x8
        return v.toString(16)
      })
    }

    // Prepare upsert data - always include required NOT NULL fields
    const upsertData: {
      id: string
      name: string
      primary_color: string
      logo_url?: string | null
      favicon_url?: string | null
      selection_notifications?: boolean
      status_update_notifications?: boolean
      platform_announcements?: boolean
      user_email_notifications?: boolean
      updated_at: string
    } = {
      id: settingsId,
      // Use provided values or fall back to existing or defaults
      name: body.name !== undefined ? body.name : (existingSettings?.name || "ElectivePRO"),
      primary_color: body.primary_color !== undefined ? body.primary_color : (existingSettings?.primary_color || "#027659"),
      updated_at: new Date().toISOString(),
    }

    // Include optional fields if provided, otherwise preserve existing values
    if (body.logo_url !== undefined) {
      upsertData.logo_url = body.logo_url
    } else if (existingSettings?.logo_url !== undefined) {
      upsertData.logo_url = existingSettings.logo_url
    }

    if (body.favicon_url !== undefined) {
      upsertData.favicon_url = body.favicon_url
    } else if (existingSettings?.favicon_url !== undefined) {
      upsertData.favicon_url = existingSettings.favicon_url
    }

    if (body.selection_notifications !== undefined) {
      upsertData.selection_notifications = body.selection_notifications
    } else if (existingSettings?.selection_notifications !== undefined) {
      upsertData.selection_notifications = existingSettings.selection_notifications
    }

    if (body.status_update_notifications !== undefined) {
      upsertData.status_update_notifications = body.status_update_notifications
    } else if (existingSettings?.status_update_notifications !== undefined) {
      upsertData.status_update_notifications = existingSettings.status_update_notifications
    }

    if (body.platform_announcements !== undefined) {
      upsertData.platform_announcements = body.platform_announcements
    } else if (existingSettings?.platform_announcements !== undefined) {
      upsertData.platform_announcements = existingSettings.platform_announcements
    }

    if (body.user_email_notifications !== undefined) {
      upsertData.user_email_notifications = body.user_email_notifications
    } else if (existingSettings?.user_email_notifications !== undefined) {
      upsertData.user_email_notifications = existingSettings.user_email_notifications
    }

    // Use upsert to ensure the row exists and update it
    // Use supabaseAdmin to bypass RLS policies
    // If row exists, update it; if not, insert with the generated UUID
    const { data, error } = await supabaseAdmin
      .from("settings")
      .upsert(upsertData, { onConflict: "id" })
      .select()
      .single()

    if (error) {
      console.error("Error updating settings:", {
        error,
        errorCode: error.code,
        errorMessage: error.message,
        errorDetails: error.details,
        upsertData,
      })
      return NextResponse.json(
        { error: error.message || "Failed to update settings", errorCode: error.code },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, settings: data })
  } catch (error) {
    console.error("Error in PUT /api/settings:", error)
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    )
  }
}
