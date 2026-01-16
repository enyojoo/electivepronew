"use server"

import { createServerComponentClient } from "@/lib/supabase"

export async function getCountries() {
  const supabase = await createServerComponentClient()

  const { data, error } = await supabase
    .from("universities")
    .select("country")
    .not("country", "is", null)

  if (error) {
    console.error("Error fetching countries:", error)
    throw new Error("Failed to fetch countries")
  }

  // Get unique countries
  const uniqueCountries = [...new Set(data.map(item => item.country))]

  // Return countries in the expected format
  return uniqueCountries.map(country => ({
    code: country.toLowerCase().replace(/\s+/g, '-'),
    name: country,
    name_ru: country // For now, just use the same name
  }))
}