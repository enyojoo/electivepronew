"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/lib/language-context"
import { useToast } from "@/hooks/use-toast"
import { Copy, Check } from "lucide-react"

export function LoginLinksSettings() {
  const { t } = useLanguage()
  const { toast } = useToast()
  const [copiedLink, setCopiedLink] = useState<string | null>(null)

  // Get base URL for login links
  const getBaseUrl = () => {
    if (typeof window !== "undefined") {
      return window.location.origin
    }
    return ""
  }

  const studentLoginUrl = `${getBaseUrl()}/student/login`
  const managerLoginUrl = `${getBaseUrl()}/manager/login`

  const handleCopyLink = async (url: string, type: "student" | "manager") => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedLink(type)
      toast({
        title: t("settings.toast.linkCopied"),
        description: t("settings.toast.linkCopiedDesc"),
      })
      setTimeout(() => setCopiedLink(null), 2000)
    } catch (error) {
      console.error("Failed to copy link:", error)
      toast({
        title: t("settings.toast.copyError"),
        description: t("settings.toast.copyErrorDesc"),
        variant: "destructive",
      })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("settings.branding.loginLinks")}</CardTitle>
        <CardDescription>
          {t("settings.branding.loginLinksDescription", "Share these login URLs with students and program managers")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Student Login URL */}
        <div className="space-y-2">
          <Label>{t("settings.branding.studentLogin")}</Label>
          <div className="flex items-center gap-2">
            <Input value={studentLoginUrl} readOnly className="flex-1 font-mono text-sm" />
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCopyLink(studentLoginUrl, "student")}
              className="shrink-0"
            >
              {copiedLink === "student" ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  {t("settings.toast.copied", "Copied")}
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  {t("settings.toast.copy", "Copy")}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Program Manager Login URL */}
        <div className="space-y-2">
          <Label>{t("settings.branding.managerLogin")}</Label>
          <div className="flex items-center gap-2">
            <Input value={managerLoginUrl} readOnly className="flex-1 font-mono text-sm" />
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCopyLink(managerLoginUrl, "manager")}
              className="shrink-0"
            >
              {copiedLink === "manager" ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  {t("settings.toast.copied", "Copied")}
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  {t("settings.toast.copy", "Copy")}
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
