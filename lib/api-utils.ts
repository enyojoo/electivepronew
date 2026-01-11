import { type NextRequest, NextResponse } from "next/server"
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export async function getUserFromRequest(req: NextRequest) {
  try {
    const supabaseServerClient = createServerComponentClient({ cookies })
    const {
      data: { session },
      error: sessionError,
    } = await supabaseServerClient.auth.getSession()

    if (sessionError) {
      console.error("Error getting session:", sessionError.message)
      return null
    }

    if (!session?.user) {
      return null
    }

    const { data: profile, error: profileError } = await supabaseServerClient
      .from("profiles")
      .select("id, role")
      .eq("id", session.user.id)
      .single()

    if (profileError) {
      console.error(`Error fetching profile for user ${session.user.id}:`, profileError.message)
      return null
    }

    return { user: session.user, profile }
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
