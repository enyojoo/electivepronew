"use server"

import { getSupabaseServerClient } from "@/lib/supabase"

export async function ensureAdminUserExists() {
  const supabase = getSupabaseServerClient()

  // Check if admin user exists
  const { data: existingAdmin, error: checkError } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "admin")
    .limit(1)

  if (checkError) {
    console.error("Error checking for admin user:", checkError)
    return { success: false, error: checkError.message }
  }

  // If admin already exists, return
  if (existingAdmin && existingAdmin.length > 0) {
    return { success: true, message: "Admin user already exists" }
  }

  try {
    // Create a demo admin user if none exists
    const email = `admin@electivepro.local`
    const password = "Admin123!" // This should be changed immediately in production

    // Create auth user
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) throw authError

    // Create profile record
    const { error: profileError } = await supabase.from("profiles").insert({
      id: authUser.user.id,
      email: email,
      full_name: "Demo Admin",
      role: "admin",
      is_active: true,
    })

    if (profileError) throw profileError

    return { success: true, message: "Demo admin user created successfully" }
  } catch (error: any) {
    console.error("Error creating admin user:", error)
    return { success: false, error: error.message }
  }
}
