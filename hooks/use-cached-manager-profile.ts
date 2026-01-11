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

      // If not in cache, fetch from API
      console.log(`useCachedManagerProfile: Fetching fresh data for ${cacheKey} from API for userId: ${userId}`)
      try {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*, degrees:degree_id(id, name), academic_year") // Select academic_year directly
          .eq("id", userId)
          .eq("role", "program_manager") // Use correct role "program_manager"
          .single()

        if (profileError) {
          console.error("useCachedManagerProfile: Supabase error:", profileError)
          throw profileError
        }

        if (!profileData) {
          console.warn(`useCachedManagerProfile: No program_manager profile found for userId: ${userId}`)
          setProfile(null)
        } else {
          console.log("useCachedManagerProfile: Fetched profile data:", profileData)
          setProfile(profileData)
          // Save to cache
          setCachedData(cacheKey, userId, profileData)
        }
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
