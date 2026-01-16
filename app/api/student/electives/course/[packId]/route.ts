import { type NextRequest, NextResponse } from "next/server"
import { createServerComponentClient, supabaseAdmin } from "@/lib/supabase"

export async function GET(
  request: NextRequest,
  { params }: { params: { packId: string } }
) {
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
    const packId = params.packId

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

    // Fetch specific elective course for the student's group
    const { data: course, error } = await supabaseAdmin
      .from("elective_courses")
      .select("*")
      .eq("id", packId)
      .eq("status", "published")
      .eq("group_id", studentGroupId)
      .single()

    if (error) {
      console.error("Error fetching elective course:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!course) {
      return NextResponse.json({ error: "Elective course not found" }, { status: 404 })
    }

    // Fetch student's course selection for this course
    const { data: selection, error: selectionError } = await supabaseAdmin
      .from("course_selections")
      .select("*")
      .eq("student_id", userId)
      .eq("elective_courses_id", packId)
      .maybeSingle()

    if (selectionError) {
      console.error("Error fetching course selection:", selectionError)
      return NextResponse.json({ error: selectionError.message }, { status: 500 })
    }

    return NextResponse.json({
      course,
      selection
    })
  } catch (error: any) {
    console.error("Unexpected error in student course detail API:", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}