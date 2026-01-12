"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { SettingsTabs } from "@/components/settings/settings-tabs"
import { DegreesSettings } from "@/components/settings/degrees-settings"
import { UsersSettings } from "@/components/settings/users-settings"
import { useLanguage } from "@/lib/language-context"
import { Card, CardContent } from "@/components/ui/card"

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("settings")
  const { t } = useLanguage()

  // Check for tab parameter in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const tabParam = urlParams.get("tab")
    if (tabParam && ["settings", "degrees", "users"].includes(tabParam)) {
      setActiveTab(tabParam)
    }
  }, [])

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("admin.settings.title")}</h1>
            <p className="text-muted-foreground mt-2">{t("admin.settings.subtitle")}</p>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-3 md:w-auto">
                <TabsTrigger value="settings">{t("admin.settings.tabs.settings", "Settings")}</TabsTrigger>
                <TabsTrigger value="degrees">{t("admin.settings.tabs.degrees")}</TabsTrigger>
                <TabsTrigger value="users">{t("admin.settings.tabs.users")}</TabsTrigger>
              </TabsList>

              <TabsContent value="settings" className="space-y-6">
                <SettingsTabs />
              </TabsContent>

              <TabsContent value="degrees" className="space-y-6">
                <DegreesSettings />
              </TabsContent>

              <TabsContent value="users" className="space-y-6">
                <UsersSettings />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
