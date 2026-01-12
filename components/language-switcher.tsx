"use client"

import { Button } from "@/components/ui/button"
import { useLanguage } from "@/lib/language-context"
import { CountryFlag } from "@/lib/countries"

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage()

  const toggleLanguage = () => {
    setLanguage(language === "en" ? "ru" : "en")
  }

  // Show the language you can switch TO, not the current language
  const targetLanguage = language === "en" ? "ru" : "en"
  const targetFlag = targetLanguage === "ru" ? "ru" : "gb"
  const targetLabel = targetLanguage === "ru" ? "RU" : "EN"
  const targetTitle = language === "en" ? "Switch to Russian" : "Переключить на английский"

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleLanguage}
      className="flex items-center gap-2 px-3 py-2 h-9"
      title={targetTitle}
    >
      <CountryFlag code={targetFlag} size={16} />
      <span className="text-sm">{targetLabel}</span>
    </Button>
  )
}
