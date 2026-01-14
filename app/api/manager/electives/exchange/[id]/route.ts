import { type NextRequest, NextResponse } from "next/server"
import { createServerComponentClient, supabaseAdmin } from "@/lib/supabase"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("Exchange API Route called with params:", params)
    console.log("Exchange API Route params.id:", params.id)

    // Extract ID from URL pathname as fallback
    const url = new URL(request.url)
    const pathnameParts = url.pathname.split('/')
    const exchangeIdFromUrl = pathnameParts[pathnameParts.length - 1]

    console.log("URL pathname:", url.pathname)
    console.log("Extracted exchangeId from URL:", exchangeIdFromUrl)

    const exchangeId = params.id || exchangeIdFromUrl
    console.log("Final exchangeId:", exchangeId)

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

    if (!exchangeId || exchangeId === 'undefined') {
      console.error("Invalid exchange ID:", exchangeId)
      return NextResponse.json({ error: "Invalid exchange ID" }, { status: 400 })
    }

    // Fetch exchange program with relationships
    const { data: exchangeProgram, error } = await (supabaseAdmin as any)
      .from("elective_exchange")
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
      .eq("id", exchangeId)
      .eq("created_by", userId)
      .single()

    if (error) {
      console.error("Error fetching exchange program:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!exchangeProgram) {
      return NextResponse.json({ error: "Exchange program not found" }, { status: 404 })
    }

    // Fetch universities using the UUIDs from the universities column
    let universitiesData: any[] = []
    if (exchangeProgram.universities && Array.isArray(exchangeProgram.universities) && exchangeProgram.universities.length > 0) {
      try {
        // Use a more direct approach - fetch all universities and filter in JavaScript
        // This avoids potential issues with the .in() query and UUID arrays
        const { data: allUniversities, error: fetchError } = await supabaseAdmin
          .from("universities")
          .select(`
            id,
            name,
            name_ru,
            country,
            max_students,
            website,
            description,
            description_ru,
            status
          `)

        if (fetchError) {
          console.error("Error fetching all universities:", fetchError)
        } else if (allUniversities) {
          // Filter universities that are in the exchange program's universities array
          universitiesData = allUniversities.filter((uni: any) =>
            exchangeProgram.universities!.includes(uni.id)
          )
          console.log(`Filtered ${universitiesData.length} universities from ${allUniversities.length} total`)
        }
      } catch (error) {
        console.error("Unexpected error loading universities:", error)
      }
    }

    // Fetch student selections for this exchange
    const { data: selections, error: selectionsError } = await supabaseAdmin
      .from("exchange_selections")
      .select(`
        *,
        profiles!student_id(
          id,
          full_name,
          email
        )
      `)
      .eq("elective_exchange_id", exchangeId)

    if (selectionsError) {
      console.error("Error loading student selections:", selectionsError)
    }

    // Combine the data
    const responseData = {
      ...exchangeProgram,
      universities: universitiesData,
      studentSelections: selections || [],
    }

    return NextResponse.json(responseData)
  } catch (error: any) {
    console.error("Unexpected error in manager exchange program API:", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}