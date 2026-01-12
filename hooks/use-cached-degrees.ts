"use client"

import { useState, useEffect } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

// Cache key and expiry (matching groups page pattern)
const DEGREES_CACHE_KEY = "admin_degrees_cache"
const CACHE_EXPIRY = 60 * 60 * 1000 // 1 hour

export function useCachedDegrees() {
  const [degrees, setDegrees] = useState<any[]>(() => {
    // Load cached data synchronously on initial render (like groups page)
    if (typeof window === "undefined") return []
    
    try {
      const cached = localStorage.getItem(DEGREES_CACHE_KEY)
      if (cached) {
        const { data, timestamp } = JSON.parse(cached)
        if (Date.now() - timestamp < CACHE_EXPIRY) {
          return data || []
        }
      }
    } catch (error) {
      console.error("Error loading cached degrees:", error)
    }
    return []
  })
  
  const [isLoading, setIsLoading] = useState(() => {
    // Only set loading if we don't have valid cache
    if (typeof window === "undefined") return true
    
    try {
      const cached = localStorage.getItem(DEGREES_CACHE_KEY)
      if (cached) {
        const { timestamp } = JSON.parse(cached)
        if (Date.now() - timestamp < CACHE_EXPIRY) {
          return false // Cache exists and is valid, no need to show loading
        }
      }
    } catch {
      // Ignore errors
    }
    return true
  })
  
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  // Fetch degrees from Supabase (only if loading)
  useEffect(() => {
    const fetchDegrees = async () => {
      if (!isLoading) {
        return // Already have data from cache
      }

      try {
        const supabase = getSupabaseBrowserClient()
        // Fetch all degrees - explicitly select all required fields
        const { data, error, count } = await supabase
          .from("degrees")
          .select("id, name, name_ru, code, status, created_at, updated_at", { count: "exact" })
          .order("name", { ascending: true })

        if (error) throw error

        const degreesData = data || []
        console.log(`[Degrees Hook] Fetched ${degreesData.length} degrees (total in DB: ${count})`)
        if (degreesData.length > 0) {
          console.log(`[Degrees Hook] Sample degree data:`, degreesData[0])
          console.log(`[Degrees Hook] Degree has code:`, degreesData[0]?.code)
          console.log(`[Degrees Hook] Degree has status:`, degreesData[0]?.status)
        }

        // Cache the degrees data
        localStorage.setItem(
          DEGREES_CACHE_KEY,
          JSON.stringify({
            data: degreesData,
            timestamp: Date.now(),
          }),
        )

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
  }, [isLoading, toast])

  // Watch for cache invalidation and trigger refetch
  useEffect(() => {
    const checkCache = () => {
      const cached = localStorage.getItem(DEGREES_CACHE_KEY)
      if (!cached && !isLoading && degrees.length > 0) {
        // Cache was removed, trigger refetch
        setIsLoading(true)
      }
    }

    // Check immediately
    checkCache()
    
    // Set up interval to check for cache removal (for same-tab invalidation)
    const interval = setInterval(checkCache, 500)
    
    // Also listen for storage events (for cross-tab invalidation)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === DEGREES_CACHE_KEY && e.newValue === null) {
        checkCache()
      }
    }
    
    window.addEventListener("storage", handleStorageChange)

    return () => {
      clearInterval(interval)
      window.removeEventListener("storage", handleStorageChange)
    }
  }, [degrees.length, isLoading])

  // Set up real-time subscriptions for instant updates
  useEffect(() => {
    const supabase = getSupabaseBrowserClient()

    const channel = supabase
      .channel("degrees-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "degrees" },
        async () => {
          // Invalidate cache
          localStorage.removeItem(DEGREES_CACHE_KEY)
          setIsLoading(true)

          try {
            // Fetch all degrees - explicitly select all required fields
            const { data, error, count } = await supabase
              .from("degrees")
              .select("id, name, name_ru, code, status, created_at, updated_at", { count: "exact" })
              .order("name", { ascending: true })

            if (error) throw error

            const degreesData = data || []
            console.log(`[Degrees Hook] Real-time refetch: ${degreesData.length} degrees (total in DB: ${count})`)
            
            // Update cache
            localStorage.setItem(
              DEGREES_CACHE_KEY,
              JSON.stringify({
                data: degreesData,
                timestamp: Date.now(),
              }),
            )
            
            setDegrees(degreesData)
          } catch (error: any) {
            console.error("Error refetching degrees after real-time update:", error)
            toast({
              title: "Error",
              description: "Failed to load degrees data",
              variant: "destructive",
            })
          } finally {
            setIsLoading(false)
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [toast])

  return { degrees, isLoading, error }
}
