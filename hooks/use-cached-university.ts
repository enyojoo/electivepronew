"use client"

import { useState, useEffect, useRef } from "react"
import { useDataCache } from "@/lib/data-cache-context"
import { useToast } from "@/hooks/use-toast"
import { getSupabaseBrowserClient } from "@/lib/supabase"

export function useCachedUniversity(universityId: string | undefined) {
  const [university, setUniversity] = useState<any | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { getCachedData, setCachedData } = useDataCache()
  const { toast } = useToast()
  const supabase = getSupabaseBrowserClient()
  const dataFetchedRef = useRef(false)

  useEffect(() => {
    if (!universityId) {
      return
    }

    const fetchUniversityData = async () => {
      // Check if we already fetched the data in this session
      if (dataFetchedRef.current) return

      // Try to get data from cache first
      const cacheKey = `university-${universityId}`
      const cachedData = getCachedData<any>(cacheKey, "all")

      if (cachedData) {
        console.log("Using cached university data")
        setUniversity(cachedData)
        dataFetchedRef.current = true
        return
      }

      // If not in cache, fetch from API
      setIsLoading(true)
      setError(null)

      try {
        const { data, error } = await supabase
          .from("exchange_universities")
          .select("*")
          .eq("id", universityId)
          .single()

        if (error) {
          throw error
        }

        if (data) {
          // Save to cache
          setCachedData(cacheKey, "all", data)
          setUniversity(data)
          dataFetchedRef.current = true
        }
      } catch (error: any) {
        console.error("Error fetching university:", error)
        setError(error.message)
        toast({
          title: "Error",
          description: "Failed to fetch university details",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchUniversityData()
  }, [universityId, getCachedData, setCachedData, toast, supabase])

  return { university, isLoading, error }
}
