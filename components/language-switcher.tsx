"use client"

import { Button } from "@/components/ui/button"
import { useLanguage } from "@/lib/language-context"
import { CountryFlag } from "@/lib/countries"

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage()

  const toggleLanguage = () => {
    setLanguage(language === "en" ? "ru" : "en")
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleLanguage}
      className="flex items-center gap-2 px-3 py-2 h-9"
      title={language === "en" ? "Switch to Russian" : "Переключить на английский"}
    >
      {language === "en" ? (
        <>
          <CountryFlag code="gb" size={16} />
          <span className="text-sm">English</span>
        </>
      ) : (
        <>
          <CountryFlag code="ru" size={16} />
          <span className="text-sm">Русский</span>
        </>
      )}
    </Button>
  )
}
