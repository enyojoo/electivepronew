import { createClient } from "@supabase/supabase-js"
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

// Function to get the server client
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
