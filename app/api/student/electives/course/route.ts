import { type NextRequest, NextResponse } from "next/server"
import { createServerComponentClient, supabaseAdmin } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    // Get the current user's authenticated data (secure approach)
    const supabase = await createServerComponentClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError) {
      console.error("User authentication error:", userError)
      return NextResponse.json({ error: "Authentication failed" }, { status: 401 })
    }

    if (!user) {
      console.error("No authenticated user found")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = user.id

    // Get student's group information
    const { data: studentProfileData, error: studentProfileError } = await supabaseAdmin
      .from("student_profiles")
      .select("group_id")
      .eq("profile_id", userId)
      .single()

    if (studentProfileError || !studentProfileData?.group_id) {
      console.error("Student group information not found:", studentProfileError)
      return NextResponse.json({ error: "Student group information is missing" }, { status: 400 })
    }

    const studentGroupId = studentProfileData.group_id

    // Fetch published elective courses for the student's group
    const { data: courses, error } = await supabaseAdmin
      .from("elective_courses")
      .select("*")
      .eq("status", "published")
      .eq("group_id", studentGroupId)
      .order("deadline", { ascending: false })

    if (error) {
      console.error("Error fetching elective courses:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Fetch student's course selections
    const { data: selections, error: selectionsError } = await supabaseAdmin
      .from("course_selections")
      .select("*")
      .eq("student_id", userId)

    if (selectionsError) {
      console.error("Error fetching course selections:", selectionsError)
      return NextResponse.json({ error: selectionsError.message }, { status: 500 })
    }

    return NextResponse.json({
      courses: courses || [],
      selections: selections || []
    })
  } catch (error: any) {
    console.error("Unexpected error in student course electives API:", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}