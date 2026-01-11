"use client"

import type React from "react"

import { ThemeProvider } from "@/components/theme-provider"
import { LanguageProvider } from "@/lib/language-context"
import { DataCacheProvider } from "@/lib/data-cache-context"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <LanguageProvider>
        <DataCacheProvider>{children}</DataCacheProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}
