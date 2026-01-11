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

      if (cachedDegrees && cachedDegrees.length > 0) {
        console.log("Using cached degrees data")
        setDegrees(cachedDegrees)
        setIsLoading(false)
        return
      }

      // If not in cache, fetch from API
      console.log("Fetching degrees data from API")
      try {
        const { data, error } = await supabase.from("degrees").select("*")

        if (error) throw error

        // Save to cache
        setCachedData("degrees", "all", data || [])

        // Update state
        setDegrees(data || [])
      } catch (error: any) {
        console.error("Error fetching degrees:", error)
        setError(error.message)
        toast({
          title: "Error",
          description: "Failed to load degrees data",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchDegrees()
  }, [getCachedData, setCachedData, toast])

  return { degrees, isLoading, error }
}
