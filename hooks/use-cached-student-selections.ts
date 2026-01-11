"use client"

import { useState, useEffect } from "react"
import { useDataCache } from "@/lib/data-cache-context"
import { createClient } from "@supabase/supabase-js"
import { useToast } from "@/hooks/use-toast"

export function useCachedStudentCourseSelections(userId: string | undefined) {
  const [selections, setSelections] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { getCachedData, setCachedData } = useDataCache()
  const { toast } = useToast()

  useEffect(() => {
    if (!userId) {
      setIsLoading(false)
      return
    }

    const fetchSelections = async () => {
      setIsLoading(true)
      setError(null)

      // Try to get data from cache first
      const cachedSelections = getCachedData<any[]>("studentCourseSelections", userId)

      if (cachedSelections) {
        console.log("Using cached student course selections")
        setSelections(cachedSelections)
        setIsLoading(false)
        return
      }

      // If not in cache, fetch from API
      console.log("Fetching student course selections from API")
      try {
        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

        const { data, error } = await supabase
          .from("course_selections")
          .select(`
            *,
            elective_course:elective_courses(*)
          `)
          .eq("student_id", userId)

        if (error) throw error

        console.log("Course selections data:", data)

        // Save to cache
        setCachedData("studentCourseSelections", userId, data || [])

        // Update state
        setSelections(data || [])
      } catch (error: any) {
        console.error("Error fetching student course selections:", error)
        setError(error.message)
        toast({
          title: "Error",
          description: "Failed to load student course selections",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchSelections()
  }, [userId, getCachedData, setCachedData, toast])

  return { selections, isLoading, error }
}

export function useCachedStudentExchangeSelections(userId: string | undefined) {
  const [selections, setSelections] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { getCachedData, setCachedData } = useDataCache()
  const { toast } = useToast()

  useEffect(() => {
    if (!userId) {
      setIsLoading(false)
      return
    }

    const fetchSelections = async () => {
      setIsLoading(true)
      setError(null)

      // Try to get data from cache first
      const cachedSelections = getCachedData<any[]>("studentExchangeSelections", userId)

      if (cachedSelections) {
        console.log("Using cached student exchange selections")
        setSelections(cachedSelections)
        setIsLoading(false)
        return
      }

      // If not in cache, fetch from API
      console.log("Fetching student exchange selections from API")
      try {
        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

        const { data, error } = await supabase
          .from("exchange_selections")
          .select(`
            *,
            elective_exchange:elective_exchange!exchange_selections_elective_exchange_id_fkey(*)
          `)
          .eq("student_id", userId)

        if (error) throw error

        console.log("Exchange selections data:", data)

        // Save to cache
        setCachedData("studentExchangeSelections", userId, data || [])

        // Update state
        setSelections(data || [])
      } catch (error: any) {
        console.error("Error fetching student exchange selections:", error)
        setError(error.message)
        toast({
          title: "Error",
          description: "Failed to load student exchange selections",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchSelections()
  }, [userId, getCachedData, setCachedData, toast])

  return { selections, isLoading, error }
}

// New hook to fetch available electives for calculating required electives
export function useCachedAvailableElectives() {
  const [electives, setElectives] = useState<{ courses: any[]; exchanges: any[] }>({ courses: [], exchanges: [] })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { getCachedData, setCachedData } = useDataCache()
  const { toast } = useToast()

  useEffect(() => {
    const fetchElectives = async () => {
      setIsLoading(true)
      setError(null)

      // Try to get data from cache first
      const cachedElectives = getCachedData<{ courses: any[]; exchanges: any[] }>("courseElectives", "all")

      if (cachedElectives) {
        console.log("Using cached available electives")
        setElectives(cachedElectives)
        setIsLoading(false)
        return
      }

      // If not in cache, fetch from API
      console.log("Fetching available electives from API")
      try {
        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

        // Fetch elective courses
        const { data: coursesData, error: coursesError } = await supabase
          .from("elective_courses")
          .select("*")
          .eq("status", "published")

        if (coursesError) throw coursesError

        // Fetch elective exchanges
        const { data: exchangesData, error: exchangesError } = await supabase
          .from("elective_exchange")
          .select("*")
          .eq("status", "published")

        if (exchangesError) throw exchangesError

        const electivesData = {
          courses: coursesData || [],
          exchanges: exchangesData || [],
        }

        console.log("Available electives data:", electivesData)

        // Save to cache
        setCachedData("courseElectives", "all", electivesData)

        // Update state
        setElectives(electivesData)
      } catch (error: any) {
        console.error("Error fetching available electives:", error)
        setError(error.message)
        toast({
          title: "Error",
          description: "Failed to load available electives",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchElectives()
  }, [getCachedData, setCachedData, toast])

  return { electives, isLoading, error }
}
