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

        // Map courses (degree information removed as programs table is being removed)
        const coursesWithDegrees = (coursesData || []).map((course: any) => ({
          ...course,
          degree: null,
        }))

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
