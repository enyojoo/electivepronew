import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export async function GET(request: NextRequest) {
  try {
    // Get the current user's session using createRouteHandlerClient for API routes
    const supabase = createRouteHandlerClient({ cookies })
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

    // Verify user is a program manager
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .eq("role", "program_manager")
      .single()

    if (profileError || !profileData) {
      console.error("Manager verification failed:", profileError)
      return NextResponse.json({ error: "Access denied - Program manager required" }, { status: 403 })
    }

    // Fetch elective courses with relationships
    const { data: packs, error } = await (supabaseAdmin as any)
      .from("elective_courses")
      .select(`
        *,
        academic_year:academic_year(
          id,
          year,
          is_active
        ),
        group:group_id(
          id,
          name
        ),
        created_by_profile:created_by(
          id,
          full_name
        )
      `)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching elective courses:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Add course count for each pack
    const packsWithCounts = (packs || []).map((pack: any) => ({
      ...pack,
      course_count: Array.isArray(pack.courses) ? pack.courses.length : 0,
    }))

    return NextResponse.json(packsWithCounts)
  } catch (error: any) {
    console.error("Unexpected error in manager course electives API:", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Get the current user's session using createRouteHandlerClient for API routes
    const supabase = createRouteHandlerClient({ cookies })
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

    // Verify user is a program manager
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .eq("role", "program_manager")
      .single()

    if (profileError || !profileData) {
      console.error("Manager verification failed:", profileError)
      return NextResponse.json({ error: "Access denied - Program manager required" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const packId = searchParams.get("id")

    if (!packId) {
      return NextResponse.json({ error: "Pack ID is required" }, { status: 400 })
    }

    // Delete the elective course pack
    const { error } = await (supabaseAdmin as any)
      .from("elective_courses")
      .delete()
      .eq("id", packId)

    if (error) {
      console.error("Error deleting elective course pack:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Elective course pack deleted successfully" })
  } catch (error: any) {
    console.error("Unexpected error in manager course electives DELETE API:", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}