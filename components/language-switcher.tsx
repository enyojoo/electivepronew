"use client"

import { Button } from "@/components/ui/button"
import { useLanguage } from "@/lib/language-context"
import { Globe } from "lucide-react"

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage()

  const toggleLanguage = () => {
    setLanguage(language === "en" ? "ru" : "en")
  }

  return (
    <Button variant="outline" size="sm" onClick={toggleLanguage} className="w-20 font-medium flex items-center gap-1">
      <Globe className="h-4 w-4" />
      {language.toUpperCase()}
    </Button>
  )
}
