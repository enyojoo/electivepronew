"use server"

import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export interface Semester {
  id: string
  name: string
  name_ru: string
  code: string
}

export async function getSemesters() {
  const supabase = createServerComponentClient({ cookies })

  const { data, error } = await supabase.from("semesters").select("id, name, name_ru, code").order("name")

  if (error) {
    console.error("Error fetching semesters:", error)
    throw new Error("Failed to fetch semesters")
  }

  return data as Semester[]
}
