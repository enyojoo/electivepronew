import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { DEFAULT_FAVICON_URL } from "@/lib/constants"

// Helper function to validate if a URL is valid
const isValidUrl = (url: string | null | undefined): boolean => {
  if (!url) return false
  try {
    const parsedUrl = new URL(url)
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:"
  } catch {
    return false
  }
}

export async function GET(request: NextRequest) {
  try {
    let faviconUrl = DEFAULT_FAVICON_URL

    // Try to get favicon from settings table (only if Supabase is configured and not during build)
    if (
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://placeholder.supabase.co"
    ) {
      try {
        const { data: settings, error } = await supabase
          .from("settings")
          .select("favicon_url")
          .limit(1)
          .single()

        if (!error && settings?.favicon_url && isValidUrl(settings.favicon_url)) {
          faviconUrl = settings.favicon_url
        }
      } catch (error) {
        // Silently fall back to default during build or if settings fetch fails
      }
    }

    // Fetch the favicon from the URL (with timeout for build-time)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

    try {
      const faviconResponse = await fetch(faviconUrl, {
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (!faviconResponse.ok) {
        throw new Error("Favicon fetch failed")
      }

      const buffer = await faviconResponse.arrayBuffer()
      const contentType = faviconResponse.headers.get("content-type") || "image/x-icon"

      return new NextResponse(buffer, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=3600",
        },
      })
    } catch (fetchError) {
      clearTimeout(timeoutId)
      // During build time or if fetch fails, return a simple SVG favicon
      // This prevents build errors when network is unavailable
      const svgFavicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#000000"/><text x="50" y="70" font-size="60" fill="white" text-anchor="middle" font-family="Arial">E</text></svg>`
      return new NextResponse(svgFavicon, {
        headers: {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "public, max-age=3600",
        },
      })
    }
  } catch (error) {
    // Final fallback: return a simple SVG favicon
    const svgFavicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#027659"/><text x="50" y="70" font-size="60" fill="white" text-anchor="middle" font-family="Arial">E</text></svg>`
    return new NextResponse(svgFavicon, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=3600",
      },
    })
  }
}
