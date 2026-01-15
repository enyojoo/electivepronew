import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

/**
 * Public endpoint for brand settings (no auth required)
 * Returns raw settings data with confirmation flags
 * Never returns defaults - client decides after confirmation
 */
export async function GET() {
  try {
    const { data: platformSettings, error } = await supabaseAdmin
      .from("settings")
      .select("name, name_ru, primary_color, logo_url, logo_url_en, logo_url_ru, favicon_url")
      .limit(1)
      .maybeSingle()

    if (error && error.code !== "PGRST116") {
      // PGRST116 is "not found" - that's okay
      console.error("Error fetching brand settings:", error)
      return NextResponse.json(
        { error: "Failed to fetch brand settings" },
        { status: 500 }
      )
    }

    // Check if ANY custom brand setting has been set
    const hasCustomBranding = !!(
      platformSettings?.name ||
      platformSettings?.name_ru ||
      platformSettings?.logo_url ||
      platformSettings?.logo_url_en ||
      platformSettings?.logo_url_ru ||
      platformSettings?.favicon_url ||
      platformSettings?.primary_color
    )

    return NextResponse.json({
      platformSettings: platformSettings || null,
      hasCustomBranding,
      confirmed: true, // We've confirmed from database
    })
  } catch (error) {
    console.error("Error fetching brand settings:", error)
    return NextResponse.json(
      { error: "Failed to fetch brand settings" },
      { status: 500 }
    )
  }
}
