"use client"

import { useState, useEffect, useRef } from "react"
import { useDataCache } from "@/lib/data-cache-context"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/lib/language-context"

// Helper function to transform user data based on language
const transformUserData = (data: any[], currentLanguage: string) => {
  return data.map((profile) => {
    // Extract degree and group info based on role
    let degreeId = ""
    let degreeName = ""
    let groupId = ""
    let groupName = ""
    let year = ""

    if (profile.role === "student" && profile.student_profiles && profile.student_profiles.length > 0) {
      const studentProfile = profile.student_profiles[0]
      groupId = studentProfile.group_id || ""
      year = studentProfile.enrollment_year || ""
      
      if (studentProfile.groups) {
        groupName = studentProfile.groups.name || ""
        
        // Get degree from program
        if (studentProfile.groups.programs && studentProfile.groups.programs.degrees) {
          const degree = studentProfile.groups.programs.degrees
          degreeId = studentProfile.groups.programs.degree_id || ""
          degreeName = currentLanguage === "ru" && degree.name_ru ? degree.name_ru : degree.name || ""
        }
      }
    } else if (profile.role === "program_manager" && profile.manager_profiles && profile.manager_profiles.length > 0) {
      const managerProfile = profile.manager_profiles[0]
      if (managerProfile.degrees) {
        degreeId = managerProfile.degree_id || ""
        degreeName = currentLanguage === "ru" && managerProfile.degrees.name_ru 
          ? managerProfile.degrees.name_ru 
          : managerProfile.degrees.name || ""
      }
    }

    return {
      id: profile.id,
      name: profile.full_name || "",
      email: profile.email || "",
      role: profile.role || "",
      status: profile.is_active ? "active" : "inactive",
      degreeId,
      degreeName,
      groupId,
      groupName,
      year,
    }
  })
}

export function useCachedUsers() {
  const [users, setUsers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { getCachedData, setCachedData } = useDataCache()
  const { toast } = useToast()
  const { language } = useLanguage()

  // Raw data ref to store the original data with all language versions
  const rawDataRef = useRef<any[]>([])

  // Flag to track if initial data has been loaded
  const initialDataLoadedRef = useRef(false)

  useEffect(() => {
    const fetchUsers = async () => {
      // Check if we have cached data first
      const cachedData = getCachedData<any[]>("users", "all")

      if (cachedData && cachedData.length > 0) {
        console.log("Using cached users data")
        rawDataRef.current = cachedData
        const transformedUsers = transformUserData(cachedData, language)
        setUsers(transformedUsers)
        initialDataLoadedRef.current = true
        return
      }

      // If we already have raw data, just transform it based on the current language
      if (rawDataRef.current.length > 0) {
        console.log("Using existing raw data with new language:", language)
        const transformedUsers = transformUserData(rawDataRef.current, language)
        setUsers(transformedUsers)
        return
      }

      // Only set loading to true if we need to fetch from API
      setIsLoading(true)

      try {
        console.log("Fetching users data from API")
        const supabase = getSupabaseBrowserClient()

        // Fetch profiles with degree, group, and year information
        // Note: degree_id, group_id, and academic_year are in student_profiles/manager_profiles tables
        // We need to fetch these separately due to Supabase relationship limitations
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select(`
          id, 
          full_name, 
          email, 
          role, 
          is_active
        `)
          .order("full_name")

        if (profilesError) throw profilesError

        // Fetch student profiles with groups and degrees
        const { data: studentProfilesData } = await supabase
          .from("student_profiles")
          .select(`
            profile_id,
            group_id,
            enrollment_year,
            groups!inner(
              id,
              name,
              programs!inner(
                degree_id,
                degrees!inner(id, name, name_ru)
              )
            )
          `)

        // Fetch manager profiles with degrees
        const { data: managerProfilesData } = await supabase
          .from("manager_profiles")
          .select(`
            profile_id,
            degree_id,
            degrees(id, name, name_ru)
          `)

        // Combine the data
        const profilesWithDetails = (profilesData || []).map((profile) => {
          if (profile.role === "student") {
            const studentProfile = studentProfilesData?.find((sp) => sp.profile_id === profile.id)
            return {
              ...profile,
              student_profiles: studentProfile ? [studentProfile] : [],
            }
          } else if (profile.role === "program_manager") {
            const managerProfile = managerProfilesData?.find((mp) => mp.profile_id === profile.id)
            return {
              ...profile,
              manager_profiles: managerProfile ? [managerProfile] : [],
            }
          }
          return profile
        })

        const profilesData = profilesWithDetails

        if (profilesError) throw profilesError

        // Store the raw data for future language switches
        rawDataRef.current = finalProfilesData || []

        // Cache the data
        setCachedData("users", "all", finalProfilesData)

        // Transform the data based on current language
        const transformedUsers = transformUserData(finalProfilesData || [], language)

        // Update state
        setUsers(transformedUsers)
        initialDataLoadedRef.current = true
      } catch (error: any) {
        console.error("Error fetching users:", error)
        setError(error.message)
        toast({
          title: "Error",
          description: "Failed to load users data",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchUsers()
  }, [language, toast, getCachedData, setCachedData])

  return {
    users,
    isLoading,
    error,
    isInitialDataLoaded: initialDataLoadedRef.current,
  }
}
