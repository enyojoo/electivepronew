"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { useBrandSettings } from "@/hooks/use-brand-settings"
import { cn } from "@/lib/utils"

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

  // Get logo source - only use defaults if we've confirmed no custom branding exists
  const getLogoSrc = (): string | null => {
    if (brandSettings.isLoading || !brandSettings.hasData) {
      return null // Show placeholder while loading
    }

    if (variant === "icon") {
      return brandSettings.favicon || null
    }

    // Full logo variant - single logo
    return brandSettings.logo || null
  }

  const logoSrc = getLogoSrc()
  const platformName = brandSettings.platformName || ""

  // Show placeholder/skeleton while loading
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
      />
    </Link>
  )
}
