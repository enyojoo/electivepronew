import { createServerComponentClient } from "@/lib/supabase"
import { redirect } from "next/navigation"

export async function getCurrentUser() {
  const supabase = await createServerComponentClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/auth/signin")
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, is_active, degree_id, group_id, academic_year")
    .eq("id", session.user.id)
    .single()

  if (error || !profile) {
    console.error("Error fetching user profile:", error)
    redirect("/auth/signin")
  }

  return profile
}
