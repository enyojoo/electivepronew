"use client"

import { Button } from "@/components/ui/button"
import { useLanguage } from "@/lib/language-context"
import { CountryFlag } from "@/lib/countries"

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage()

  const toggleLanguage = () => {
    setLanguage(language === "en" ? "ru" : "en")
  }

  // Show the current language with flag and selection indicator
  const currentFlag = language === "ru" ? "ru" : "gb"
  const currentLabel = language === "ru" ? "RU" : "EN"
  const targetLanguage = language === "en" ? "ru" : "en"
  const title = language === "en" ? "Switch to Russian" : "Переключить на английский"

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleLanguage}
      className="flex items-center gap-2 px-3 py-2 h-9"
      title={title}
    >
      <CountryFlag code={currentFlag} size={16} />
      <span className="text-sm font-medium">{currentLabel}</span>
      <span className="text-xs text-muted-foreground">
        ({language === "en" ? "selected" : "выбран"})
      </span>
    </Button>
  )
}
