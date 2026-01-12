"use server"

import { getSupabaseServerClient } from "@/lib/supabase"
import { revalidatePath } from "next/cache"

export async function getExchangeProgram(id: string) {
  try {
    const supabase = getSupabaseServerClient()
    const { data, error } = await supabase.from("elective_exchange").select("*").eq("id", id).single()

    if (error) {
      console.error("Error fetching exchange program:", error)
      return null
    }

    return data
  } catch (error) {
    console.error("Error in getExchangeProgram:", error)
    return null
  }
}

export async function getUniversitiesFromIds(universityIds: string[]) {
  if (!universityIds || universityIds.length === 0) {
    return []
  }

  try {
    const supabase = getSupabaseServerClient()
    // First get universities
    const { data: universities, error: univError } = await supabase
      .from("universities")
      .select("*")
      .in("id", universityIds)
      .order("name")

    if (univError) {
      console.error("Error fetching universities:", univError)
      return []
    }

    // Return universities (language column removed from schema)
    return universities || []
  } catch (error) {
    console.error("Error in getUniversitiesFromIds:", error)
    return []
  }
}

export async function getExchangeSelections(exchangeId: string) {
  try {
    const supabase = getSupabaseServerClient()
    // First get the selections
    const { data: selections, error: selectionsError } = await supabase
      .from("exchange_selections")
      .select("*")
      .eq("elective_exchange_id", exchangeId)
      .order("created_at", { ascending: false })

    if (selectionsError) {
      console.error("Error fetching exchange selections:", selectionsError)
      return []
    }

    // Then get profile data for each selection
    const selectionsWithProfiles = await Promise.all(
      (selections || []).map(async (selection) => {
        try {
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("id, full_name, email")
            .eq("id", selection.student_id)
            .single()

          if (profileError) {
            console.error("Error fetching profile for student:", selection.student_id, profileError)
            return {
              ...selection,
              profiles: null,
            }
          }

          return {
            ...selection,
            profiles: profile,
          }
        } catch (error) {
          console.error("Error processing selection profile:", error)
          return {
            ...selection,
            profiles: null,
          }
        }
      }),
    )

    return selectionsWithProfiles
  } catch (error) {
    console.error("Error in getExchangeSelections:", error)
    return []
  }
}

export async function getUniversitySelectionData(universityId: string, exchangeId: string) {
  try {
    const supabase = getSupabaseServerClient()
    // Get all selections for this exchange
    const { data: selections, error: selectionsError } = await supabase
      .from("exchange_selections")
      .select("*")
      .eq("elective_exchange_id", exchangeId)

    if (selectionsError) {
      console.error("Error fetching selections:", selectionsError)
      return []
    }

    // Filter selections that include this university
    const filteredSelections = (selections || []).filter(
      (selection) =>
        selection.selected_university_ids &&
        Array.isArray(selection.selected_university_ids) &&
        selection.selected_university_ids.includes(universityId),
    )

    // Get profile data for filtered selections
    const selectionsWithProfiles = await Promise.all(
      filteredSelections.map(async (selection) => {
        try {
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("id, full_name, email")
            .eq("id", selection.student_id)
            .single()

          if (profileError) {
            console.error("Error fetching profile:", profileError)
            return {
              ...selection,
              profiles: null,
            }
          }

          return {
            ...selection,
            profiles: profile,
          }
        } catch (error) {
          console.error("Error processing profile:", error)
          return {
            ...selection,
            profiles: null,
          }
        }
      }),
    )

    return selectionsWithProfiles
  } catch (error) {
    console.error("Error in getUniversitySelectionData:", error)
    return []
  }
}

export async function downloadStatementFile(statementUrl: string) {
  try {
    const supabase = getSupabaseServerClient()
    // Extract the file path from the full URL if needed
    let filePath = statementUrl
    if (statementUrl.includes("/storage/v1/object/public/statements/")) {
      filePath = statementUrl.split("/storage/v1/object/public/statements/")[1]
    } else if (statementUrl.includes("/statements/")) {
      filePath = statementUrl.split("/statements/")[1]
    }

    const { data, error } = await supabase.storage.from("statements").download(filePath)

    if (error) {
      console.error("Error downloading statement:", error)
      throw new Error("Failed to download statement file")
    }

    return data
  } catch (error) {
    console.error("Error in downloadStatementFile:", error)
    throw new Error("Failed to download statement file")
  }
}

export async function updateSelectionStatus(selectionId: string, status: "approved" | "rejected") {
  try {
    const supabase = getSupabaseServerClient()
    const { data, error } = await supabase
      .from("exchange_selections")
      .update({ status })
      .eq("id", selectionId)
      .select()
      .single()

    if (error) {
      console.error("Error updating selection status:", error)
      throw new Error("Failed to update selection status")
    }

    // Send status update email (non-blocking)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
    fetch(`${baseUrl}/api/send-email-notification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: status === "approved" ? "selection-approved" : "selection-rejected",
        selectionId: selectionId,
        selectionType: "exchange",
      }),
    }).catch((error) => {
      console.error("Failed to send status update email:", error)
    })

    revalidatePath("/manager/electives/exchange")
    return data
  } catch (error) {
    console.error("Error in updateSelectionStatus:", error)
    throw new Error("Failed to update selection status")
  }
}

export async function updateStudentSelection(
  selectionId: string,
  selectedUniversityIds: string[],
  status: "approved" | "rejected" | "pending",
) {
  try {
    const supabase = getSupabaseServerClient()
    const { data, error } = await supabase
      .from("exchange_selections")
      .update({
        selected_university_ids: selectedUniversityIds,
        status,
      })
      .eq("id", selectionId)
      .select()
      .single()

    if (error) {
      console.error("Error updating student selection:", error)
      throw new Error("Failed to update student selection")
    }

    // Send status update email if status changed to approved/rejected (non-blocking)
    if (status === "approved" || status === "rejected") {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
      fetch(`${baseUrl}/api/send-email-notification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: status === "approved" ? "selection-approved" : "selection-rejected",
          selectionId: selectionId,
          selectionType: "exchange",
        }),
      }).catch((error) => {
        console.error("Failed to send status update email:", error)
      })
    }

    revalidatePath("/manager/electives/exchange")
    return data
  } catch (error) {
    console.error("Error in updateStudentSelection:", error)
    throw new Error("Failed to update student selection")
  }
}
