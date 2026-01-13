"use client"

import { useState, useEffect } from "react"
import { useDataCache } from "@/lib/data-cache-context" // Corrected import path
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

export function useCachedManagerProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { getCachedData, setCachedData } = useDataCache()
  const { toast } = useToast()
  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    console.log(`useCachedManagerProfile: Hook triggered. userId: ${userId}`)
    if (!userId) {
      console.log("useCachedManagerProfile: No userId, returning.")
      setIsLoading(false)
      setProfile(null) // Ensure profile is null if no userId
      return
    }

    const fetchProfile = async () => {
      setIsLoading(true)
      setError(null)
      console.log(`useCachedManagerProfile: Starting fetch for userId: ${userId}`)

      // Try to get data from cache first
      const cacheKey = "managerProfile" // Explicitly define cache key
      const cachedProfile = getCachedData<any>(cacheKey, userId)

      if (cachedProfile) {
        console.log(`useCachedManagerProfile: Using cached data for ${cacheKey} with id ${userId}`)
        setProfile(cachedProfile)
        setIsLoading(false)
        return
      }

      // If not in cache, fetch from API route
      console.log(`useCachedManagerProfile: Fetching fresh data for ${cacheKey} from API for userId: ${userId}`)
      try {
        // Use the API route instead of direct database queries
        const response = await fetch('/api/manager/profile', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          const errorData = await response.json()
          console.error("useCachedManagerProfile: API error:", errorData)
          throw new Error(errorData.error || `API error: ${response.status}`)
        }

        const profileData = await response.json()

        console.log("useCachedManagerProfile: API response data:", profileData)

        // Save to cache
        setCachedData(cacheKey, userId, profileData)

        // Update state
        setProfile(profileData)
      } catch (err: any) {
        console.error("useCachedManagerProfile: Error fetching manager profile:", err)
        setError(err.message)
        toast({
          title: "Error",
          description: "Failed to load program manager profile",
          variant: "destructive",
        })
        setProfile(null) // Clear profile on error
      } finally {
        setIsLoading(false)
        console.log("useCachedManagerProfile: Fetch process finished.")
      }
    }

    fetchProfile()
  }, [userId, supabase, getCachedData, setCachedData, toast]) // Dependencies are correct

  return { profile, isLoading, error }
}
