import { NextRequest, NextResponse } from "next/server"
import { createServerComponentClient } from "@/lib/supabase"
import { getBrandSettings } from "@/lib/supabase/brand-settings"

const SETTINGS_ID = "00000000-0000-0000-0000-000000000000"

/**
 * GET: Returns settings for admin
 * Works with existing settings table structure
 */
export async function GET() {
  try {
    const supabase = await createServerComponentClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase
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

    // Also get raw settings for admin editing
    const { data: settings, error } = await supabase
      .from("settings")
      .select("*")
      .eq("id", SETTINGS_ID)
      .single()

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
    const supabase = await createServerComponentClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase
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

    // Prepare update data
    const updateData: {
      name?: string
      primary_color?: string
      logo_url?: string | null
      favicon_url?: string | null
    } = {}

    if (body.name !== undefined) updateData.name = body.name
    if (body.primary_color !== undefined)
      updateData.primary_color = body.primary_color
    if (body.logo_url !== undefined) updateData.logo_url = body.logo_url
    if (body.favicon_url !== undefined)
      updateData.favicon_url = body.favicon_url

    // Use upsert to ensure the row exists and update it
    const { data, error } = await supabase
      .from("settings")
      .upsert(
        {
          id: SETTINGS_ID,
          ...updateData,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      )
      .select()
      .single()

    if (error) {
      console.error("Error updating settings:", error)
      return NextResponse.json(
        { error: "Failed to update settings" },
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
