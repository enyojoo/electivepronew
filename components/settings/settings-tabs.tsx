"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BrandingSettings } from "@/components/settings/branding-settings"
import { NotificationSettings } from "@/components/settings/notification-settings"
import { LoginLinksSettings } from "@/components/settings/login-links-settings"
import { useLanguage } from "@/lib/language-context"

export function SettingsTabs() {
  const [activeTab, setActiveTab] = useState("branding")
  const { t } = useLanguage()

  // Check for tab parameter in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const tabParam = urlParams.get("settingsTab")
    if (tabParam && ["branding", "notifications", "login-links"].includes(tabParam)) {
      setActiveTab(tabParam)
    }
  }, [])

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
      <TabsList className="grid w-full grid-cols-3 md:w-auto">
        <TabsTrigger value="branding">{t("admin.settings.tabs.branding")}</TabsTrigger>
        <TabsTrigger value="notifications">{t("admin.settings.tabs.notifications", "Notifications")}</TabsTrigger>
        <TabsTrigger value="login-links">{t("admin.settings.tabs.loginLinks", "Login Links")}</TabsTrigger>
      </TabsList>

      <TabsContent value="branding" className="space-y-6">
        <BrandingSettings />
      </TabsContent>

      <TabsContent value="notifications" className="space-y-6">
        <NotificationSettings />
      </TabsContent>

      <TabsContent value="login-links" className="space-y-6">
        <LoginLinksSettings />
      </TabsContent>
    </Tabs>
  )
}
