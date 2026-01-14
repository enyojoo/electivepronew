import { type NextRequest, NextResponse } from "next/server"
import { createServerComponentClient, supabaseAdmin } from "@/lib/supabase"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    console.log("API Route called with params:", resolvedParams)
    console.log("API Route params.id:", resolvedParams.id)

    // Extract ID from URL pathname as fallback
    const url = new URL(request.url)
    const pathnameParts = url.pathname.split('/')
    const courseIdFromUrl = pathnameParts[pathnameParts.length - 1]

    console.log("URL pathname:", url.pathname)
    console.log("Extracted courseId from URL:", courseIdFromUrl)

    const courseId = resolvedParams.id || courseIdFromUrl
    console.log("Final courseId:", courseId)

    const supabase = await createServerComponentClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error("Authentication failed:", userError)
      return NextResponse.json({ error: "Authentication failed" }, { status: 401 })
    }

    const userId = user.id

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

    if (!courseId || courseId === 'undefined') {
      console.error("Invalid course ID:", courseId)
      return NextResponse.json({ error: "Invalid course ID" }, { status: 400 })
    }

    // Fetch elective course with relationships
    const { data: course, error: courseError } = await supabaseAdmin
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
      .eq("id", courseId)
      .eq("created_by", userId) // Only allow managers to view courses they created
      .single()

    if (courseError) {
      console.error("Error fetching elective course:", courseError)
      return NextResponse.json({ error: courseError.message }, { status: 500 })
    }

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    // Fetch courses using the UUIDs from the courses column
    let coursesData = []
    if (course.courses && Array.isArray(course.courses) && course.courses.length > 0) {
      const { data: courses, error: coursesError } = await supabaseAdmin
        .from("courses")
        .select(`
          id,
          name,
          name_ru,
          instructor_en,
          instructor_ru,
          degree_id,
          max_students,
          degrees(
            name,
            name_ru
          )
        `)
        .in("id", course.courses)

      if (coursesError) {
        console.error("Error loading courses:", coursesError)
      } else {
        coursesData = courses || []
      }
    }

    // Fetch student selections for this elective
    const { data: selections, error: selectionsError } = await supabaseAdmin
      .from("course_selections")
      .select(`
        *,
        profiles!student_id(
          id,
          full_name,
          email
        )
      `)
      .eq("elective_courses_id", resolvedParams.id)

    if (selectionsError) {
      console.error("Error loading student selections:", selectionsError)
    }

    // Combine the data
    const responseData = {
      ...course,
      courses: coursesData,
      studentSelections: selections || [],
    }

    return NextResponse.json(responseData)
  } catch (error: any) {
    console.error("Unexpected error in manager course detail API:", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}