"use server"

import { createServerComponentClient } from "@/lib/supabase"
import { revalidatePath } from "next/cache"
import { getCurrentUser } from "@/lib/session"

interface CreateStudentExchangeSelectionParams {
  electiveExchangeId: string
  selectedUniversityIds: string[]
  statementUrl?: string
}

export async function createStudentExchangeSelection({
  electiveExchangeId,
  selectedUniversityIds,
  statementUrl,
}: CreateStudentExchangeSelectionParams) {
  const supabase = await createServerComponentClient()
  const user = await getCurrentUser()

  // Create the selection with selected_university_ids array
  const { data: selection, error: selectionError } = await supabase
    .from("exchange_selections")
    .insert({
      student_id: user.id,
      elective_exchange_id: electiveExchangeId,
      selected_university_ids: selectedUniversityIds,
      statement_url: statementUrl,
      status: "pending",
    })
    .select()
    .single()

  if (selectionError) {
    console.error("Error creating student exchange selection:", selectionError)
    throw new Error("Failed to create student exchange selection")
  }

  revalidatePath("/student/exchange")
  return selection
}

export async function getStudentExchangeSelections() {
  const supabase = await createServerComponentClient()
  const user = await getCurrentUser()

  const { data, error } = await supabase
    .from("exchange_selections")
    .select(`
      id,
      status,
      created_at,
      elective_exchange_id,
      selected_university_ids,
      statement_url,
      elective_exchange (
        id,
        name,
        name_ru,
        deadline
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
  const supabase = await createServerComponentClient()

  const { data, error } = await supabase
    .from("exchange_selections")
    .select(`
      id,
      status,
      created_at,
      statement_url,
      student_id,
      elective_exchange_id,
      selected_university_ids,
      elective_exchange (
        id,
        name,
        name_ru,
        deadline
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
