import { type NextRequest, NextResponse } from "next/server"
import { createServerComponentClient } from "@/lib/supabase"

export async function getUserFromRequest(req: NextRequest) {
  try {
    const supabaseServerClient = await createServerComponentClient()
    const {
      data: { user },
      error: userError,
    } = await supabaseServerClient.auth.getUser()

    if (userError) {
      console.error("Error getting user:", userError.message)
      return null
    }

    if (!user) {
      return null
    }

    const { data: profile, error: profileError } = await supabaseServerClient
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .single()

    if (profileError) {
      console.error(`Error fetching profile for user ${user.id}:`, profileError.message)
      return null
    }

    return { user, profile }
  } catch (error) {
    console.error("Unexpected error in getUserFromRequest:", error)
    return null
  }
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}

export function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}

export function badRequest(message = "Bad request") {
  return NextResponse.json({ error: message }, { status: 400 })
}

export function serverError(message = "Internal server error") {
  return NextResponse.json({ error: message }, { status: 500 })
}
