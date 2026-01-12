"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { useLanguage } from "@/lib/language-context"
import { useCachedSettings } from "@/hooks/use-cached-settings"
import { useDataCache } from "@/lib/data-cache-context"
import { Skeleton } from "@/components/ui/skeleton"
import { useRouter } from "next/navigation"

// Use a constant cache key since there's only one settings row
const SETTINGS_CACHE_KEY = "settings"

export function NotificationSettings() {
  const { t } = useLanguage()
  const router = useRouter()
  const { setCachedData } = useDataCache()
  const { settings, isLoading } = useCachedSettings()
  const [isSaving, setIsSaving] = useState(false)

  // Notification settings state
  const [selectionNotifications, setSelectionNotifications] = useState(true)
  const [statusUpdateNotifications, setStatusUpdateNotifications] = useState(true)
  const [platformAnnouncements, setPlatformAnnouncements] = useState(true)
  const [userEmailNotifications, setUserEmailNotifications] = useState(true)

  // Update state when settings are loaded
  useEffect(() => {
    if (settings) {
      const selection = settings.selection_notifications ?? true
      const statusUpdate = settings.status_update_notifications ?? true
      const announcements = settings.platform_announcements ?? true
      const userEmails = settings.user_email_notifications ?? true

      setSelectionNotifications(selection)
      setStatusUpdateNotifications(statusUpdate)
      setPlatformAnnouncements(announcements)
      setUserEmailNotifications(userEmails)
    } else if (!isLoading) {
      // Defaults if no settings
      setSelectionNotifications(true)
      setStatusUpdateNotifications(true)
      setPlatformAnnouncements(true)
      setUserEmailNotifications(true)
    }
  }, [settings, isLoading])

  const handleSaveChanges = async (updateData: {
    selection_notifications?: boolean
    status_update_notifications?: boolean
    platform_announcements?: boolean
    user_email_notifications?: boolean
  }) => {
    if (isSaving) return // Prevent multiple simultaneous saves
    
    setIsSaving(true)
    try {
      // Use API route to update settings
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to save settings" }))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      // Update cache with new settings immediately
      const updatedSettings = {
        ...settings,
        ...(result.settings || updateData),
        updated_at: new Date().toISOString(),
      }
      setCachedData("settings", SETTINGS_CACHE_KEY, updatedSettings)

      // Force a refresh to update all components using the settings
      router.refresh()
    } catch (error) {
      console.error("Error saving notification settings:", error)
      // Silent fail - no toast notification
    } finally {
      setIsSaving(false)
    }
  }

  const handleSelectionNotificationsChange = (checked: boolean) => {
    setSelectionNotifications(checked)
    handleSaveChanges({ selection_notifications: checked })
  }

  const handleStatusUpdateNotificationsChange = (checked: boolean) => {
    setStatusUpdateNotifications(checked)
    handleSaveChanges({ status_update_notifications: checked })
  }

  const handlePlatformAnnouncementsChange = (checked: boolean) => {
    setPlatformAnnouncements(checked)
    handleSaveChanges({ platform_announcements: checked })
  }

  const handleUserEmailNotificationsChange = (checked: boolean) => {
    setUserEmailNotifications(checked)
    handleSaveChanges({ user_email_notifications: checked })
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("admin.settings.notifications.title", "Email Notifications")}</CardTitle>
          <CardDescription>
            {t("admin.settings.notifications.subtitle", "Manage email notification preferences")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("admin.settings.notifications.title", "Email Notifications")}</CardTitle>
        <CardDescription>
          {t("admin.settings.notifications.subtitle", "Manage email notification preferences for the platform")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="selection-notifications" className="text-base">
                {t("admin.settings.notifications.selectionNotifications", "New Selection Notifications")}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t(
                  "admin.settings.notifications.selectionNotificationsDesc",
                  "Send email notifications when students submit new course or exchange selections"
                )}
              </p>
            </div>
            <Switch
              id="selection-notifications"
              checked={selectionNotifications}
              onCheckedChange={handleSelectionNotificationsChange}
              disabled={isSaving}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="status-update-notifications" className="text-base">
                {t("admin.settings.notifications.statusUpdateNotifications", "Status Update Notifications")}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t(
                  "admin.settings.notifications.statusUpdateNotificationsDesc",
                  "Send email notifications when selection status changes (approved/rejected)"
                )}
              </p>
            </div>
            <Switch
              id="status-update-notifications"
              checked={statusUpdateNotifications}
              onCheckedChange={handleStatusUpdateNotificationsChange}
              disabled={isSaving}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="platform-announcements" className="text-base">
                {t("admin.settings.notifications.platformAnnouncements", "Platform Announcements")}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t(
                  "admin.settings.notifications.platformAnnouncementsDesc",
                  "Send platform-wide announcements and updates to all users"
                )}
              </p>
            </div>
            <Switch
              id="platform-announcements"
              checked={platformAnnouncements}
              onCheckedChange={handlePlatformAnnouncementsChange}
              disabled={isSaving}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="user-email-notifications" className="text-base">
                {t("admin.settings.notifications.userEmailNotifications", "User Email Notifications")}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t(
                  "admin.settings.notifications.userEmailNotificationsDesc",
                  "Send transactional emails to users (welcome emails, invitations, etc.)"
                )}
              </p>
            </div>
            <Switch
              id="user-email-notifications"
              checked={userEmailNotifications}
              onCheckedChange={handleUserEmailNotificationsChange}
              disabled={isSaving}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
