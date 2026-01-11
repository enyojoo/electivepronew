"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"

interface CacheItem<T> {
  data: T
  timestamp: number
}

interface DataCacheContextType {
  getCachedData: <T>(cacheKey: string, id: string) => T | null
  setCachedData: <T>(cacheKey: string, id: string, data: T) => void
  invalidateCache: (cacheKey: string, id?: string) => void
}

const DataCacheContext = createContext<DataCacheContextType | undefined>(undefined)

export function useDataCache() {
  const context = useContext(DataCacheContext)
  if (context === undefined) {
    throw new Error("useDataCache must be used within a DataCacheProvider")
  }
  return context
}

interface DataCacheProviderProps {
  children: ReactNode
}

export function DataCacheProvider({ children }: DataCacheProviderProps) {
  const [cache, setCache] = useState<Record<string, Record<string, CacheItem<any>>>>({})

  const getCachedData = useCallback(
    <T,>(cacheKey: string, id: string): T | null => {
      const cachedItem = cache[cacheKey]?.[id]
      if (!cachedItem) {
        return null
      }

      // Cache expires after 30 minutes
      const isExpired = new Date().getTime() - cachedItem.timestamp > 30 * 60 * 1000
      if (isExpired) {
        console.log(`Cache expired for ${cacheKey}:${id}`)
        return null
      }

      console.log(`Using cached data for ${cacheKey}:${id}`)
      return cachedItem.data as T
    },
    [cache],
  )

  const setCachedData = useCallback(<T,>(cacheKey: string, id: string, data: T): void => {
    console.log(`Setting cache for ${cacheKey}:${id}`)
    setCache((prevCache) => ({
      ...prevCache,
      [cacheKey]: {
        ...prevCache[cacheKey],
        [id]: {
          data,
          timestamp: new Date().getTime(),
        },
      },
    }))
  }, [])

  const invalidateCache = useCallback((cacheKey: string, id?: string): void => {
    setCache((prevCache) => {
      const newCache = { ...prevCache }
      if (id) {
        if (newCache[cacheKey]) {
          delete newCache[cacheKey][id]
          console.log(`Cache invalidated for ${cacheKey}:${id}`)
        }
      } else {
        delete newCache[cacheKey]
        console.log(`Cache invalidated for key: ${cacheKey}`)
      }
      return newCache
    })
  }, [])

  return (
    <DataCacheContext.Provider value={{ getCachedData, setCachedData, invalidateCache }}>
      {children}
    </DataCacheContext.Provider>
  )
}
