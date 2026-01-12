import { NextResponse } from "next/server"
import { getBrandSettings } from "@/lib/supabase/brand-settings"

/**
 * Public endpoint for brand settings (no auth required)
 * Used on auth pages and public pages
 */
export async function GET() {
  try {
    const brandSettings = await getBrandSettings()
    return NextResponse.json(brandSettings)
  } catch (error) {
    console.error("Error fetching brand settings:", error)
    return NextResponse.json(
      { error: "Failed to fetch brand settings" },
      { status: 500 }
    )
  }
}
