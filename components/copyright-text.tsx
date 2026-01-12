"use client"

import { useBrandSettings } from "@/hooks/use-brand-settings"

export default function CopyrightText() {
  const brandSettings = useBrandSettings()

  // Only show platform name if we've confirmed data from database
  if (brandSettings.isLoading || !brandSettings.hasData) {
    return (
      <p className="text-xs text-muted-foreground text-center">
        © {new Date().getFullYear()}
      </p>
    )
  }

  const platformName = brandSettings.platformName || ""

  return (
    <p className="text-xs text-muted-foreground text-center">
      © {new Date().getFullYear()}
      {platformName ? ` ${platformName}` : ""}
    </p>
  )
}
