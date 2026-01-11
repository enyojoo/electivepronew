import { createClient } from "@supabase/supabase-js"
import { createServerClient } from "@supabase/ssr"
import type { Database } from "@/types/supabase"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Create a singleton for the browser client
let browserClient: ReturnType<typeof createClient<Database>> | null = null

// Function to get the browser client (singleton pattern)
export function getSupabaseBrowserClient() {
  if (typeof window === "undefined") {
    // Server-side - create a new instance each time
    return createClient<Database>(supabaseUrl, supabaseAnonKey)
  }

  // Client-side - use singleton pattern
  if (!browserClient) {
    browserClient = createClient<Database>(supabaseUrl, supabaseAnonKey)
  }

  return browserClient
}

// Function to create a server client with cookies (for server components and server actions)
export async function createServerComponentClient() {
  const { cookies } = await import("next/headers")
  const cookieStore = await cookies()
  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing user sessions.
        }
      },
    },
  })
}

// Function to get the server client with service role
export function getSupabaseServerClient() {
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient<Database>(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
}

// Export the singleton client for backward compatibility
export const supabase = getSupabaseBrowserClient()

// For server-side operations requiring admin privileges
export const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient<Database>(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  : supabase
