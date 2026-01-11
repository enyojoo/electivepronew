"use server"

import { createClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers" // To get the Supabase client configured for the user

// Helper to get a server-side Supabase client
// This assumes you have a way to initialize Supabase client on the server,
// possibly using cookies for auth. Adjust as per your Supabase setup.
const createSupabaseServerClient = () => {
  const cookieStore = cookies()
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // Use service role for direct DB modification if RLS is restrictive
    // Or, configure client to use user's session from cookies
    {
      global: {
        headers: {
          // If you're using user's session:
          // Authorization: `Bearer ${cookieStore.get('supabase-auth-token')?.value}`,
        },
      },
    },
  )
}

export async function cancelCourseSelection(formData: FormData) {
  const studentId = formData.get("studentId") as string
  const electiveCoursesId = formData.get("electiveCoursesId") as string

  if (!studentId || !electiveCoursesId) {
    return { success: false, error: "Missing student ID or elective course ID." }
  }

  const supabase = createSupabaseServerClient() // Or your specific server client creation logic

  try {
    // Option 1: Delete the record entirely
    const { error: deleteError } = await supabase
      .from("course_selections")
      .delete()
      .eq("student_id", studentId)
      .eq("elective_courses_id", electiveCoursesId)

    if (deleteError) {
      console.error("Error deleting course selection:", deleteError)
      throw deleteError
    }

    // Option 2: Or, mark as 'cancelled' if you want to keep a record
    /*
    const { error: updateError } = await supabase
      .from("course_selections")
      .update({ status: "cancelled", selected_ids: [] }) // Assuming 'cancelled' is a valid status
      .eq("student_id", studentId)
      .eq("elective_courses_id", electiveCoursesId);

    if (updateError) {
      console.error("Error cancelling course selection:", updateError);
      throw updateError;
    }
    */

    // Revalidate the path to update the UI
    revalidatePath(`/student/courses/${electiveCoursesId}`)
    revalidatePath("/student/courses")

    return { success: true, message: "Course selection has been cancelled." }
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to cancel course selection." }
  }
}
