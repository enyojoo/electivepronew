import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin, createServerComponentClient } from "@/lib/supabase"

interface UserImportData {
  email: string
  name: string
  role: string
  degreeId?: string | null
  groupId?: string | null
  year?: string | null
}

interface ImportResult {
  successful: number
  failed: number
  errors: Array<{
    email: string
    name: string
    error: string
  }>
  successfulUsers: Array<{
    email: string
    name: string
    userId: string
    tempPassword: string
  }>
}

export async function POST(request: NextRequest) {
  try {
    // Verify the current user is an admin
    const supabase = await createServerComponentClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 })
    }

    console.log("Starting bulk user import process...")

    const { users }: { users: UserImportData[] } = await request.json()

    // Validate inputs
    if (!users || !Array.isArray(users) || users.length === 0) {
      return NextResponse.json({ error: "Users array is required" }, { status: 400 })
    }


    const result: ImportResult = {
      successful: 0,
      failed: 0,
      errors: [],
      successfulUsers: [],
    }

    // Process users one by one (not in transaction for better error isolation)
    for (const userData of users) {
      try {
        const { email, name, role, degreeId, groupId, year } = userData

        // Validate individual user data
        if (!email || !name || !role) {
          result.errors.push({
            email: email || "unknown",
            name: name || "unknown",
            error: "Email, name, and role are required",
          })
          result.failed++
          continue
        }

        // Validate role
        if (!["admin", "program_manager", "student"].includes(role)) {
          result.errors.push({
            email,
            name,
            error: "Invalid role",
          })
          result.failed++
          continue
        }

        // Check if user already exists
        const { data: existingUser } = await supabaseAdmin.auth.admin.getUserByEmail(email)
        if (existingUser.user) {
          result.errors.push({
            email,
            name,
            error: "User already exists",
          })
          result.failed++
          continue
        }

        // Generate a temporary password
        const tempPassword = Math.random().toString(36).slice(-12) + "A1!"

        // Create auth user
        console.log(`Creating auth user for ${email}`)
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
          result.errors.push({
            email,
            name,
            error: "Failed to create user account",
          })
          result.failed++
          continue
        }

        console.log(`Auth user created successfully with ID: ${authData.user.id}`)

        // Create profile
        const profileData: any = {
          id: authData.user.id,
          full_name: name,
          email: email,
          role: role,
          is_active: true,
        }

        console.log(`Creating profile for user ${authData.user.id}:`, profileData)
        const { data: profileInsertData, error: profileError } = await supabaseAdmin
          .from("profiles")
          .insert(profileData)
          .select()

        if (profileError) {
          console.error("Profile creation error:", profileError)
          // Try to clean up the auth user if profile creation fails
          await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
          result.errors.push({
            email,
            name,
            error: `Failed to create user profile: ${profileError.message}`,
          })
          result.failed++
          continue
        }

        console.log(`Profile created successfully:`, profileInsertData)

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
          // Get degree_id from group
          const { data: groupData } = await supabaseAdmin
            .from("groups")
            .select("degree_id")
            .eq("id", groupId)
            .single()

          if (groupData?.degree_id) {
            const { error: managerError } = await supabaseAdmin.from("manager_profiles").insert({
              profile_id: authData.user.id,
              degree_id: groupData.degree_id,
            })
            if (managerError) {
              console.error("Error creating manager profile:", managerError)
              // Non-fatal, continue
            }
          }
        }

        // Add to successful users
        result.successfulUsers.push({
          email,
          name,
          userId: authData.user.id,
          tempPassword,
        })
        result.successful++

        // Send user invitation email (non-blocking)
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
        fetch(`${baseUrl}/api/send-email-notification`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "user-invitation",
            email: email,
            name: name,
            role: role,
            tempPassword: tempPassword,
          }),
        }).catch((error) => {
          console.error("Failed to send user invitation email:", error)
        })

      } catch (error) {
        console.error("Error processing user:", userData, error)
        result.errors.push({
          email: userData.email,
          name: userData.name,
          error: "Unexpected error occurred",
        })
        result.failed++
      }
    }

    return NextResponse.json({
      successful: result.successful,
      failed: result.failed,
      errors: result.errors,
      successfulUsers: result.successfulUsers,
    })
  } catch (error) {
    console.error("Error in import-users API:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}