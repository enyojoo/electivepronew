"use client"

import { useState, useEffect } from "react"
import { useDataCache } from "@/lib/data-cache-context"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

const SETTINGS_ID = "00000000-0000-0000-0000-000000000000"

export function useCachedSettings() {
  const [settings, setSettings] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { getCachedData, setCachedData } = useDataCache()
  const { toast } = useToast()

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true)
      setError(null)

      // Try to get data from cache first
      const cachedSettings = getCachedData<any>("settings", SETTINGS_ID)

      if (cachedSettings) {
        console.log("Using cached settings")
        setSettings(cachedSettings)
        setIsLoading(false)
        return
      }

      // If not in cache, fetch from API
      console.log("Fetching settings from API")
      try {
        const supabase = getSupabaseBrowserClient()

        const { data, error } = await supabase.from("settings").select("*").eq("id", SETTINGS_ID).single()

        if (error) throw error

        // Save to cache
        setCachedData("settings", SETTINGS_ID, data)

        // Update state
        setSettings(data)
      } catch (error: any) {
        console.error("Error fetching settings:", error)
        setError(error.message)
        toast({
          title: "Error",
          description: "Failed to load settings",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchSettings()
  }, [getCachedData, setCachedData, toast])

  return { settings, isLoading, error }
}
