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
    console.log(`useCachedManagerProfile: Supabase client URL:`, supabase.supabaseUrl)
    console.log(`useCachedManagerProfile: Supabase client key exists:`, !!supabase.supabaseKey)
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
        // First, fetch the basic profile from profiles table
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .eq("role", "program_manager")
          .single()

        if (profileError) {
          console.error("useCachedManagerProfile: Profile fetch error:", profileError)
          throw profileError
        }

        if (!profileData) {
          console.warn(`useCachedManagerProfile: No program_manager profile found for userId: ${userId}`)
          setProfile(null)
          return
        }

        // Verify this is actually a program manager profile
        if (profileData.role !== "program_manager") {
          console.error(`useCachedManagerProfile: Expected program_manager role, but got: ${profileData.role}`)
          throw new Error(`Expected program_manager role, but got: ${profileData.role}`)
        }

        // Fetch manager profile with relationships (query from manager_profiles to get degree and academic year)
        const { data: managerProfileData, error: managerProfileError } = await supabase
          .from("manager_profiles")
          .select(`
            degree_id,
            academic_year_id,
            degrees(id, name, name_ru),
            academic_years(id, name, start_year, end_year)
          `)
          .eq("profile_id", userId)
          .maybeSingle()

        if (managerProfileError) {
          console.error("useCachedManagerProfile: Manager profile fetch error:", managerProfileError)
          // Don't throw error if it's just that no manager profile exists yet
          // Instead, create profile with null manager data
          console.log("useCachedManagerProfile: No manager profile found, using fallback data")

          const processedProfile = {
            ...profileData,
            // Use fallback values when no manager profile exists
            degrees: { id: null, name: "Not assigned", name_ru: null },
            degree: { id: null, name: "Not assigned", name_ru: null },
            academic_year: "Not assigned",
            academic_year_id: null,
          }

          console.log("useCachedManagerProfile: Processed manager profile data (fallback):", processedProfile)

          // Save to cache
          setCachedData(cacheKey, userId, processedProfile)

          // Update state
          setProfile(processedProfile)
          return
        }

        console.log("useCachedManagerProfile: Raw manager profile data:", managerProfileData)

        // Extract data from relationships
        const degree = managerProfileData?.degrees
        const academicYear = managerProfileData?.academic_years

        // Combine profile and manager profile data
        const processedProfile = {
          ...profileData,
          // Use the proper relationship data
          degrees: degree || { id: null, name: "Not specified", name_ru: null },
          degree: degree || { id: null, name: "Not specified", name_ru: null },
          academic_year: academicYear ? `${academicYear.start_year}-${academicYear.end_year}` : "Not specified",
          academic_year_id: academicYear?.id || null,
        }

        console.log("useCachedManagerProfile: Processed manager profile data:", processedProfile)

        // Save to cache
        setCachedData(cacheKey, userId, processedProfile)

        // Update state
        setProfile(processedProfile)
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
