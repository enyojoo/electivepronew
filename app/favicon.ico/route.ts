import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

const DEFAULT_FAVICON_URL =
  "https://pbqvvvdhssghkpvsluvw.supabase.co/storage/v1/object/public/favicons//epro_favicon.svg"

export async function GET(request: NextRequest) {
  try {
    let faviconUrl = DEFAULT_FAVICON_URL

    // Try to get favicon from settings table
    try {
      const { data: settings } = await supabase
        .from("settings")
        .select("favicon_url")
        .eq("id", "00000000-0000-0000-0000-000000000000")
        .single()

      if (settings?.favicon_url) {
        faviconUrl = settings.favicon_url
      }
    } catch (error) {
      console.error("Error fetching settings for favicon:", error)
      // Fall back to default
    }

    // Fetch the favicon from the URL
    const faviconResponse = await fetch(faviconUrl)

    if (!faviconResponse.ok) {
      // Fallback to default if fetch fails
      const defaultResponse = await fetch(DEFAULT_FAVICON_URL)
      if (defaultResponse.ok) {
        const buffer = await defaultResponse.arrayBuffer()
        return new NextResponse(buffer, {
          headers: {
            "Content-Type": "image/svg+xml",
            "Cache-Control": "public, max-age=3600",
          },
        })
      }
      return new NextResponse("Not Found", { status: 404 })
    }

    const buffer = await faviconResponse.arrayBuffer()
    const contentType = faviconResponse.headers.get("content-type") || "image/x-icon"

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    })
  } catch (error) {
    console.error("Error serving favicon:", error)

    // Fallback to default favicon
    try {
      const defaultResponse = await fetch(DEFAULT_FAVICON_URL)
      if (defaultResponse.ok) {
        const buffer = await defaultResponse.arrayBuffer()
        return new NextResponse(buffer, {
          headers: {
            "Content-Type": "image/svg+xml",
            "Cache-Control": "public, max-age=3600",
          },
        })
      }
    } catch (fallbackError) {
      console.error("Error serving default favicon:", fallbackError)
    }

    return new NextResponse("Not Found", { status: 404 })
  }
}
