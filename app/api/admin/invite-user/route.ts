import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin, createServerComponentClient } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    // Verify the current user is an admin
    const supabase = await createServerComponentClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single()

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 })
    }

    const { email, name, role, degreeId, groupId, year } = await request.json()

    // Validate inputs
    if (!email || !name || !role) {
      return NextResponse.json({ error: "Email, name, and role are required" }, { status: 400 })
    }

    // Validate role
    if (!["admin", "program_manager", "student"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    }

    // Generate a temporary password
    const tempPassword = Math.random().toString(36).slice(-12) + "A1!"

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: name,
      },
    })

    if (authError) {
      console.error("Auth creation error:", authError)
      return NextResponse.json({ error: "Failed to create user account" }, { status: 500 })
    }

    // Create profile
    const profileData: any = {
      id: authData.user.id,
      full_name: name,
      email: email,
      role: role,
      is_active: true,
    }

    // Add role-specific fields
    if (role === "student" || role === "program_manager") {
      profileData.degree_id = degreeId || null
      profileData.academic_year = year || null
      profileData.group_id = groupId || null
    }

    const { error: profileError } = await supabaseAdmin.from("profiles").insert(profileData)

    if (profileError) {
      console.error("Profile creation error:", profileError)
      // Try to clean up the auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ error: "Failed to create user profile" }, { status: 500 })
    }

    // Create student or manager profile if needed
    if (role === "student" && groupId) {
      const { error: studentError } = await supabaseAdmin.from("student_profiles").insert({
        profile_id: authData.user.id,
        group_id: groupId,
        enrollment_year: year || null,
      })
      if (studentError) {
        console.error("Error creating student profile:", studentError)
        // Non-fatal, continue
      }
    }

    if (role === "program_manager" && groupId) {
      // Get program_id from group
      const { data: groupData } = await supabaseAdmin
        .from("groups")
        .select("program_id")
        .eq("id", groupId)
        .single()

      if (groupData?.program_id) {
        const { error: managerError } = await supabaseAdmin.from("manager_profiles").insert({
          profile_id: authData.user.id,
          program_id: groupData.program_id,
        })
        if (managerError) {
          console.error("Error creating manager profile:", managerError)
          // Non-fatal, continue
        }
      }
    }

    return NextResponse.json({
      success: true,
      userId: authData.user.id,
      tempPassword: tempPassword,
    })
  } catch (error) {
    console.error("Error in invite-user API:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
