"use server"

import { getSupabaseServerClient } from "@/lib/supabase"

export interface Year {
  id: string
  year: string
  is_current: boolean
  created_at: string
  updated_at: string
}

export async function getYears(): Promise<Year[]> {
  const supabase = getSupabaseServerClient()

  try {
    console.log("Fetching years from database...")

    const { data, error } = await supabase.from("academic_years").select("*").order("year", { ascending: true })

    if (error) {
      console.error("Error fetching years:", error)
      throw new Error(`Failed to fetch years: ${error.message}`)
    }

    console.log(`Successfully fetched ${data?.length || 0} years`)
    return data || []
  } catch (error) {
    console.error("Error in getYears:", error)
    return []
  }
}