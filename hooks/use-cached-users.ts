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
      
      // Handle groups - could be object or array
      const group = Array.isArray(studentProfile.groups) ? studentProfile.groups[0] : studentProfile.groups
      if (group) {
        groupName = group.name || ""
        
        // Get degree from program - programs could be object or array
        const program = Array.isArray(group.programs) ? group.programs[0] : group.programs
        if (program) {
          degreeId = program.degree_id || ""
          // degrees could be object or array
          const degree = Array.isArray(program.degrees) ? program.degrees[0] : program.degrees
          if (degree) {
            degreeName = currentLanguage === "ru" && degree.name_ru ? degree.name_ru : degree.name || ""
          }
        }
      }
    } else if (profile.role === "program_manager" && profile.manager_profiles && profile.manager_profiles.length > 0) {
      const managerProfile = profile.manager_profiles[0]
      degreeId = managerProfile.degree_id || ""
      // degrees could be object or array
      const degree = Array.isArray(managerProfile.degrees) ? managerProfile.degrees[0] : managerProfile.degrees
      if (degree) {
        degreeName = currentLanguage === "ru" && degree.name_ru 
          ? degree.name_ru 
          : degree.name || ""
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

        // Fetch student profiles with groups
        const { data: studentProfilesData } = await supabase
          .from("student_profiles")
          .select(`
            profile_id,
            group_id,
            enrollment_year,
            groups(
              id,
              name,
              programs(
                degree_id,
                degrees(id, name, name_ru)
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

        const finalProfilesData = profilesWithDetails

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

  // Set up real-time subscriptions for instant updates
  useEffect(() => {
    const supabase = getSupabaseBrowserClient()

    const channel = supabase
      .channel("users-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        async () => {
          // Invalidate cache and refetch
          setCachedData("users", "all", null) // Clear cache
          setIsLoading(true)

          try {
            // Refetch profiles
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

            // Refetch student and manager profiles
            const { data: studentProfilesData } = await supabase
              .from("student_profiles")
              .select(`
                profile_id,
                group_id,
                enrollment_year,
                groups(
                  id,
                  name,
                  programs(
                    degree_id,
                    degrees(id, name, name_ru)
                  )
                )
              `)

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

            rawDataRef.current = profilesWithDetails
            setCachedData("users", "all", profilesWithDetails)
            const transformedUsers = transformUserData(profilesWithDetails, language)
            setUsers(transformedUsers)
          } catch (error: any) {
            console.error("Error refetching users after real-time update:", error)
          } finally {
            setIsLoading(false)
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "student_profiles" },
        async () => {
          // Invalidate cache and refetch when student profiles change
          setCachedData("users", "all", null)
          setIsLoading(true)

          try {
            const { data: profilesData } = await supabase
              .from("profiles")
              .select(`id, full_name, email, role, is_active`)
              .order("full_name")

            const { data: studentProfilesData } = await supabase
              .from("student_profiles")
              .select(`
                profile_id,
                group_id,
                enrollment_year,
                groups(
                  id,
                  name,
                  programs(
                    degree_id,
                    degrees(id, name, name_ru)
                  )
                )
              `)

            const { data: managerProfilesData } = await supabase
              .from("manager_profiles")
              .select(`profile_id, degree_id, degrees(id, name, name_ru)`)

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

            rawDataRef.current = profilesWithDetails
            setCachedData("users", "all", profilesWithDetails)
            const transformedUsers = transformUserData(profilesWithDetails, language)
            setUsers(transformedUsers)
          } catch (error: any) {
            console.error("Error refetching users after student profile update:", error)
          } finally {
            setIsLoading(false)
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "manager_profiles" },
        async () => {
          // Invalidate cache and refetch when manager profiles change
          setCachedData("users", "all", null)
          setIsLoading(true)

          try {
            const { data: profilesData } = await supabase
              .from("profiles")
              .select(`id, full_name, email, role, is_active`)
              .order("full_name")

            const { data: studentProfilesData } = await supabase
              .from("student_profiles")
              .select(`
                profile_id,
                group_id,
                enrollment_year,
                groups(
                  id,
                  name,
                  programs(
                    degree_id,
                    degrees(id, name, name_ru)
                  )
                )
              `)

            const { data: managerProfilesData } = await supabase
              .from("manager_profiles")
              .select(`profile_id, degree_id, degrees(id, name, name_ru)`)

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

            rawDataRef.current = profilesWithDetails
            setCachedData("users", "all", profilesWithDetails)
            const transformedUsers = transformUserData(profilesWithDetails, language)
            setUsers(transformedUsers)
          } catch (error: any) {
            console.error("Error refetching users after manager profile update:", error)
          } finally {
            setIsLoading(false)
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [language, getCachedData, setCachedData])

  return {
    users,
    isLoading,
    error,
    isInitialDataLoaded: initialDataLoadedRef.current,
  }
}
