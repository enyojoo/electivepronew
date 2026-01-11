"use server"

import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { getCurrentUser } from "@/lib/session"

interface CreateStudentExchangeSelectionParams {
  electivePackId: string
  universities: {
    universityId: string
    preferenceOrder: number
  }[]
  motivationLetterUrl?: string
  transcriptUrl?: string
}

export async function createStudentExchangeSelection({
  electivePackId,
  universities,
  motivationLetterUrl,
  transcriptUrl,
}: CreateStudentExchangeSelectionParams) {
  const supabase = createServerComponentClient({ cookies })
  const user = await getCurrentUser()

  // Create the selection
  const { data: selection, error: selectionError } = await supabase
    .from("student_exchange_selections")
    .insert({
      student_id: user.id,
      elective_pack_id: electivePackId,
      motivation_letter_url: motivationLetterUrl,
      transcript_url: transcriptUrl,
    })
    .select()
    .single()

  if (selectionError) {
    console.error("Error creating student exchange selection:", selectionError)
    throw new Error("Failed to create student exchange selection")
  }

  // Create the university preferences
  const universitySelections = universities.map((university) => ({
    selection_id: selection.id,
    university_id: university.universityId,
    preference_order: university.preferenceOrder,
  }))

  const { error: universitySelectionsError } = await supabase
    .from("selection_universities")
    .insert(universitySelections)

  if (universitySelectionsError) {
    console.error("Error creating university selections:", universitySelectionsError)

    // Rollback the selection
    await supabase.from("student_exchange_selections").delete().eq("id", selection.id)

    throw new Error("Failed to create university selections")
  }

  revalidatePath("/student/electives/exchange")
  return selection
}

export async function getStudentExchangeSelections() {
  const supabase = createServerComponentClient({ cookies })
  const user = await getCurrentUser()

  const { data, error } = await supabase
    .from("student_exchange_selections")
    .select(`
      id,
      status,
      created_at,
      elective_pack_id,
      elective_packs (
        id,
        title,
        name,
        deadline
      ),
      selection_universities (
        id,
        preference_order,
        university_id,
        exchange_universities (
          id,
          name,
          name_ru,
          country,
          city
        )
      )
    `)
    .eq("student_id", user.id)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching student exchange selections:", error)
    throw new Error("Failed to fetch student exchange selections")
  }

  return data
}

export async function getStudentExchangeSelection(id: string) {
  const supabase = createServerComponentClient({ cookies })

  const { data, error } = await supabase
    .from("student_exchange_selections")
    .select(`
      id,
      status,
      created_at,
      motivation_letter_url,
      transcript_url,
      student_id,
      elective_pack_id,
      elective_packs (
        id,
        title,
        name,
        deadline
      ),
      selection_universities (
        id,
        preference_order,
        university_id,
        exchange_universities (
          id,
          name,
          name_ru,
          country,
          city,
          max_students
        )
      )
    `)
    .eq("id", id)
    .single()

  if (error) {
    console.error("Error fetching student exchange selection:", error)
    throw new Error("Failed to fetch student exchange selection")
  }

  return data
}
