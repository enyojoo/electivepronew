"use client"

import type React from "react"

import { ThemeProvider } from "@/components/theme-provider"
import { LanguageProvider } from "@/lib/language-context"
import { DataCacheProvider } from "@/lib/data-cache-context"
import { BrandProvider } from "@/lib/brand-context"
import { AuthProvider } from "@/lib/auth-context"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <LanguageProvider>
        <DataCacheProvider>
          <BrandProvider>
            <AuthProvider>{children}</AuthProvider>
          </BrandProvider>
        </DataCacheProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}
