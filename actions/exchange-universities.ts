"use server"

import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import type { ExchangeUniversity, ExchangeUniversityFormData } from "@/types/exchange-university"
import { revalidatePath } from "next/cache"

export async function getExchangeUniversities(electivePackId?: string) {
  const supabase = createServerComponentClient({ cookies })

  let query = supabase
    .from("exchange_universities")
    .select("*, countries(name, name_ru)")
    .eq("status", "active")
    .order("name")

  if (electivePackId) {
    query = query.eq("elective_pack_id", electivePackId)
  }

  const { data, error } = await query

  if (error) {
    console.error("Error fetching exchange universities:", error)
    throw new Error("Failed to fetch exchange universities")
  }

  return data as ExchangeUniversity[]
}

export async function getExchangeUniversity(id: string) {
  const supabase = createServerComponentClient({ cookies })

  const { data, error } = await supabase
    .from("exchange_universities")
    .select("*, countries(name, name_ru)")
    .eq("id", id)
    .single()

  if (error) {
    console.error("Error fetching exchange university:", error)
    throw new Error("Failed to fetch exchange university")
  }

  return data as ExchangeUniversity
}

export async function createExchangeUniversity(formData: ExchangeUniversityFormData) {
  const supabase = createServerComponentClient({ cookies })

  const { data, error } = await supabase.from("exchange_universities").insert(formData).select().single()

  if (error) {
    console.error("Error creating exchange university:", error)
    throw new Error("Failed to create exchange university")
  }

  revalidatePath("/admin/electives/exchange")
  return data as ExchangeUniversity
}

export async function updateExchangeUniversity(id: string, formData: Partial<ExchangeUniversityFormData>) {
  const supabase = createServerComponentClient({ cookies })

  const { data, error } = await supabase
    .from("exchange_universities")
    .update({
      ...formData,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error("Error updating exchange university:", error)
    throw new Error("Failed to update exchange university")
  }

  revalidatePath("/admin/electives/exchange")
  revalidatePath(`/admin/electives/exchange/${id}`)
  return data as ExchangeUniversity
}

export async function deleteExchangeUniversity(id: string) {
  const supabase = createServerComponentClient({ cookies })

  // Instead of actually deleting, we'll set the status to inactive
  const { error } = await supabase
    .from("exchange_universities")
    .update({
      status: "inactive",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (error) {
    console.error("Error deleting exchange university:", error)
    throw new Error("Failed to delete exchange university")
  }

  revalidatePath("/admin/electives/exchange")
  return true
}
