"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { useLanguage } from "@/lib/language-context"
import { useToast } from "@/hooks/use-toast"
import { useCachedSettings } from "@/hooks/use-cached-settings"
import { useDataCache } from "@/lib/data-cache-context"
import { Skeleton } from "@/components/ui/skeleton"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

const SETTINGS_ID = "00000000-0000-0000-0000-000000000000"

export function NotificationSettings() {
  const { t } = useLanguage()
  const { toast } = useToast()
  const router = useRouter()
  const { setCachedData } = useDataCache()
  const { settings, isLoading } = useCachedSettings()
  const [isSaving, setIsSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  // Notification settings state
  const [selectionNotifications, setSelectionNotifications] = useState(true)
  const [statusUpdateNotifications, setStatusUpdateNotifications] = useState(true)
  const [platformAnnouncements, setPlatformAnnouncements] = useState(true)
  const [userEmailNotifications, setUserEmailNotifications] = useState(true)

  // Original values for cancel
  const [originalSelectionNotifications, setOriginalSelectionNotifications] = useState(true)
  const [originalStatusUpdateNotifications, setOriginalStatusUpdateNotifications] = useState(true)
  const [originalPlatformAnnouncements, setOriginalPlatformAnnouncements] = useState(true)
  const [originalUserEmailNotifications, setOriginalUserEmailNotifications] = useState(true)

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

      setOriginalSelectionNotifications(selection)
      setOriginalStatusUpdateNotifications(statusUpdate)
      setOriginalPlatformAnnouncements(announcements)
      setOriginalUserEmailNotifications(userEmails)
    } else if (!isLoading) {
      // Defaults if no settings
      setSelectionNotifications(true)
      setStatusUpdateNotifications(true)
      setPlatformAnnouncements(true)
      setUserEmailNotifications(true)
    }
  }, [settings, isLoading])

  const handleCancelEdit = () => {
    setSelectionNotifications(originalSelectionNotifications)
    setStatusUpdateNotifications(originalStatusUpdateNotifications)
    setPlatformAnnouncements(originalPlatformAnnouncements)
    setUserEmailNotifications(originalUserEmailNotifications)
    setIsEditing(false)
  }

  const handleSaveChanges = async () => {
    setIsSaving(true)
    try {
      const updateData = {
        selection_notifications: selectionNotifications,
        status_update_notifications: statusUpdateNotifications,
        platform_announcements: platformAnnouncements,
        user_email_notifications: userEmailNotifications,
      }

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
      setCachedData("settings", SETTINGS_ID, updatedSettings)

      // Update original values and exit edit mode
      setOriginalSelectionNotifications(selectionNotifications)
      setOriginalStatusUpdateNotifications(statusUpdateNotifications)
      setOriginalPlatformAnnouncements(platformAnnouncements)
      setOriginalUserEmailNotifications(userEmailNotifications)
      setIsEditing(false)

      // Force a refresh to update all components using the settings
      router.refresh()

      toast({
        title: t("settings.toast.changesSaved"),
        description: t("settings.toast.changesSavedDesc"),
      })
    } catch (error) {
      console.error("Error saving notification settings:", error)
      toast({
        title: t("settings.toast.error"),
        description: error instanceof Error ? error.message : t("settings.toast.errorDesc"),
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t("admin.settings.notifications.title", "Email Notifications")}</CardTitle>
            <CardDescription>
              {t("admin.settings.notifications.subtitle", "Manage email notification preferences for the platform")}
            </CardDescription>
          </div>
          {!isEditing && (
            <Button onClick={() => setIsEditing(true)} variant="outline">
              {t("settings.branding.edit", "Edit")}
            </Button>
          )}
        </div>
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
              onCheckedChange={setSelectionNotifications}
              disabled={!isEditing || isSaving}
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
              onCheckedChange={setStatusUpdateNotifications}
              disabled={!isEditing || isSaving}
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
              onCheckedChange={setPlatformAnnouncements}
              disabled={!isEditing || isSaving}
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
              onCheckedChange={setUserEmailNotifications}
              disabled={!isEditing || isSaving}
            />
          </div>

          {isEditing && (
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={handleCancelEdit} disabled={isSaving}>
                {t("settings.account.cancel", "Cancel")}
              </Button>
              <Button onClick={handleSaveChanges} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("settings.branding.saving", "Saving...")}
                  </>
                ) : (
                  t("settings.branding.save", "Save Changes")
                )}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
