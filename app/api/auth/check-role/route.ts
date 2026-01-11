import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Extract the token
    const token = authHeader.split(" ")[1]

    // Verify the token and get the user
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    // Get the request body
    const { userId } = await request.json()

    // Verify that the token user matches the requested user
    if (user.id !== userId) {
      return NextResponse.json({ error: "User ID mismatch" }, { status: 403 })
    }

    // Get the user's profile using the admin client to bypass RLS
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single()

    if (profileError) {
      console.error("Profile fetch error:", profileError)
      return NextResponse.json({ error: "Error fetching user profile" }, { status: 500 })
    }

    return NextResponse.json({
      role: profile.role,
    })
  } catch (error) {
    console.error("Error in check-role API:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
