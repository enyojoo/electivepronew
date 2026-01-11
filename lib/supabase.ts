import { createClient } from "@supabase/supabase-js"
import { createServerClient } from "@supabase/ssr"
import type { Database } from "@/types/supabase"

// Helper to get env vars with validation
function getSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    // During build time, return placeholder values to prevent errors
    if (process.env.NODE_ENV === "production" && !process.env.VERCEL) {
      // Only throw in production if not on Vercel (where env vars should be set)
      throw new Error("Missing Supabase environment variables")
    }
    // Return placeholder values for build time
    return {
      url: "https://placeholder.supabase.co",
      anonKey: "placeholder-key",
    }
  }

  return {
    url: supabaseUrl,
    anonKey: supabaseAnonKey,
  }
}

// Create a singleton for the browser client
let browserClient: ReturnType<typeof createClient<Database>> | null = null

// Function to get the browser client (singleton pattern)
export function getSupabaseBrowserClient() {
  const config = getSupabaseConfig()
  
  if (typeof window === "undefined") {
    // Server-side - create a new instance each time
    return createClient<Database>(config.url, config.anonKey)
  }

  // Client-side - use singleton pattern
  if (!browserClient) {
    browserClient = createClient<Database>(config.url, config.anonKey)
  }

  return browserClient
}

// Function to create a server client with cookies (for server components and server actions)
export async function createServerComponentClient() {
  const config = getSupabaseConfig()
  const { cookies } = await import("next/headers")
  const cookieStore = await cookies()
  return createServerClient<Database>(config.url, config.anonKey, {
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
  const config = getSupabaseConfig()
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-service-key"
  return createClient<Database>(config.url, supabaseServiceKey, { auth: { persistSession: false } })
}

// Lazy initialization for browser client (for backward compatibility)
let _supabase: ReturnType<typeof createClient<Database>> | null = null

function initSupabase() {
  if (!_supabase) {
    _supabase = getSupabaseBrowserClient()
  }
  return _supabase
}

// Export getter that initializes on first access
export const supabase = new Proxy({} as ReturnType<typeof createClient<Database>>, {
  get(_target, prop) {
    const client = initSupabase()
    const value = client[prop as keyof typeof client]
    // Bind methods to maintain 'this' context
    if (typeof value === "function") {
      return value.bind(client)
    }
    return value
  },
})

// For server-side operations requiring admin privileges
let _supabaseAdmin: ReturnType<typeof createClient<Database>> | null = null

function initSupabaseAdmin() {
  if (!_supabaseAdmin) {
    const config = getSupabaseConfig()
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || config.anonKey
    _supabaseAdmin = createClient<Database>(config.url, supabaseServiceKey, { auth: { persistSession: false } })
  }
  return _supabaseAdmin
}

export const supabaseAdmin = new Proxy({} as ReturnType<typeof createClient<Database>>, {
  get(_target, prop) {
    const client = initSupabaseAdmin()
    const value = client[prop as keyof typeof client]
    // Bind methods to maintain 'this' context
    if (typeof value === "function") {
      return value.bind(client)
    }
    return value
  },
})
