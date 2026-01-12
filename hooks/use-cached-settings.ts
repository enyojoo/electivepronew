"use client"

import { useState, useEffect, useRef } from "react"
import { useDataCache } from "@/lib/data-cache-context"
import { useToast } from "@/hooks/use-toast"

// Use a constant cache key since there's only one settings row
const SETTINGS_CACHE_KEY = "settings"

export function useCachedSettings() {
  const [settings, setSettings] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { getCachedData, setCachedData, getCacheVersion } = useDataCache()
  const { toast } = useToast()
  const cacheVersionRef = useRef<number>(0)
  const hasInitializedRef = useRef(false)

  // Watch for cache updates by monitoring cache version
  // getCacheVersion depends on cache, so when cache changes, this effect will run
  useEffect(() => {
    const currentVersion = getCacheVersion("settings", SETTINGS_CACHE_KEY)
    if (currentVersion !== cacheVersionRef.current && currentVersion > 0) {
      cacheVersionRef.current = currentVersion
      const cachedSettings = getCachedData<any>("settings", SETTINGS_CACHE_KEY)
      if (cachedSettings && JSON.stringify(cachedSettings) !== JSON.stringify(settings)) {
        console.log("Cache updated, refreshing settings")
        setSettings(cachedSettings)
        setIsLoading(false)
      }
    }
  }, [getCacheVersion, getCachedData, settings])

  useEffect(() => {
    if (hasInitializedRef.current) return
    hasInitializedRef.current = true

    const fetchSettings = async () => {
      // Try to get data from cache first
      const cachedSettings = getCachedData<any>("settings", SETTINGS_CACHE_KEY)

      if (cachedSettings) {
        console.log("Using cached settings")
        setSettings(cachedSettings)
        cacheVersionRef.current = getCacheVersion("settings", SETTINGS_CACHE_KEY)
        setIsLoading(false)
        return
      }

      // If not in cache, fetch from API route
      setIsLoading(true)
      setError(null)
      console.log("Fetching settings from API")
      try {
        const response = await fetch("/api/settings", {
          credentials: "include", // Include cookies for authentication
        })
        
        if (!response.ok) {
          // If unauthorized or forbidden, use defaults
          if (response.status === 401 || response.status === 403) {
            console.log("Not authenticated, using default settings")
            const defaultSettings = {
              name: null,
              primary_color: null,
              logo_url: null,
              favicon_url: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }
            setSettings(defaultSettings)
            setCachedData("settings", SETTINGS_CACHE_KEY, defaultSettings)
            cacheVersionRef.current = getCacheVersion("settings", SETTINGS_CACHE_KEY)
            return
          }
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const result = await response.json()
        const data = result.rawSettings

        if (!data) {
          // No settings found - use defaults
          console.log("Settings row not found, using default settings")
          const defaultSettings = {
            name: null,
            primary_color: null,
            logo_url: null,
            favicon_url: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
          setSettings(defaultSettings)
          setCachedData("settings", SETTINGS_CACHE_KEY, defaultSettings)
          cacheVersionRef.current = getCacheVersion("settings", SETTINGS_CACHE_KEY)
        } else {
          // Save to cache
          setCachedData("settings", SETTINGS_CACHE_KEY, data)
          cacheVersionRef.current = getCacheVersion("settings", SETTINGS_CACHE_KEY)

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
  }, [getCachedData, setCachedData, getCacheVersion, toast])

  return { settings, isLoading, error }
}
