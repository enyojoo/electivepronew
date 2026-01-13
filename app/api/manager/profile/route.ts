import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export async function GET(request: NextRequest) {
  try {
    // Get the current user's session using createRouteHandlerClient for API routes
    const supabase = createRouteHandlerClient({ cookies: cookies() })
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError) {
      console.error("Session error:", sessionError)
      return NextResponse.json({ error: "Authentication error" }, { status: 401 })
    }

    if (!session) {
      console.error("No session found")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id

    // First, get the basic profile to verify it's a program manager
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .eq("role", "program_manager")
      .single()

    if (profileError) {
      console.error("Manager profile fetch error:", profileError)
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    if (!profileData) {
      return NextResponse.json({ error: "Manager profile not found" }, { status: 404 })
    }

    // Get manager profile data with relationships
    const { data: managerProfileData, error: managerProfileError } = await supabaseAdmin
      .from("manager_profiles")
      .select(`
        degree_id,
        academic_year_id,
        degrees(id, name, name_ru),
        academic_years(id, year, is_active)
      `)
      .eq("profile_id", userId)
      .maybeSingle()

    if (managerProfileError) {
      console.error("Manager profile data fetch error:", managerProfileError)
      // Don't return error if manager profile doesn't exist yet
      // Return profile with null manager data
      const processedProfile = {
        ...profileData,
        degrees: { id: null, name: "Contact Admin", name_ru: "Свяжитесь с админом" },
        degree: { id: null, name: "Contact Admin", name_ru: "Свяжитесь с админом" },
        academic_year: "Contact Admin",
        academic_year_id: null,
      }
      return NextResponse.json(processedProfile)
    }

    // Extract relationship data
    const degree = managerProfileData?.degrees
    const academicYear = managerProfileData?.academic_years

    // Combine profile and manager profile data
    const processedProfile = {
      ...profileData,
      degrees: degree || { id: null, name: "Contact Admin", name_ru: "Свяжитесь с админом" },
      degree: degree || { id: null, name: "Contact Admin", name_ru: "Свяжитесь с админом" },
      academic_year: academicYear ? academicYear.year : "Contact Admin",
      academic_year_id: academicYear?.id || null,
    }

    return NextResponse.json(processedProfile)
  } catch (error: any) {
    console.error("Unexpected error in manager profile API:", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}