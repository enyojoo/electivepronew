"use client"

import { useState, useEffect } from "react"
import { useDataCache } from "@/lib/data-cache-context"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

export function useCachedCourses() {
  const [courses, setCourses] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { getCachedData, setCachedData } = useDataCache()
  const { toast } = useToast()

  useEffect(() => {
    const fetchCourses = async () => {
      setIsLoading(true)
      setError(null)

      // Try to get data from cache first
      const cachedCourses = getCachedData<any[]>("courses", "all")

      if (cachedCourses) {
        console.log("Using cached courses data")
        setCourses(cachedCourses)
        setIsLoading(false)
        return
      }

      // If not in cache, fetch from API
      console.log("Fetching courses data from API")
      try {
        const supabase = getSupabaseBrowserClient()

        // Fetch courses without degree relationship (courses table doesn't have degree_id)
        const { data: coursesData, error: coursesError } = await supabase
          .from("courses")
          .select("*")

        if (coursesError) throw coursesError

        // Fetch degrees through elective_packs -> programs -> degrees relationship
        const electivePackIds = [...new Set((coursesData || []).map((c: any) => c.elective_pack_id).filter(Boolean))]
        
        let electivePacksData: any[] = []
        if (electivePackIds.length > 0) {
          const { data: packsData } = await supabase
            .from("elective_packs")
            .select("id, program_electives(program_id, programs(degree_id, degrees(id, name, name_ru, code)))")
            .in("id", electivePackIds)
          
          electivePacksData = packsData || []
        }

        // Create a map of elective_pack_id to degree
        const packToDegreeMap = new Map()
        if (electivePacksData) {
          electivePacksData.forEach((pack: any) => {
            if (pack.program_electives && Array.isArray(pack.program_electives) && pack.program_electives.length > 0) {
              const programElective = pack.program_electives[0]
              if (programElective.programs) {
                const program = Array.isArray(programElective.programs) ? programElective.programs[0] : programElective.programs
                if (program.degrees) {
                  const degree = Array.isArray(program.degrees) ? program.degrees[0] : program.degrees
                  packToDegreeMap.set(pack.id, degree)
                }
              }
            }
          })
        }

        // Map courses with degree information
        const coursesWithDegrees = (coursesData || []).map((course: any) => {
          const degree = course.elective_pack_id ? packToDegreeMap.get(course.elective_pack_id) : null
          
          return {
            ...course,
            degree: degree ? {
              id: degree.id,
              name: degree.name || "",
              name_ru: degree.name_ru || "",
              code: degree.code || "",
            } : null,
          }
        })

        // Save to cache
        setCachedData("courses", "all", coursesWithDegrees)

        // Update state
        setCourses(coursesWithDegrees)
      } catch (error: any) {
        console.error("Error fetching courses:", error)
        setError(error.message)
        toast({
          title: "Error",
          description: "Failed to load courses data",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchCourses()
  }, [getCachedData, setCachedData, toast])

  return { courses, isLoading, error }
}
