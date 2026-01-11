"use server"

import { getSupabaseServerClient } from "@/lib/supabase"
import { revalidatePath } from "next/cache"

export async function cancelExchangeSelection(formData: FormData) {
  try {
    const studentId = formData.get("studentId") as string
    const electiveExchangeId = formData.get("electiveExchangeId") as string

    if (!studentId || !electiveExchangeId) {
      return {
        success: false,
        error: "Missing required information",
      }
    }

    const supabase = getSupabaseServerClient()

    // Delete the exchange selection
    const { error } = await supabase
      .from("exchange_selections")
      .delete()
      .eq("student_id", studentId)
      .eq("elective_exchange_id", electiveExchangeId)

    if (error) {
      console.error("Error cancelling exchange selection:", error)
      return {
        success: false,
        error: error.message,
      }
    }

    // Revalidate the exchange pages to reflect the changes
    revalidatePath("/student/exchange")
    revalidatePath(`/student/exchange/${electiveExchangeId}`)

    return {
      success: true,
      message: "Exchange selection cancelled successfully",
    }
  } catch (error: any) {
    console.error("Error in cancelExchangeSelection:", error)
    return {
      success: false,
      error: error.message || "An unexpected error occurred",
    }
  }
}
