"use server"

import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export async function getCountries() {
  const supabase = createServerComponentClient({ cookies })

  const { data, error } = await supabase.from("countries").select("code, name, name_ru").order("name")

  if (error) {
    console.error("Error fetching countries:", error)
    throw new Error("Failed to fetch countries")
  }

  return data
}
