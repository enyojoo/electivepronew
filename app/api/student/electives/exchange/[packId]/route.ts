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

    // Fetch specific exchange program for the student's group
    const { data: exchangeProgram, error } = await supabaseAdmin
      .from("elective_exchange")
      .select("*")
      .eq("id", packId)
      .eq("status", "published")
      .eq("group_id", studentGroupId)
      .single()

    if (error) {
      console.error("Error fetching elective exchange program:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!exchangeProgram) {
      return NextResponse.json({ error: "Exchange program not found" }, { status: 404 })
    }

    // Fetch university details using the UUIDs from the universities column
    let universities = []
    if (exchangeProgram.universities && exchangeProgram.universities.length > 0) {
      const { data: fetchedUniversities, error: universitiesError } = await supabaseAdmin
        .from("universities")
        .select("*")
        .in("id", exchangeProgram.universities)

      if (universitiesError) {
        console.error("Error fetching university details:", universitiesError)
        return NextResponse.json({ error: universitiesError.message }, { status: 500 })
      }

      // Fetch current student counts for each university (pending + approved)
      const universitiesWithCounts = await Promise.all(
        (fetchedUniversities || []).map(async (university) => {
          const { count: currentStudents, error: countError } = await supabaseAdmin
            .from("exchange_selections")
            .select("*", { count: "exact", head: true })
            .contains("selected_university_ids", [university.id])
            .in("status", ["pending", "approved"])

          if (countError) {
            console.error("Error fetching exchange selection count:", countError)
            return { ...university, current_students: 0 }
          }

          return { ...university, current_students: currentStudents || 0 }
        }),
      )

      // Order universities to match the order in the elective exchange
      const universitiesMap = new Map(universitiesWithCounts.map((u) => [u.id, u]))
      universities = exchangeProgram.universities.map((uuid) => universitiesMap.get(uuid)).filter(Boolean)
    }

    // Fetch student's exchange selection for this program
    const { data: selection, error: selectionError } = await supabaseAdmin
      .from("exchange_selections")
      .select("*")
      .eq("student_id", userId)
      .eq("elective_exchange_id", packId)
      .maybeSingle()

    if (selectionError) {
      console.error("Error fetching exchange selection:", selectionError)
      return NextResponse.json({ error: selectionError.message }, { status: 500 })
    }

    return NextResponse.json({
      exchangeProgram,
      universities,
      selection
    })
  } catch (error: any) {
    console.error("Unexpected error in student exchange detail API:", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}