"use client"

import { useState, useEffect } from "react"
import { useDataCache } from "@/lib/data-cache-context"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

export function useCachedStudentProfile(userId?: string) {
  const [profile, setProfile] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { getCachedData, setCachedData } = useDataCache()
  const { toast } = useToast()
  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true)
      setError(null)
      console.log("useCachedStudentProfile: Starting profile fetch")

      try {
        // If userId is not provided, get the current user session
        let currentUserId = userId

        if (!currentUserId) {
          console.log("useCachedStudentProfile: No userId provided, checking user")
          const {
            data: { user },
            error: userError,
          } = await supabase.auth.getUser()

          if (userError) {
            console.error("useCachedStudentProfile: User error:", userError)
            throw new Error(`Authentication error: ${userError.message}`)
          }

          if (!user) {
            console.log("useCachedStudentProfile: No authenticated user found")
            setIsLoading(false)
            return
          }

          currentUserId = user.id
          console.log("useCachedStudentProfile: Got userId from user:", currentUserId)
        }

        // Try to get data from cache first
        const cachedProfile = getCachedData<any>("studentProfile", currentUserId)

        if (cachedProfile) {
          console.log("useCachedStudentProfile: Using cached student profile")
          setProfile(cachedProfile)
          setIsLoading(false)
          return
        }

        // If not in cache, fetch from API
        console.log("useCachedStudentProfile: Fetching student profile from API for user:", currentUserId)

        // Fetch profile data
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", currentUserId)
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
          .eq("profile_id", currentUserId)
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

        // Save to cache
        setCachedData("studentProfile", currentUserId, processedProfile)

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
  }, [userId]) // Only depend on userId to prevent unnecessary refetches

  return { profile, isLoading, error }
}
