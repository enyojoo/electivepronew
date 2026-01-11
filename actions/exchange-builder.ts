"use server"

import { getSupabaseServerClient } from "@/lib/supabase"

export async function createExchangeProgram(data: {
  name: string
  nameRu?: string
  status: string
  deadline: string
  maxSelections: number
  statementTemplateUrl?: string
  semester: string
  academicYear: string
  type: string
  selectedUniversities: string[]
}) {
  const supabase = getSupabaseServerClient()

  try {
    // Step 1: Create the elective pack
    const { data: packData, error: packError } = await supabase
      .from("elective_packs")
      .insert([
        {
          name: data.name,
          name_ru: data.nameRu,
          status: data.status,
          deadline: data.deadline,
          max_selections: data.maxSelections,
          statement_template_url: data.statementTemplateUrl,
          semester: data.semester,
          academic_year: data.academicYear,
          type: data.type,
        },
      ])
      .select()

    if (packError) {
      console.error("Error creating elective pack:", packError)
      throw packError
    }

    const packId = packData[0].id

    // Step 2: Use raw SQL to insert into exchange_universities
    // This bypasses the schema cache issues
    for (const universityId of data.selectedUniversities) {
      try {
        // Get university details
        const { data: universityData, error: universityError } = await supabase
          .from("exchange_universities")
          .select("name, name_ru, country, city, max_students")
          .eq("id", universityId)
          .single()

        if (universityError) {
          console.error("Error fetching university details:", universityError)
          continue
        }

        // Use raw SQL to insert the exchange university
        const { error: insertError } = await supabase.rpc("insert_exchange_university", {
          p_elective_pack_id: packId,
          p_name: universityData.name,
          p_name_ru: universityData.name_ru,
          p_country: universityData.country,
          p_city: universityData.city,
          p_max_students: universityData.max_students,
          p_status: "active",
        })

        if (insertError) {
          console.error("Error creating exchange university:", insertError)
        }
      } catch (error) {
        console.error("Error processing university:", universityId, error)
      }
    }

    return { success: true, packId }
  } catch (error) {
    console.error("Error in createExchangeProgram:", error)
    return { success: false, error }
  }
}
