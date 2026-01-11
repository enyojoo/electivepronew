"use client"

import { useState, useEffect, useRef } from "react"
import { useDataCache } from "@/lib/data-cache-context"
import { createClient } from "@supabase/supabase-js"
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
        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

        // First, fetch the groups with degrees in a single query
        const { data: groupsData, error: groupsError } = await supabase
          .from("groups")
          .select("*, degrees(id, name)")
          .order("name")

        if (groupsError) throw groupsError

        if (!groupsData) {
          setGroups([])
          setIsLoading(false)
          dataFetchedRef.current = true
          return
        }

        // Count students in each group
        const studentCountPromises = groupsData.map((group) =>
          supabase
            .from("profiles")
            .select("*", { count: "exact", head: true })
            .eq("group_id", group.id)
            .eq("role", "student"),
        )

        const studentCountResults = await Promise.all(studentCountPromises)

        // Create a map of group ID to student count
        const studentCountMap = new Map()
        studentCountResults.forEach((result, index) => {
          const groupId = groupsData[index].id
          studentCountMap.set(groupId, result.count || 0)
        })

        // Format the groups data
        const formattedGroups = groupsData.map((group) => ({
          id: group.id.toString(),
          name: group.name,
          displayName: group.display_name,
          degree: group.degrees?.name || "Unknown",
          degreeId: group.degree_id,
          academicYear: group.academic_year,
          students: studentCountMap.get(group.id) || 0,
          status: group.status,
        }))

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
