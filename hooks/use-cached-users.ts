"use client"

import { useState, useEffect, useRef } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/lib/language-context"

// Cache key and expiry (matching groups page pattern)
const USERS_CACHE_KEY = "admin_users_cache"
const CACHE_EXPIRY = 60 * 60 * 1000 // 1 hour

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
        
        // Try to get degree - handle both old structure (through programs) and new structure (direct)
        let degree = null
        
        // First try direct degrees (new structure)
        if (group.degrees) {
          degree = Array.isArray(group.degrees) ? group.degrees[0] : group.degrees
          degreeId = group.degree_id || ""
        }
        // Fallback to programs->degrees (old cached structure)
        else if (group.programs) {
          const program = Array.isArray(group.programs) ? group.programs[0] : group.programs
          if (program) {
            degreeId = program.degree_id || ""
            if (program.degrees) {
              degree = Array.isArray(program.degrees) ? program.degrees[0] : program.degrees
            }
          }
        }
        
        if (degree) {
          degreeName = currentLanguage === "ru" && degree.name_ru ? degree.name_ru : degree.name || ""
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
      // Extract year from academic_years
      const academicYear = Array.isArray(managerProfile.academic_years) 
        ? managerProfile.academic_years[0] 
        : managerProfile.academic_years
      if (academicYear) {
        year = academicYear.year || ""
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
  const { language } = useLanguage()
  const { toast } = useToast()
  
  // Load cached data synchronously on initial render (like groups page)
  const initialCachedData = (() => {
    if (typeof window === "undefined") return null
    
    try {
      const cached = localStorage.getItem(USERS_CACHE_KEY)
      if (cached) {
        const { data, timestamp } = JSON.parse(cached)
        if (Date.now() - timestamp < CACHE_EXPIRY) {
          return data || []
        }
      }
    } catch (error) {
      console.error("Error loading cached users:", error)
    }
    return null
  })()

  // Raw data ref to store the original data with all language versions
  const rawDataRef = useRef<any[]>(initialCachedData || [])

  // Flag to track if initial data has been loaded
  const initialDataLoadedRef = useRef(!!initialCachedData)

  const [users, setUsers] = useState<any[]>(() => {
    // Transform cached data on initial render if available
    if (initialCachedData && initialCachedData.length > 0) {
      return transformUserData(initialCachedData, language)
    }
    return []
  })
  
  const [isLoading, setIsLoading] = useState(() => {
    // Only set loading if we don't have valid cache
    if (typeof window === "undefined") return true
    
    try {
      const cached = localStorage.getItem(USERS_CACHE_KEY)
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

  // Transform users when language changes (if we have raw data)
  useEffect(() => {
    if (rawDataRef.current.length > 0) {
      const transformedUsers = transformUserData(rawDataRef.current, language)
      setUsers(transformedUsers)
    }
  }, [language])

  // Fetch users from Supabase (only if loading)
  useEffect(() => {
    const fetchUsers = async () => {
      if (!isLoading) {
        return // Already have data from cache
      }

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

        // Fetch student profiles with groups (groups directly reference degrees)
        const { data: studentProfilesData } = await supabase
          .from("student_profiles")
          .select(`
            profile_id,
            group_id,
            enrollment_year,
            groups(
              id,
              name,
              degree_id,
              degrees(id, name, name_ru)
            )
          `)

        // Fetch manager profiles with degrees and academic years
        const { data: managerProfilesData } = await supabase
          .from("manager_profiles")
          .select(`
            profile_id,
            degree_id,
            academic_year_id,
            degrees(id, name, name_ru),
            academic_years(id, year)
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

        // Cache the data (matching groups page pattern)
        localStorage.setItem(
          USERS_CACHE_KEY,
          JSON.stringify({
            data: finalProfilesData || [],
            timestamp: Date.now(),
          }),
        )

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
  }, [isLoading, toast, language])

  // Watch for cache invalidation and trigger refetch
  useEffect(() => {
    const checkCache = () => {
      const cached = localStorage.getItem(USERS_CACHE_KEY)
      if (!cached && !isLoading && users.length > 0) {
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
      if (e.key === USERS_CACHE_KEY && e.newValue === null) {
        checkCache()
      }
    }
    
    window.addEventListener("storage", handleStorageChange)

    return () => {
      clearInterval(interval)
      window.removeEventListener("storage", handleStorageChange)
    }
  }, [users.length, isLoading])

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
          localStorage.removeItem(USERS_CACHE_KEY)
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
                  degree_id,
                  degrees(id, name, name_ru)
                )
              `)

            const { data: managerProfilesData } = await supabase
              .from("manager_profiles")
              .select(`
                profile_id,
                degree_id,
                academic_year_id,
                degrees(id, name, name_ru),
                academic_years(id, year)
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
            
            // Update cache (matching groups page pattern)
            localStorage.setItem(
              USERS_CACHE_KEY,
              JSON.stringify({
                data: profilesWithDetails,
                timestamp: Date.now(),
              }),
            )
            
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
          localStorage.removeItem(USERS_CACHE_KEY)
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
                  degree_id,
                  degrees(id, name, name_ru)
                )
              `)

            const { data: managerProfilesData } = await supabase
              .from("manager_profiles")
              .select(`
                profile_id,
                degree_id,
                academic_year_id,
                degrees(id, name, name_ru),
                academic_years(id, year)
              `)

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
            
            // Update cache (matching groups page pattern)
            localStorage.setItem(
              USERS_CACHE_KEY,
              JSON.stringify({
                data: profilesWithDetails,
                timestamp: Date.now(),
              }),
            )
            
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
          localStorage.removeItem(USERS_CACHE_KEY)
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
                  degree_id,
                  degrees(id, name, name_ru)
                )
              `)

            const { data: managerProfilesData } = await supabase
              .from("manager_profiles")
              .select(`
                profile_id,
                degree_id,
                academic_year_id,
                degrees(id, name, name_ru),
                academic_years(id, year)
              `)

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
            
            // Update cache (matching groups page pattern)
            localStorage.setItem(
              USERS_CACHE_KEY,
              JSON.stringify({
                data: profilesWithDetails,
                timestamp: Date.now(),
              }),
            )
            
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
  }, [language])

  return {
    users,
    isLoading,
    error,
    isInitialDataLoaded: initialDataLoadedRef.current,
  }
}
