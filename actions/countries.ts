"use server"

import { createServerComponentClient } from "@/lib/supabase"

export async function getCountries() {
  const supabase = await createServerComponentClient()

  const { data, error } = await supabase.from("countries").select("code, name, name_ru").order("name")

  if (error) {
    console.error("Error fetching countries:", error)
    throw new Error("Failed to fetch countries")
  }

  return data
}
