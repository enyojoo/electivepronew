"use client"

import { useState, useEffect } from "react"
import { useDataCache } from "@/lib/data-cache-context"
import { useToast } from "@/hooks/use-toast"

// This is a template for creating cached data hooks
// Replace T with the actual data type
// Replace "dataType" with the actual cache key
// Replace fetchData with the actual fetch function

export function useCachedDataPattern<T>(id: string | undefined) {
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { getCachedData, setCachedData } = useDataCache()
  const { toast } = useToast()

  useEffect(() => {
    if (!id) {
      setIsLoading(false)
      return
    }

    const fetchDataAndCache = async () => {
      setError(null)

      // Try to get data from cache first
      const cachedData = getCachedData<T>("dataType", id)

      if (cachedData) {
        console.log("Using cached data")
        setData(cachedData)
        setIsLoading(false)
        return
      }

      // If not in cache, set loading to true and fetch from API
      setIsLoading(true)
      console.log("Fetching data from API")

      try {
        // Replace this with actual fetch logic
        const fetchedData = await fetchData(id)

        // Save to cache
        setCachedData("dataType", id, fetchedData)

        // Update state
        setData(fetchedData)
      } catch (error: any) {
        console.error("Error fetching data:", error)
        setError(error.message)
        toast({
          title: "Error",
          description: "Failed to load data",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchDataAndCache()
  }, [id, getCachedData, setCachedData, toast])

  return { data, isLoading, error }
}

// Example fetch function - replace with actual implementation
async function fetchData(id: string): Promise<any> {
  const response = await fetch(`/api/data/${id}`)
  if (!response.ok) {
    throw new Error("Failed to fetch data")
  }
  return response.json()
}
