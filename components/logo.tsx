"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { useBrandSettings } from "@/hooks/use-brand-settings"
import { cn } from "@/lib/utils"
import { DEFAULT_LOGO_URL, DEFAULT_FAVICON_URL } from "@/lib/constants"

interface LogoProps {
  className?: string
  variant?: "full" | "icon"
}

export default function Logo({ className = "", variant = "full" }: LogoProps) {
  const brandSettings = useBrandSettings()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Get logo source - use brand settings or defaults
  const getLogoSrc = (): string | null => {
    // While loading, return null to show skeleton
    if (brandSettings.isLoading || !brandSettings.hasData) {
      return null
    }

    if (variant === "icon") {
      // For icon variant, use favicon
      return brandSettings.favicon || DEFAULT_FAVICON_URL
    }

    // Full logo variant - use logo from settings or default
    return brandSettings.logo || DEFAULT_LOGO_URL
  }

  const logoSrc = getLogoSrc()
  const platformName = brandSettings.platformName || ""

  // Show placeholder/skeleton while loading or if no logo source
  if (!mounted || brandSettings.isLoading || !brandSettings.hasData || !logoSrc) {
    return (
      <div
        className={cn(
          "animate-pulse bg-muted rounded",
          variant === "icon" ? "h-8 w-8" : "h-10 w-32",
          className
        )}
      />
    )
  }

  return (
    <Link href="/" className={cn("flex items-center", className)}>
      <Image
        src={logoSrc}
        alt={`${platformName || "Platform"} Logo`}
        width={variant === "icon" ? 32 : 120}
        height={variant === "icon" ? 32 : 40}
        className="h-auto w-auto object-contain"
        priority
        key={logoSrc} // Force re-render when logo URL changes
      />
    </Link>
  )
}
