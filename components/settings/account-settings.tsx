"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/lib/language-context"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import { Loader2 } from "lucide-react"
import { useDataCache } from "@/lib/data-cache-context"
import { Skeleton } from "@/components/ui/skeleton"

export function AccountSettings({ adminProfile, isLoading = false }: { adminProfile: any; isLoading?: boolean }) {
  const { t } = useLanguage()
  const { toast } = useToast()
  const { invalidateCache } = useDataCache()
  const [isUpdating, setIsUpdating] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [originalName, setOriginalName] = useState("")
  const [originalEmail, setOriginalEmail] = useState("")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  // Set form values when profile is loaded
  useEffect(() => {
    if (adminProfile) {
      const profileName = adminProfile.full_name || ""
      const profileEmail = adminProfile.email || ""
      setName(profileName)
      setEmail(profileEmail)
      setOriginalName(profileName)
      setOriginalEmail(profileEmail)
    }
  }, [adminProfile])

  const handleCancelEdit = () => {
    setName(originalName)
    setIsEditing(false)
  }

  const handleUpdateInfo = async () => {
    if (!adminProfile?.id) return

    setIsUpdating(true)
    try {
      // Update profile in database
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: name,
          // Note: Email is not editable for admin accounts
        })
        .eq("id", adminProfile.id)

      if (profileError) {
        throw profileError
      }

      // Invalidate the cache
      invalidateCache("adminProfile", adminProfile.id)

      // Update original values and exit edit mode
      setOriginalName(name)
      setOriginalEmail(email)
      setIsEditing(false)

      toast({
        title: t("settings.account.updateSuccess"),
        description: t("settings.account.updateSuccessMessage"),
      })
    } catch (error: any) {
      console.error("Error updating profile:", error)
      toast({
        title: t("settings.toast.error"),
        description: error.message || t("settings.toast.errorDesc"),
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: t("settings.account.passwordMismatch"),
        description: t("settings.account.passwordMismatchMessage"),
        variant: "destructive",
      })
      return
    }

    setIsChangingPassword(true)
    try {
      // Update password
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) {
        throw error
      }

      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")

      toast({
        title: t("settings.account.passwordChanged"),
        description: t("settings.account.passwordChangedMessage"),
      })
    } catch (error: any) {
      console.error("Error changing password:", error)
      toast({
        title: t("settings.toast.error"),
        description: error.message || t("settings.toast.errorDesc"),
        variant: "destructive",
      })
    } finally {
      setIsChangingPassword(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Admin Information */}
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.account.adminInfo")}</CardTitle>
          <CardDescription>{t("settings.account.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t("settings.account.name")}</Label>
            {isLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Input 
                id="name" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                disabled={!isEditing}
              />
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">{t("settings.account.email")}</Label>
            {isLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Input 
                id="email" 
                type="email" 
                value={email} 
                disabled={true}
                readOnly
              />
            )}
          </div>

          <div className="flex justify-end gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={handleCancelEdit} disabled={isUpdating || isLoading}>
                  {t("settings.account.cancel") || "Cancel"}
                </Button>
                <Button onClick={handleUpdateInfo} disabled={isUpdating || isLoading}>
                  {isUpdating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("settings.account.saving") || "Saving..."}
                    </>
                  ) : (
                    t("settings.account.save") || "Save"
                  )}
                </Button>
              </>
            ) : (
              <Button onClick={() => setIsEditing(true)} disabled={isLoading}>
                {t("settings.account.edit") || "Edit"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Password Change */}
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.account.password")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newPassword">{t("settings.account.newPassword")}</Label>
            {isLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{t("settings.account.confirmPassword")}</Label>
            {isLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            )}
          </div>

          <div className="flex justify-end">
            <Button onClick={handleChangePassword} disabled={isChangingPassword || isLoading}>
              {isChangingPassword ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("settings.account.changing")}
                </>
              ) : (
                t("settings.account.changePassword")
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
