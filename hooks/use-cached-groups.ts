"use client"

import { useState, useEffect, useRef } from "react"
import { useDataCache } from "@/lib/data-cache-context"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

export function useCachedGroups() {
  const [groups, setGroups] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { getCachedData, setCachedData } = useDataCache()
  const { toast } = useToast()

  // Use a ref to track if data has been fetched
  const dataFetchedRef = useRef(false)

  useEffect(() => {
    // Return early if we've already fetched data
    if (dataFetchedRef.current) {
      if (isLoading) setIsLoading(false)
      return
    }

    const fetchGroups = async () => {
      // Try to get data from cache first
      const cachedGroups = getCachedData<any[]>("groups", "all")

      if (cachedGroups) {
        console.log("Using cached groups data")
        setGroups(cachedGroups)
        setIsLoading(false)
        dataFetchedRef.current = true
        return
      }

      // If not in cache, fetch from API
      console.log("Fetching groups data from API")
      try {
        const supabase = getSupabaseBrowserClient()

        // Fetch groups with programs, degrees, and academic years through proper relationships
        const { data: groupsData, error: groupsError } = await supabase
          .from("groups")
          .select(`
            id,
            name,
            display_name,
            status,
            academic_year_id,
            academic_years(
              id,
              year
            ),
            programs(
              id,
              degree_id,
              degrees(id, name, name_ru)
            )
          `)
          .order("name")

        if (groupsError) throw groupsError

        if (!groupsData) {
          setGroups([])
          setIsLoading(false)
          dataFetchedRef.current = true
          return
        }

        // Count students in each group using student_profiles
        const studentCountPromises = groupsData.map((group) =>
          supabase
            .from("student_profiles")
            .select("*", { count: "exact", head: true })
            .eq("group_id", group.id),
        )

        const studentCountResults = await Promise.all(studentCountPromises)

        // Create a map of group ID to student count
        const studentCountMap = new Map()
        studentCountResults.forEach((result, index) => {
          const groupId = groupsData[index].id
          studentCountMap.set(groupId, result.count || 0)
        })

        // Format the groups data
        const formattedGroups = groupsData.map((group) => {
          // Extract degree info from programs relationship
          const program = Array.isArray(group.programs) ? group.programs[0] : group.programs
          const degree = program?.degrees ? (Array.isArray(program.degrees) ? program.degrees[0] : program.degrees) : null
          
          // Extract academic year
          const academicYear = Array.isArray(group.academic_years) ? group.academic_years[0] : group.academic_years
          
          return {
            id: group.id.toString(),
            name: group.name,
            displayName: group.display_name,
            degree: degree?.name || "Unknown",
            degreeId: program?.degree_id || "",
            academicYear: academicYear?.year || "",
            students: studentCountMap.get(group.id) || 0,
            status: group.status,
          }
        })

        // Save to cache
        setCachedData("groups", "all", formattedGroups)

        // Update state
        setGroups(formattedGroups)
      } catch (error: any) {
        console.error("Error fetching groups:", error)
        setError(error.message)
        toast({
          title: "Error",
          description: "Failed to load groups data",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
        dataFetchedRef.current = true
      }
    }

    fetchGroups()
  }, [getCachedData, setCachedData, toast, isLoading])

  return { groups, isLoading, error }
}
