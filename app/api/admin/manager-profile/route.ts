import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export async function PUT(request: NextRequest) {
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

    // Verify user is an admin
    const { data: adminProfile, error: adminError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .eq("role", "admin")
      .single()

    if (adminError || !adminProfile) {
      console.error("Admin verification failed:", adminError)
      return NextResponse.json({ error: "Access denied - Admin required" }, { status: 403 })
    }

    const body = await request.json()
    const { managerId, degreeId, academicYearId } = body

    if (!managerId) {
      return NextResponse.json({ error: "Manager ID is required" }, { status: 400 })
    }

    // Validate that the manager exists and is a program_manager
    const { data: managerProfile, error: managerCheckError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", managerId)
      .eq("role", "program_manager")
      .single()

    if (managerCheckError || !managerProfile) {
      return NextResponse.json({ error: "Invalid manager ID or user is not a program manager" }, { status: 400 })
    }

    // Validate degree exists if provided
    if (degreeId) {
      const { data: degreeData, error: degreeError } = await supabaseAdmin
        .from("degrees")
        .select("id")
        .eq("id", degreeId)
        .single()

      if (degreeError || !degreeData) {
        return NextResponse.json({ error: "Invalid degree ID" }, { status: 400 })
      }
    }

    // Validate academic year exists if provided
    if (academicYearId) {
      const { data: yearData, error: yearError } = await supabaseAdmin
        .from("academic_years")
        .select("id")
        .eq("id", academicYearId)
        .single()

      if (yearError || !yearData) {
        return NextResponse.json({ error: "Invalid academic year ID" }, { status: 400 })
      }
    }

    // Check if manager profile exists
    const { data: existingProfile, error: checkError } = await supabaseAdmin
      .from("manager_profiles")
      .select("*")
      .eq("profile_id", managerId)
      .maybeSingle()

    let result
    if (existingProfile) {
      // Update existing profile
      result = await supabaseAdmin
        .from("manager_profiles")
        .update({
          degree_id: degreeId || existingProfile.degree_id,
          academic_year_id: academicYearId || existingProfile.academic_year_id,
          updated_at: new Date().toISOString(),
        })
        .eq("profile_id", managerId)
        .select()
        .single()
    } else {
      // Create new profile
      result = await supabaseAdmin
        .from("manager_profiles")
        .insert({
          profile_id: managerId,
          degree_id: degreeId,
          academic_year_id: academicYearId,
        })
        .select()
        .single()
    }

    if (result.error) {
      console.error("Error updating manager profile:", result.error)
      return NextResponse.json({ error: result.error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Manager profile updated successfully",
      profile: result.data
    })
  } catch (error: any) {
    console.error("Unexpected error in admin manager profile API:", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}

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

    // Verify user is an admin
    const { data: adminProfile, error: adminError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .eq("role", "admin")
      .single()

    if (adminError || !adminProfile) {
      console.error("Admin verification failed:", adminError)
      return NextResponse.json({ error: "Access denied - Admin required" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const managerId = searchParams.get("managerId")

    if (!managerId) {
      return NextResponse.json({ error: "Manager ID is required" }, { status: 400 })
    }

    // Get manager profile with relationships
    const { data: managerProfileData, error } = await supabaseAdmin
      .from("manager_profiles")
      .select(`
        *,
        degrees(id, name, name_ru),
        academic_years(id, year, is_active)
      `)
      .eq("profile_id", managerId)
      .maybeSingle()

    if (error) {
      console.error("Error fetching manager profile:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Also get basic profile info
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, role")
      .eq("id", managerId)
      .single()

    if (profileError) {
      console.error("Error fetching manager basic profile:", profileError)
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    // Combine data
    const result = {
      ...profileData,
      manager_profile: managerProfileData ? {
        degree: managerProfileData.degrees,
        academic_year: managerProfileData.academic_years ? {
          id: managerProfileData.academic_years.id,
          name: managerProfileData.academic_years.name,
          start_year: managerProfileData.academic_years.start_year,
          end_year: managerProfileData.academic_years.end_year,
          display: managerProfileData.academic_years.year
        } : null,
      } : null
    }

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("Unexpected error in admin manager profile GET API:", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}