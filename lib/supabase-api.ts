import { createServerClient } from "@supabase/ssr"
import type { Database } from "@/types/supabase"
import type { NextRequest } from "next/server"

// Helper to get env vars with validation
function getSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables")
  }

  return {
    url: supabaseUrl,
    anonKey: supabaseAnonKey,
  }
}

/**
 * Create a Supabase client for API routes from the request object
 * This properly handles cookies from the request headers
 */
export async function createApiRouteClient(request: NextRequest) {
  const config = getSupabaseConfig()
  
  // Parse cookies from request headers
  const cookieHeader = request.headers.get("cookie") || ""
  const cookies: { [key: string]: string } = {}
  
  if (cookieHeader) {
    cookieHeader.split(";").forEach((cookie) => {
      const [name, ...rest] = cookie.trim().split("=")
      if (name) {
        cookies[name] = rest.join("=")
      }
    })
  }

  return createServerClient<Database>(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return Object.entries(cookies).map(([name, value]) => ({ name, value }))
      },
      setAll(cookiesToSet) {
        // In API routes, we can't set cookies in the response directly
        // This is handled by the middleware or response headers
      },
    },
  })
}
