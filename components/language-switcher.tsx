"use client"

import { Button } from "@/components/ui/button"
import { useLanguage } from "@/lib/language-context"

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
      className="min-w-[80px] font-medium flex items-center justify-center gap-2"
    >
      <span className="text-lg">{language === "en" ? "🇺🇸" : "🇷🇺"}</span>
      <span>{language === "en" ? "EN" : "РУ"}</span>
    </Button>
  )
}
