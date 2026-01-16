import { type NextRequest, NextResponse } from "next/server"
import { createServerComponentClient, supabaseAdmin } from "@/lib/supabase"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ packId: string }> }
) {
  try {
    const resolvedParams = await params
    const packId = resolvedParams.packId

    if (!packId) {
      return NextResponse.json({ error: "Pack ID is required" }, { status: 400 })
    }

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

    // Fetch course details using the UUIDs from the courses column
    let courses = []
    if (course.courses && course.courses.length > 0) {
      const { data: fetchedCourses, error: coursesError } = await supabaseAdmin
        .from("courses")
        .select("id, name, name_ru, instructor_en, instructor_ru, description, description_ru, max_students")
        .in("id", course.courses)

      if (coursesError) {
        console.error("Error fetching course details:", coursesError)
        return NextResponse.json({ error: coursesError.message }, { status: 500 })
      }

      // Fetch current student counts for each course (pending + approved)
      const coursesWithCounts = await Promise.all(
        (fetchedCourses || []).map(async (fetchedCourse) => {
          const { count: currentStudents, error: countError } = await supabaseAdmin
            .from("course_selections")
            .select("*", { count: "exact", head: true })
            .contains("selected_course_ids", [fetchedCourse.id])
            .in("status", ["pending", "approved"])

          if (countError) {
            console.error("Error fetching course selection count:", countError)
            return { ...fetchedCourse, current_students: 0 }
          }

          return { ...fetchedCourse, current_students: currentStudents || 0 }
        }),
      )

      // Order courses to match the order in the elective course
      const coursesMap = new Map(coursesWithCounts.map((c) => [c.id, c]))
      courses = course.courses.map((uuid) => coursesMap.get(uuid)).filter(Boolean)
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

    // Generate signed URLs for template if it exists
    let signedTemplateUrl = null
    if (course.syllabus_template_url) {
      try {
        // Extract the file path from the URL
        const url = new URL(course.syllabus_template_url)
        const pathParts = url.pathname.split('/')
        const filePath = pathParts.slice(pathParts.indexOf('documents') + 1).join('/')

        if (filePath) {
          const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
            .from('documents')
            .createSignedUrl(filePath, 3600) // 1 hour expiry

          if (!signedUrlError && signedUrlData) {
            signedTemplateUrl = signedUrlData.signedUrl
          }
        }
      } catch (error) {
        console.error("Error creating signed URL for template:", error)
        // Fallback to original URL
        signedTemplateUrl = course.syllabus_template_url
      }
    }

    return NextResponse.json({
      course: {
        ...course,
        syllabus_template_url: signedTemplateUrl || course.syllabus_template_url
      },
      courses,
      selection
    })
  } catch (error: any) {
    console.error("Unexpected error in student course detail API:", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}