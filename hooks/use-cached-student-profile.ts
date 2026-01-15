"use client"

import { useState, useEffect, useRef } from "react"
import { useDataCache } from "@/lib/data-cache-context"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

// Cache constants for localStorage
const STUDENT_PROFILE_CACHE_KEY = "studentProfileCache"
const CACHE_EXPIRY = 60 * 60 * 1000 // 60 minutes

// Helper functions for localStorage cache
const getCachedProfileFromStorage = (userId: string): any | null => {
  if (typeof window === "undefined") return null
  try {
    const cachedData = localStorage.getItem(`${STUDENT_PROFILE_CACHE_KEY}_${userId}`)
    if (!cachedData) return null

    const parsed = JSON.parse(cachedData)
    // Check if cache is expired
    if (Date.now() - parsed.timestamp > CACHE_EXPIRY) {
      localStorage.removeItem(`${STUDENT_PROFILE_CACHE_KEY}_${userId}`)
      return null
    }

    return parsed.data
  } catch (error) {
    console.error(`Error reading profile cache from storage:`, error)
    return null
  }
}

const setCachedProfileToStorage = (userId: string, data: any) => {
  if (typeof window === "undefined") return
  try {
    const cacheData = {
      data,
      timestamp: Date.now(),
    }
    localStorage.setItem(`${STUDENT_PROFILE_CACHE_KEY}_${userId}`, JSON.stringify(cacheData))
  } catch (error) {
    console.error(`Error writing profile cache to storage:`, error)
  }
}

export function useCachedStudentProfile(userId?: string) {
  // Initialize profile from localStorage cache if available
  const [profile, setProfile] = useState<any>(() => {
    if (typeof window !== "undefined" && userId) {
      const cached = getCachedProfileFromStorage(userId)
      if (cached) {
        return cached
      }
    }
    return null
  })
  
  const [isLoading, setIsLoading] = useState(() => {
    // Only show loading if we don't have cached data
    if (typeof window !== "undefined" && userId) {
      const cached = getCachedProfileFromStorage(userId)
      return !cached
    }
    return true
  })
  
  const [error, setError] = useState<string | null>(null)
  const { getCachedData, setCachedData } = useDataCache()
  const { toast } = useToast()
  const supabase = getSupabaseBrowserClient()
  const hasFetchedRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    // Reset fetch flag if userId changed
    if (hasFetchedRef.current !== userId) {
      hasFetchedRef.current = undefined
    }

    const fetchProfile = async () => {
      // Prevent multiple fetches for the same userId
      if (hasFetchedRef.current === userId) return
      
      // If userId is not provided yet, wait
      if (!userId) {
        // Try to get userId from session
        try {
          const {
            data: { session },
            error: sessionError,
          } = await supabase.auth.getSession()

          if (sessionError || !session?.user) {
            setIsLoading(false)
            return
          }

          const currentUserId = session.user.id
          // Check localStorage cache first
          const cachedProfile = getCachedProfileFromStorage(currentUserId)
          if (cachedProfile) {
            console.log("useCachedStudentProfile: Using cached student profile from storage")
            setProfile(cachedProfile)
            setIsLoading(false)
            return
          }
        } catch (e) {
          setIsLoading(false)
          return
        }
        return
      }

      // Check localStorage cache first
      const cachedProfileStorage = getCachedProfileFromStorage(userId)
      if (cachedProfileStorage) {
        console.log("useCachedStudentProfile: Using cached student profile from storage")
        setProfile(cachedProfileStorage)
        setIsLoading(false)
        // Also update in-memory cache
        setCachedData("studentProfile", userId, cachedProfileStorage)
        hasFetchedRef.current = userId
        return
      }

      // Check in-memory cache
      const cachedProfile = getCachedData<any>("studentProfile", userId)
      if (cachedProfile) {
        console.log("useCachedStudentProfile: Using cached student profile from memory")
        setProfile(cachedProfile)
        setIsLoading(false)
        // Also save to localStorage
        setCachedProfileToStorage(userId, cachedProfile)
        hasFetchedRef.current = userId
        return
      }

      // Mark that we're fetching
      hasFetchedRef.current = userId
      setIsLoading(true)
      setError(null)
      console.log("useCachedStudentProfile: Fetching student profile from API for user:", userId)

      try {
        // Fetch profile data
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .eq("role", "student")
          .single()

        if (profileError) {
          console.error("useCachedStudentProfile: Profile fetch error:", profileError)
          throw profileError
        }

        if (!profileData) {
          console.error("useCachedStudentProfile: No profile data found")
          throw new Error("No student profile data found for user")
        }

        // Verify this is actually a student profile
        if (profileData.role !== "student") {
          console.error(`useCachedStudentProfile: Expected student role, but got: ${profileData.role}`)
          throw new Error(`Expected student role, but got: ${profileData.role}`)
        }

        // Fetch student profile with relationships (query from student_profiles to avoid nested relationship issues)
        const { data: studentProfileData, error: studentProfileError } = await supabase
          .from("student_profiles")
          .select(`
            group_id,
            enrollment_year,
            groups(
              id,
              name,
              degrees(id, name, name_ru)
            )
          `)
          .eq("profile_id", userId)
          .maybeSingle()

        if (studentProfileError) {
          console.error("useCachedStudentProfile: Student profile fetch error:", studentProfileError)
          throw studentProfileError
        }

        console.log("useCachedStudentProfile: Raw student profile data:", studentProfileData)

        // Extract data from relationships
        const group = studentProfileData?.groups
        const degree = group?.degrees?.[0] || group?.degrees

        // Combine profile and student profile data
        const processedProfile = {
          ...profileData,
          // Use enrollment_year from student_profiles
          year: studentProfileData?.enrollment_year || "Not specified",
          enrollment_year: studentProfileData?.enrollment_year || "Not specified",
          // Use the proper relationship data
          degree: degree || { name: "Not specified", name_ru: null },
          group: group ? { id: group.id, name: group.name } : { id: null, name: "Not assigned" },
        }

        console.log("useCachedStudentProfile: Processed student profile data:", processedProfile)

        // Save to both caches
        setCachedData("studentProfile", userId, processedProfile)
        setCachedProfileToStorage(userId, processedProfile)

        // Update state
        setProfile(processedProfile)
      } catch (error: any) {
        console.error("useCachedStudentProfile: Error:", error)
        setError(error.message)
        toast({
          title: "Profile Error",
          description: `Failed to load student profile: ${error.message}`,
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfile()
  }, [userId, supabase, getCachedData, setCachedData, toast])

  return { profile, isLoading, error }
}
