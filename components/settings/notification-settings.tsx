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

      // Set all notification fields explicitly to avoid database defaults
      // When inserting, we need to set all fields to false by default, except the one being updated
      // When updating, we only include the field being changed
      if (!existingSettings?.id) {
        // For INSERT: Set all fields to false by default, then override with the one being updated
        upsertData.selection_notifications = false
        upsertData.status_update_notifications = false
        upsertData.platform_announcements = false
        upsertData.user_email_notifications = false
      }
      
      // Override with the specific field being updated (works for both INSERT and UPDATE)
      if (updateData.selection_notifications !== undefined) {
        upsertData.selection_notifications = Boolean(updateData.selection_notifications)
      }

      if (updateData.status_update_notifications !== undefined) {
        upsertData.status_update_notifications = Boolean(updateData.status_update_notifications)
      }

      if (updateData.platform_announcements !== undefined) {
        upsertData.platform_announcements = Boolean(updateData.platform_announcements)
      }

      if (updateData.user_email_notifications !== undefined) {
        upsertData.user_email_notifications = Boolean(updateData.user_email_notifications)
      }

      // Validate that we have at least one notification field to update
      const hasNotificationField = 
        updateData.selection_notifications !== undefined ||
        updateData.status_update_notifications !== undefined ||
        updateData.platform_announcements !== undefined ||
        updateData.user_email_notifications !== undefined

      if (!hasNotificationField) {
        console.error("No notification field to update")
        setIsSaving(false)
        return
      }

      // If row exists, use UPDATE (more efficient and avoids INSERT issues)
      // If row doesn't exist, use INSERT with all required fields
      let data, error
      if (existingSettings?.id) {
        // Row exists - use UPDATE with only the fields being changed
        const updatePayload: any = {
          updated_at: new Date().toISOString(),
        }
        
        if (updateData.selection_notifications !== undefined) {
          updatePayload.selection_notifications = Boolean(updateData.selection_notifications)
        }
        if (updateData.status_update_notifications !== undefined) {
          updatePayload.status_update_notifications = Boolean(updateData.status_update_notifications)
        }
        if (updateData.platform_announcements !== undefined) {
          updatePayload.platform_announcements = Boolean(updateData.platform_announcements)
        }
        if (updateData.user_email_notifications !== undefined) {
          updatePayload.user_email_notifications = Boolean(updateData.user_email_notifications)
        }

        const result = await supabase
          .from("settings")
          .update(updatePayload)
          .eq("id", settingsId)
          .select()
          .single()
        
        data = result.data
        error = result.error
      } else {
        // Row doesn't exist - use INSERT with all required fields
        const insertResult = await supabase
          .from("settings")
          .insert(upsertData)
          .select()
          .single()
        
        data = insertResult.data
        error = insertResult.error
      }

      if (error) {
        console.error("Error saving notification settings:", {
          error,
          errorCode: error.code,
          errorMessage: error.message,
          errorDetails: error.details,
          upsertData,
        })
        // Silent fail - no toast notification
        setIsSaving(false)
        return
      }

      // Update cache with new settings immediately
      // Only update the specific field that was changed, preserve others
      const updatedSettings = {
        ...settings,
        ...updateData, // Only the field being updated
        updated_at: new Date().toISOString(),
      }
      setCachedData("settings", SETTINGS_CACHE_KEY, updatedSettings)
      
      // Update local state immediately for the changed field only
      if (updateData.selection_notifications !== undefined) {
        setSelectionNotifications(updateData.selection_notifications)
      }
      if (updateData.status_update_notifications !== undefined) {
        setStatusUpdateNotifications(updateData.status_update_notifications)
      }
      if (updateData.platform_announcements !== undefined) {
        setPlatformAnnouncements(updateData.platform_announcements)
      }
      if (updateData.user_email_notifications !== undefined) {
        setUserEmailNotifications(updateData.user_email_notifications)
      }

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
