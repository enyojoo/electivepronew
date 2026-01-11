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
      // Try to get data from cache first
      const cachedSettings = getCachedData<any>("settings", SETTINGS_ID)

      if (cachedSettings) {
        console.log("Using cached settings")
        setSettings(cachedSettings)
        setIsLoading(false)
        return
      }

      // If not in cache, fetch from API
      setIsLoading(true)
      setError(null)
      console.log("Fetching settings from API")
      try {
        const supabase = getSupabaseBrowserClient()

        const { data, error } = await supabase.from("settings").select("*").eq("id", SETTINGS_ID).maybeSingle()

        // If settings don't exist, create a default row
        if (error) {
          throw error
        } else if (!data) {
          // No rows returned - create default settings
          console.log("Settings row not found, creating default settings")
          const defaultSettings = {
            id: SETTINGS_ID,
            name: null,
            primary_color: null,
            logo_url: null,
            favicon_url: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }

          const { error: insertError } = await supabase.from("settings").insert(defaultSettings)

          if (insertError) {
            console.error("Error creating default settings:", insertError)
            // Even if insert fails, use defaults
            setSettings(defaultSettings)
            setCachedData("settings", SETTINGS_ID, defaultSettings)
          } else {
            setSettings(defaultSettings)
            setCachedData("settings", SETTINGS_ID, defaultSettings)
          }
        } else {
          // Save to cache
          setCachedData("settings", SETTINGS_ID, data)

          // Update state
          setSettings(data)
        }
      } catch (error: any) {
        console.error("Error fetching settings:", error)
        setError(error.message)
        toast({
          title: "Error",
          description: "Failed to load settings",
          variant: "destructive",
        })
        // Set default settings on error
        const defaultSettings = {
          id: SETTINGS_ID,
          name: null,
          primary_color: null,
          logo_url: null,
          favicon_url: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        setSettings(defaultSettings)
      } finally {
        setIsLoading(false)
      }
    }

    fetchSettings()
  }, [getCachedData, setCachedData, toast])

  return { settings, isLoading, error }
}
