"use client"

import { useState, useEffect, useRef } from "react"
import { useDataCache } from "@/lib/data-cache-context"
import { getSupabaseBrowserClient } from "@/lib/supabase"

export function useCachedCountries() {
  const [countries, setCountries] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { getCachedData, setCachedData } = useDataCache()
  const supabase = getSupabaseBrowserClient()
  const dataFetchedRef = useRef(false)

  useEffect(() => {
    const fetchCountries = async () => {
      // Check if we already fetched the data in this session
      if (dataFetchedRef.current) return

      // Try to get data from cache first
      const cacheKey = "countries"
      const cachedData = getCachedData<any[]>(cacheKey, "global")

      if (cachedData) {
        console.log("Using cached countries data")
        setCountries(cachedData)
        dataFetchedRef.current = true
        return
      }

      // If not in cache, fetch from API
      setIsLoading(true)

      try {
        const { data, error } = await supabase.from("countries").select("*")

        if (error) {
          throw error
        }

        if (data) {
          // Save to cache
          setCachedData(cacheKey, "global", data)
          setCountries(data)
          dataFetchedRef.current = true
        }
      } catch (error) {
        console.error("Error fetching countries:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCountries()
  }, [getCachedData, setCachedData, supabase])

  return { countries, isLoading }
}
