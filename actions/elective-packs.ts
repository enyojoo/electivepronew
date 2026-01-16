"use server"

import { createServerComponentClient } from "@/lib/supabase"

export async function getElectivePacks() {
  const supabase = await createServerComponentClient()

  const { data, error } = await supabase
    .from("elective_exchange")
    .select("id, name")
    .eq("status", "published")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching elective packs:", error)
    throw new Error("Failed to fetch elective packs")
  }

  // Map elective_exchange fields to expected format
  return data.map(item => ({
    id: item.id,
    title: item.name // Use name as title
  }))
}

export async function getElectivePack(id: string) {
  const supabase = await createServerComponentClient()

  const { data, error } = await supabase
    .from("elective_exchange")
    .select("id, name, max_selections")
    .eq("id", id)
    .single()

  if (error) {
    console.error("Error fetching elective pack:", error)
    throw new Error("Failed to fetch elective pack")
  }

  // Map elective_exchange fields to expected format
  return {
    id: data.id,
    title: data.name, // Use name as title
    max_selections: data.max_selections
  }
}