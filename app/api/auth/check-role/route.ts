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
    let { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single()

    // If profile doesn't exist, create it with admin role (for initial setup)
    if (profileError && profileError.code === "PGRST116") {
      console.log("Profile not found, creating default admin profile for user:", userId)
      
      // Create profile with admin role
      const { data: newProfile, error: createError } = await supabaseAdmin
        .from("profiles")
        .insert({
          id: userId,
          email: user.email || "",
          full_name: user.user_metadata?.full_name || "Admin User",
          role: "admin", // Default to admin for initial setup
          is_active: true,
        })
        .select("role")
        .single()

      if (createError) {
        console.error("Error creating profile:", createError)
        return NextResponse.json({ error: "Error creating user profile" }, { status: 500 })
      }

      profile = newProfile
    } else if (profileError) {
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
