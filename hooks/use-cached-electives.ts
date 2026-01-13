"use client"

import { useState, useEffect } from "react"
import { useDataCache } from "@/lib/data-cache-context"
import { createClient } from "@supabase/supabase-js"
import { useToast } from "@/hooks/use-toast"

// Update the function to fetch from elective_courses table
export function useCachedElectives() {
  const [electives, setElectives] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { getCachedData, setCachedData } = useDataCache()
  const { toast } = useToast()

  useEffect(() => {
    const fetchElectives = async () => {
      setIsLoading(true)
      setError(null)

      // Try to get data from cache first
      const cacheKey = "courseElectives"
      const cachedElectives = getCachedData<any[]>(cacheKey, "all")

      if (cachedElectives) {
        console.log(`useCachedElectives: Using cached data for ${cacheKey}`)
        setElectives(cachedElectives)
        setIsLoading(false)
        return
      }

      // If not in cache, fetch from API
      console.log(`useCachedElectives: Fetching fresh data for ${cacheKey} from API`)
      try {
        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

        // Update to fetch from elective_courses table
        const { data, error: dbError } = await supabase
          .from("elective_courses")
          .select("*")

        if (dbError) {
          console.error("useCachedElectives: Supabase error:", dbError)
          throw dbError
        }

        // Add course_count based on courses array
        const formattedData = (data || []).map((item) => ({
          ...item,
          course_count: item.courses && Array.isArray(item.courses) ? item.courses.length : 0,
        }))

        // Save to cache
        setCachedData(cacheKey, "all", formattedData)

        // Update state
        setElectives(formattedData)
      } catch (err: any) {
        console.error("useCachedElectives: Error fetching course electives:", err)
        setError(err.message)
        toast({
          title: "Error",
          description: "Failed to load course electives data",
          variant: "destructive",
        })
        setElectives([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchElectives()
  }, [getCachedData, setCachedData, toast])

  return { electives, isLoading, error }
}
