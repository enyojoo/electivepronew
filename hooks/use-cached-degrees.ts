"use client"

import { useState, useEffect } from "react"
import { useDataCache } from "@/lib/data-cache-context"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

export function useCachedDegrees() {
  const [degrees, setDegrees] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { getCachedData, setCachedData } = useDataCache()
  const { toast } = useToast()

  useEffect(() => {
    const fetchDegrees = async () => {
      setIsLoading(true)
      setError(null)

      // Try to get data from cache first
      const cachedDegrees = getCachedData<any[]>("degrees", "all")

      // If cached data exists (even if empty array), use it
      if (cachedDegrees !== null && cachedDegrees !== undefined) {
        console.log("Using cached degrees data")
        setDegrees(cachedDegrees)
        setIsLoading(false)
        return
      }

      // If not in cache, fetch from API
      console.log("Fetching degrees data from API")
      try {
        const { data, error } = await supabase.from("degrees").select("*").order("name")

        if (error) throw error

        const degreesData = data || []

        // Save to cache (even if empty array)
        setCachedData("degrees", "all", degreesData)

        // Update state
        setDegrees(degreesData)
      } catch (error: any) {
        console.error("Error fetching degrees:", error)
        setError(error.message)
        toast({
          title: "Error",
          description: "Failed to load degrees data",
          variant: "destructive",
        })
        // Set empty array on error so loading stops
        setDegrees([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchDegrees()
  }, [getCachedData, setCachedData, toast])

  return { degrees, isLoading, error }
}
