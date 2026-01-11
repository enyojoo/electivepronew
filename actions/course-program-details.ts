"use server"

import { getSupabaseServerClient } from "@/lib/supabase"
import { revalidatePath } from "next/cache"

export async function getCourseProgram(id: string) {
  try {
    const supabase = getSupabaseServerClient()
    const { data, error } = await supabase.from("elective_courses").select("*").eq("id", id).single()

    if (error) {
      console.error("Error fetching course program:", error)
      return null
    }

    return data
  } catch (error) {
    console.error("Error in getCourseProgram:", error)
    return null
  }
}

export async function getCoursesFromIds(courseIds: string[]) {
  if (!courseIds || courseIds.length === 0) {
    return []
  }

  try {
    const supabase = getSupabaseServerClient()
    // Try different approaches to get the courses
    const { data: courses, error } = await supabase.from("courses").select("*").in("id", courseIds)

    if (error) {
      console.error("Error fetching courses:", error)
      return []
    }

    return courses || []
  } catch (error) {
    console.error("Error in getCoursesFromIds:", error)
    return []
  }
}

export async function getCourseSelections(electiveCourseId: string) {
  try {
    const supabase = getSupabaseServerClient()
    const { data: selections, error } = await supabase
      .from("course_selections")
      .select(`
        *,
        profiles!course_selections_student_id_fkey(
          id,
          full_name,
          email,
          student_profiles(
            group_id,
            enrollment_year,
            groups(
              name,
              display_name,
              programs(
                name,
                name_ru
              )
            )
          )
        )
      `)
      .eq("elective_courses_id", electiveCourseId)

    if (error) {
      console.error("Error fetching course selections:", error)
      return []
    }

    return selections || []
  } catch (error) {
    console.error("Error in getCourseSelections:", error)
    return []
  }
}

export async function updateCourseSelectionStatus(selectionId: string, status: "approved" | "rejected") {
  try {
    const supabase = getSupabaseServerClient()
    const { data, error } = await supabase
      .from("course_selections")
      .update({ status })
      .eq("id", selectionId)
      .select()
      .single()

    if (error) {
      throw new Error("Failed to update course selection status")
    }

    revalidatePath("/manager/electives/course")
    return data
  } catch (error) {
    throw new Error("Failed to update course selection status")
  }
}

export async function updateStudentCourseSelection(
  selectionId: string,
  selectedCourseIds: string[],
  status: "approved" | "rejected" | "pending",
) {
  try {
    const supabase = getSupabaseServerClient()
    const { data, error } = await supabase
      .from("course_selections")
      .update({
        selected_ids: selectedCourseIds,
        status,
      })
      .eq("id", selectionId)
      .select()
      .single()

    if (error) {
      throw new Error("Failed to update student course selection")
    }

    revalidatePath("/manager/electives/course")
    return data
  } catch (error) {
    throw new Error("Failed to update student course selection")
  }
}
