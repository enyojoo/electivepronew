"use client"

import { useState, useEffect } from "react"
import { useDataCache } from "@/lib/data-cache-context"
import { useToast } from "@/hooks/use-toast"

export function useCachedAdminProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { getCachedData, setCachedData } = useDataCache()
  const { toast } = useToast()

  useEffect(() => {
    if (!userId) {
      setIsLoading(false)
      return
    }

    const fetchProfile = async () => {
      setIsLoading(true)
      setError(null)

      // Try to get data from cache first
      const cachedProfile = getCachedData<any>("adminProfile", userId)

      if (cachedProfile) {
        console.log("Using cached admin profile")
        setProfile(cachedProfile)
        setIsLoading(false)
        return
      }

      // If not in cache, fetch from API
      console.log("Fetching admin profile from API")
      try {
        // Fetch profile using API endpoint to bypass RLS
        const response = await fetch(`/api/admin/profile?userId=${userId}`)

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || "Failed to fetch admin profile")
        }

        const profileData = await response.json()

        // Save to cache
        setCachedData("adminProfile", userId, profileData)

        // Update state
        setProfile(profileData)
      } catch (error: any) {
        console.error("Error fetching admin profile:", error)
        setError(error.message)
        toast({
          title: "Error",
          description: "Failed to load admin profile",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfile()
  }, [userId, getCachedData, setCachedData, toast])

  return { profile, isLoading, error }
}
