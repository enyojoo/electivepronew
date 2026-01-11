"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { BrandingSettings } from "@/components/settings/branding-settings"
import { AccountSettings } from "@/components/settings/account-settings"
import { DegreesSettings } from "@/components/settings/degrees-settings"
import { useLanguage } from "@/lib/language-context"
import { Card, CardContent } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { useCachedAdminProfile } from "@/hooks/use-cached-admin-profile"
import { UsersSettings } from "@/components/settings/users-settings"

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("branding")
  const { t } = useLanguage()
  const { toast } = useToast()
  const [userId, setUserId] = useState<string | undefined>(undefined)

  // Get current user ID
  useEffect(() => {
    async function getCurrentUserId() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (user) {
          setUserId(user.id)
        }
      } catch (error) {
        console.error("Error getting current user:", error)
      }
    }

    getCurrentUserId()

    // Check for tab parameter in URL
    const urlParams = new URLSearchParams(window.location.search)
    const tabParam = urlParams.get("tab")
    if (tabParam && ["branding", "account", "degrees", "users"].includes(tabParam)) {
      setActiveTab(tabParam)
    }
  }, [])

  // Use the cached admin profile
  const { profile: adminProfile, isLoading: isLoadingProfile } = useCachedAdminProfile(userId)

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
              <TabsList className="grid w-full grid-cols-4 md:w-auto">
                <TabsTrigger value="branding">{t("admin.settings.tabs.branding")}</TabsTrigger>
                <TabsTrigger value="account">{t("admin.settings.tabs.account")}</TabsTrigger>
                <TabsTrigger value="degrees">{t("admin.settings.tabs.degrees")}</TabsTrigger>
                <TabsTrigger value="users">Users</TabsTrigger>
              </TabsList>

              <TabsContent value="branding" className="space-y-6">
                <BrandingSettings />
              </TabsContent>

              <TabsContent value="account" className="space-y-6">
                <AccountSettings adminProfile={adminProfile} isLoading={isLoadingProfile} />
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
