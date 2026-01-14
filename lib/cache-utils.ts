// Cache utilities for consistent caching across the application
export const CACHE_EXPIRY = 60 * 60 * 1000 // 60 minutes

export interface CacheData<T = any> {
  data: T
  timestamp: number
}

export const getCachedData = <T = any>(key: string): T | null => {
  try {
    const cachedData = localStorage.getItem(key)
    if (!cachedData) return null

    const parsed: CacheData<T> = JSON.parse(cachedData)

    // Check if cache is expired
    if (Date.now() - parsed.timestamp > CACHE_EXPIRY) {
      localStorage.removeItem(key)
      return null
    }

    return parsed.data
  } catch (error) {
    console.error(`Error reading from cache (${key}):`, error)
    return null
  }
}

export const setCachedData = (key: string, data: any) => {
  try {
    const cacheData: CacheData = {
      data,
      timestamp: Date.now(),
    }
    localStorage.setItem(key, JSON.stringify(cacheData))
  } catch (error) {
    console.error(`Error writing to cache (${key}):`, error)
  }
}

export const invalidateCache = (key: string) => {
  try {
    localStorage.removeItem(key)
  } catch (error) {
    console.error(`Error invalidating cache (${key}):`, error)
  }
}

export const invalidateMultipleCache = (keys: string[]) => {
  keys.forEach(key => invalidateCache(key))
}

// Session storage helpers for force refresh flags
export const setForceRefreshFlag = (key: string) => {
  try {
    sessionStorage.setItem(key, 'true')
  } catch (error) {
    console.error(`Error setting force refresh flag (${key}):`, error)
  }
}

export const getForceRefreshFlag = (key: string): boolean => {
  try {
    return sessionStorage.getItem(key) === 'true'
  } catch (error) {
    console.error(`Error getting force refresh flag (${key}):`, error)
    return false
  }
}

export const clearForceRefreshFlag = (key: string) => {
  try {
    sessionStorage.removeItem(key)
  } catch (error) {
    console.error(`Error clearing force refresh flag (${key}):`, error)
  }
}