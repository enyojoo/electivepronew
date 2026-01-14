"use client"

import { Button } from "@/components/ui/button"
import { useLanguage } from "@/lib/language-context"
import { CountryFlag } from "@/lib/countries"
import { useState, useEffect } from "react"

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const toggleLanguage = () => {
    setLanguage(language === "en" ? "ru" : "en")
  }

  // Show the current language with flag
  const currentFlag = language === "ru" ? "ru" : "gb"
  const currentLabel = language === "ru" ? "RU" : "EN"
  const title = language === "en" ? "Switch to Russian" : "Переключить на английский"

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleLanguage}
      className="flex items-center gap-2 px-3 py-2 h-9"
      title={mounted ? title : "Switch to Russian"}
      suppressHydrationWarning
    >
      <CountryFlag code={mounted ? currentFlag : "gb"} size={16} />
      <span className="text-sm" suppressHydrationWarning>
        {mounted ? currentLabel : "EN"}
      </span>
    </Button>
  )
}
