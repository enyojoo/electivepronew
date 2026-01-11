"use client"

import { Button } from "@/components/ui/button"
import { useLanguage } from "@/lib/language-context"
import { Compass, Home, Search } from "lucide-react"
import Link from "next/link"
import { LanguageSwitcher } from "@/components/language-switcher"

export default function NotFoundPage() {
  const { t } = useLanguage()
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-6 bg-gradient-to-b from-background to-muted">
      <div className="max-w-md w-full space-y-8 text-center">
        <div className="text-9xl font-bold text-primary/10 mb-4">404</div>

        <h1 className="text-4xl font-bold tracking-tight">{t("notFound.title")}</h1>
        <p className="text-xl text-muted-foreground mt-2">{t("notFound.subtitle")}</p>

        <div className="mt-6 bg-card rounded-lg p-6 shadow-md">
          <h2 className="text-lg font-medium mb-4">{t("notFound.suggestions")}</h2>
          <ul className="space-y-3 text-left">
            <li className="flex items-start">
              <Compass className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
              <span>{t("notFound.suggestion1")}</span>
            </li>
            <li className="flex items-start">
              <Search className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
              <span>{t("notFound.suggestion2")}</span>
            </li>
          </ul>
        </div>

        <div className="flex flex-col gap-4 mt-8 w-full max-w-xs mx-auto">
          <Button asChild className="w-full">
            <Link href="/admin/dashboard">
              <Home className="mr-2 h-4 w-4" />
              {t("notFound.backToDashboard")}
            </Link>
          </Button>
        </div>

        <div className="flex justify-center mt-6">
          <LanguageSwitcher />
        </div>
      </div>
    </div>
  )
}
