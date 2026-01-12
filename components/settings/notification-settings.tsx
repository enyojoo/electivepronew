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
import { getSupabaseBrowserClient } from "@/lib/supabase"

// Use a constant cache key since there's only one settings row
const SETTINGS_CACHE_KEY = "settings"

export function NotificationSettings() {
  const { t } = useLanguage()
  const router = useRouter()
  const { setCachedData } = useDataCache()
  const { settings, isLoading } = useCachedSettings()
  const [isSaving, setIsSaving] = useState(false)
  const supabase = getSupabaseBrowserClient()

  // Notification settings state - default to false (off) in UI
  const [selectionNotifications, setSelectionNotifications] = useState(false)
  const [statusUpdateNotifications, setStatusUpdateNotifications] = useState(false)
  const [platformAnnouncements, setPlatformAnnouncements] = useState(false)
  const [userEmailNotifications, setUserEmailNotifications] = useState(false)

  // Update state when settings are loaded
  useEffect(() => {
    if (settings) {
      // Use database values if they exist, otherwise default to false (off)
      const selection = settings.selection_notifications ?? false
      const statusUpdate = settings.status_update_notifications ?? false
      const announcements = settings.platform_announcements ?? false
      const userEmails = settings.user_email_notifications ?? false

      setSelectionNotifications(selection)
      setStatusUpdateNotifications(statusUpdate)
      setPlatformAnnouncements(announcements)
      setUserEmailNotifications(userEmails)
    } else if (!isLoading) {
      // Defaults if no settings - all off
      setSelectionNotifications(false)
      setStatusUpdateNotifications(false)
      setPlatformAnnouncements(false)
      setUserEmailNotifications(false)
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
      // First, get existing settings to preserve values and get the ID
      const { data: existingSettings } = await supabase
        .from("settings")
        .select("*")
        .limit(1)
        .maybeSingle()

      // Get existing ID or generate new UUID for creating
      let settingsId: string
      if (existingSettings?.id) {
        settingsId = existingSettings.id
      } else {
        // Generate a new UUID for the settings row
        settingsId = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0
          const v = c === "x" ? r : (r & 0x3) | 0x8
          return v.toString(16)
        })
      }

      // Prepare upsert data - always include required NOT NULL fields
      const upsertData: {
        id: string
        name: string
        primary_color: string
        selection_notifications?: boolean
        status_update_notifications?: boolean
        platform_announcements?: boolean
        user_email_notifications?: boolean
        updated_at: string
      } = {
        id: settingsId,
        // Use existing values or defaults for required fields
        name: existingSettings?.name || "ElectivePRO",
        primary_color: existingSettings?.primary_color || "#027659",
        updated_at: new Date().toISOString(),
      }

      // Include the notification settings being updated
      if (updateData.selection_notifications !== undefined) {
        upsertData.selection_notifications = updateData.selection_notifications
      } else if (existingSettings?.selection_notifications !== undefined) {
        upsertData.selection_notifications = existingSettings.selection_notifications
      }

      if (updateData.status_update_notifications !== undefined) {
        upsertData.status_update_notifications = updateData.status_update_notifications
      } else if (existingSettings?.status_update_notifications !== undefined) {
        upsertData.status_update_notifications = existingSettings.status_update_notifications
      }

      if (updateData.platform_announcements !== undefined) {
        upsertData.platform_announcements = updateData.platform_announcements
      } else if (existingSettings?.platform_announcements !== undefined) {
        upsertData.platform_announcements = existingSettings.platform_announcements
      }

      if (updateData.user_email_notifications !== undefined) {
        upsertData.user_email_notifications = updateData.user_email_notifications
      } else if (existingSettings?.user_email_notifications !== undefined) {
        upsertData.user_email_notifications = existingSettings.user_email_notifications
      }

      // Use upsert to create or update settings
      const { data, error } = await supabase
        .from("settings")
        .upsert(upsertData, { onConflict: "id" })
        .select()
        .single()

      if (error) {
        console.error("Error saving notification settings:", error)
        // Silent fail - no toast notification
        return
      }

      // Update cache with new settings immediately
      const updatedSettings = {
        ...settings,
        ...(data || updateData),
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
