"use client"

import type React from "react"

import { useState, useEffect, useRef, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/lib/language-context"
import { useToast } from "@/hooks/use-toast"
import { uploadLogo, uploadFavicon } from "@/lib/file-utils"
import { DEFAULT_LOGO_URL, DEFAULT_FAVICON_URL, DEFAULT_PRIMARY_COLOR } from "@/lib/constants"
import { Loader2, Copy, Check } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useCachedSettings } from "@/hooks/use-cached-settings"
import { useDataCache } from "@/lib/data-cache-context"
import { Skeleton } from "@/components/ui/skeleton"

const SETTINGS_ID = "00000000-0000-0000-0000-000000000000"

// Helper function to validate if a URL is valid
const isValidUrl = (url: string | null | undefined): boolean => {
  if (!url) return false
  try {
    const parsedUrl = new URL(url)
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:"
  } catch {
    return false
  }
}

// Global image cache to persist across component remounts
const imageCache = {
  logo: DEFAULT_LOGO_URL,
  favicon: DEFAULT_FAVICON_URL,
}

// Preload default images to prevent flashing - ensure they're cached globally
if (typeof window !== "undefined") {
  // Preload and cache default images
  const preloadLogo = new Image()
  preloadLogo.src = DEFAULT_LOGO_URL
  preloadLogo.onload = () => {
    imageCache.logo = DEFAULT_LOGO_URL
  }
  
  const preloadFavicon = new Image()
  preloadFavicon.src = DEFAULT_FAVICON_URL
  preloadFavicon.onload = () => {
    imageCache.favicon = DEFAULT_FAVICON_URL
  }
}

export function BrandingSettings() {
  const { t } = useLanguage()
  const { toast } = useToast()
  const { invalidateCache, setCachedData } = useDataCache()
  const { settings, isLoading } = useCachedSettings()
  const [isSaving, setIsSaving] = useState(false)
  const [isLogoUploading, setIsLogoUploading] = useState(false)
  const [isFaviconUploading, setIsFaviconUploading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [copiedLink, setCopiedLink] = useState<string | null>(null)
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_PRIMARY_COLOR)
  const [institutionName, setInstitutionName] = useState("")
  const [originalPrimaryColor, setOriginalPrimaryColor] = useState(DEFAULT_PRIMARY_COLOR)
  const [originalInstitutionName, setOriginalInstitutionName] = useState("")
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  
  // Use refs to directly manipulate image elements without causing re-renders
  const logoImgRef = useRef<HTMLImageElement>(null)
  const faviconImgRef = useRef<HTMLImageElement>(null)
  const logoSrcRef = useRef<string>(imageCache.logo)
  const faviconSrcRef = useRef<string>(imageCache.favicon)

  // Ref callbacks to set src immediately when element is created (synchronous, prevents flash)
  const setLogoRef = (element: HTMLImageElement | null) => {
    logoImgRef.current = element
    if (element) {
      // Set src immediately from cache to prevent flash
      element.src = imageCache.logo
      logoSrcRef.current = imageCache.logo
    }
  }

  const setFaviconRef = (element: HTMLImageElement | null) => {
    faviconImgRef.current = element
    if (element) {
      // Set src immediately from cache to prevent flash
      element.src = imageCache.favicon
      faviconSrcRef.current = imageCache.favicon
    }
  }

  // Update images when settings load or URLs change (but only if different from current)
  useEffect(() => {
    const finalLogoSrc = isValidUrl(logoUrl) ? logoUrl : DEFAULT_LOGO_URL
    const finalFaviconSrc = isValidUrl(faviconUrl) ? faviconUrl : DEFAULT_FAVICON_URL
    
    // Only update if the URL actually changed
    if (logoSrcRef.current !== finalLogoSrc && logoImgRef.current) {
      // Preload the new image before switching
      const img = new Image()
      img.onload = () => {
        if (logoImgRef.current && logoSrcRef.current !== finalLogoSrc) {
          logoSrcRef.current = finalLogoSrc
          logoImgRef.current.src = finalLogoSrc
          imageCache.logo = finalLogoSrc
        }
      }
      img.onerror = () => {
        // If custom image fails, keep default
        if (logoImgRef.current && logoSrcRef.current !== DEFAULT_LOGO_URL) {
          logoSrcRef.current = DEFAULT_LOGO_URL
          logoImgRef.current.src = DEFAULT_LOGO_URL
          imageCache.logo = DEFAULT_LOGO_URL
        }
      }
      img.src = finalLogoSrc
    }
    
    if (faviconSrcRef.current !== finalFaviconSrc && faviconImgRef.current) {
      // Preload the new image before switching
      const img = new Image()
      img.onload = () => {
        if (faviconImgRef.current && faviconSrcRef.current !== finalFaviconSrc) {
          faviconSrcRef.current = finalFaviconSrc
          faviconImgRef.current.src = finalFaviconSrc
          imageCache.favicon = finalFaviconSrc
        }
      }
      img.onerror = () => {
        // If custom image fails, keep default
        if (faviconImgRef.current && faviconSrcRef.current !== DEFAULT_FAVICON_URL) {
          faviconSrcRef.current = DEFAULT_FAVICON_URL
          faviconImgRef.current.src = DEFAULT_FAVICON_URL
          imageCache.favicon = DEFAULT_FAVICON_URL
        }
      }
      img.src = finalFaviconSrc
    }
  }, [logoUrl, faviconUrl])

  // Use ref values for initial render - these won't change on re-renders
  const logoSrc = logoSrcRef.current
  const faviconSrc = faviconSrcRef.current

  // Update state when settings are loaded
  useEffect(() => {
    if (settings) {
      // Only set URLs if they are valid, otherwise keep as null (will show default without fetching)
      const validFavicon = isValidUrl(settings.favicon_url) ? settings.favicon_url : null
      const validLogo = isValidUrl(settings.logo_url) ? settings.logo_url : null
      setFaviconUrl(validFavicon)
      setLogoUrl(validLogo)
      const color = settings.primary_color || DEFAULT_PRIMARY_COLOR
      const name = settings.name || ""
      setPrimaryColor(color)
      setInstitutionName(name)
      setOriginalPrimaryColor(color)
      setOriginalInstitutionName(name)
    } else if (!isLoading) {
      // Only initialize with defaults if we're done loading and there's no settings
      setPrimaryColor(DEFAULT_PRIMARY_COLOR)
      setInstitutionName("")
      setOriginalPrimaryColor(DEFAULT_PRIMARY_COLOR)
      setOriginalInstitutionName("")
      setFaviconUrl(null)
      setLogoUrl(null)
    }
  }, [settings, isLoading])

  const handleCancelEdit = () => {
    setPrimaryColor(originalPrimaryColor)
    setInstitutionName(originalInstitutionName)
    setIsEditing(false)
  }

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes = ["image/png", "image/x-icon", "image/svg+xml"]
    if (!validTypes.includes(file.type)) {
      toast({
        title: t("settings.toast.invalidFileType"),
        description: t("settings.toast.invalidFileTypeDesc"),
        variant: "destructive",
      })
      return
    }

    // Validate file size (max 1MB)
    if (file.size > 1 * 1024 * 1024) {
      toast({
        title: t("settings.toast.fileTooLarge"),
        description: t("settings.toast.fileTooLargeDesc"),
        variant: "destructive",
      })
      return
    }

    setIsFaviconUploading(true)
    try {
      const newFaviconUrl = await uploadFavicon(file)
      setFaviconUrl(newFaviconUrl)

      // Update settings with new favicon URL
      const { error } = await supabase
        .from("settings")
        .update({ favicon_url: newFaviconUrl })
        .eq("id", SETTINGS_ID)

      if (error) {
        console.error("Error updating settings with favicon_url:", error)
        throw error
      }

      // Update cache with new settings immediately
      const updatedSettings = {
        ...settings,
        favicon_url: newFaviconUrl,
      }
      setCachedData("settings", SETTINGS_ID, updatedSettings)
      
      // Update local state immediately so it shows without refetch
      setFaviconUrl(newFaviconUrl)

      toast({
        title: t("settings.toast.faviconUploaded"),
        description: t("settings.toast.faviconUploadedDesc").replace("{0}", file.name),
      })
    } catch (error) {
      console.error("Favicon upload error:", error)
      toast({
        title: t("settings.toast.uploadError"),
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setIsFaviconUploading(false)
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/svg+xml"]
    if (!validTypes.includes(file.type)) {
      toast({
        title: t("settings.toast.invalidFileType"),
        description: t("settings.toast.invalidFileTypeDesc"),
        variant: "destructive",
      })
      return
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: t("settings.toast.fileTooLarge"),
        description: t("settings.toast.fileTooLargeDesc"),
        variant: "destructive",
      })
      return
    }

    setIsLogoUploading(true)
    try {
      const newLogoUrl = await uploadLogo(file)
      setLogoUrl(newLogoUrl)

      // Update settings with new logo URL
      const { error } = await supabase.from("settings").update({ logo_url: newLogoUrl }).eq("id", SETTINGS_ID)

      if (error) {
        console.error("Error updating settings with logo_url:", error)
        throw error
      }

      // Update cache with new settings immediately
      const updatedSettings = {
        ...settings,
        logo_url: newLogoUrl,
      }
      setCachedData("settings", SETTINGS_ID, updatedSettings)
      
      // Update local state immediately so it shows without refetch
      setLogoUrl(newLogoUrl)

      toast({
        title: t("settings.toast.logoUploaded"),
        description: t("settings.toast.logoUploadedDesc").replace("{0}", file.name),
      })
    } catch (error) {
      console.error("Logo upload error:", error)
      toast({
        title: t("settings.toast.uploadError"),
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setIsLogoUploading(false)
    }
  }

  const handleSaveChanges = async () => {
    setIsSaving(true)
    try {
      const { error } = await supabase
        .from("settings")
        .update({
          name: institutionName,
          primary_color: primaryColor,
        })
        .eq("id", SETTINGS_ID)

      if (error) {
        throw error
      }

      // Update cache with new settings immediately
      const updatedSettings = {
        ...settings,
        name: institutionName,
        primary_color: primaryColor,
      }
      setCachedData("settings", SETTINGS_ID, updatedSettings)

      // Update original values and exit edit mode
      setOriginalPrimaryColor(primaryColor)
      setOriginalInstitutionName(institutionName)
      setIsEditing(false)

      toast({
        title: t("settings.toast.changesSaved"),
        description: t("settings.toast.changesSavedDesc"),
      })
    } catch (error) {
      console.error("Error saving changes:", error)
      toast({
        title: t("settings.toast.error"),
        description: t("settings.toast.errorDesc"),
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleResetDefaults = () => {
    if (settings) {
      setPrimaryColor(settings.primary_color || DEFAULT_PRIMARY_COLOR)
      setInstitutionName(settings.name || "")
    } else {
      setPrimaryColor(DEFAULT_PRIMARY_COLOR)
      setInstitutionName("")
    }

    toast({
      title: t("settings.toast.resetDefaults"),
      description: t("settings.toast.resetDefaultsDesc"),
    })
  }

  // Get base URL for login links
  const getBaseUrl = () => {
    if (typeof window !== "undefined") {
      return `${window.location.protocol}//${window.location.host}`
    }
    return ""
  }

  const studentLoginUrl = `${getBaseUrl()}/student/login`
  const managerLoginUrl = `${getBaseUrl()}/manager/login`

  const handleCopyLink = async (url: string, linkType: "student" | "manager") => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedLink(linkType)
      toast({
        title: t("settings.toast.linkCopied"),
        description: t("settings.toast.linkCopiedDesc"),
      })
      // Reset copied state after 2 seconds
      setTimeout(() => {
        setCopiedLink(null)
      }, 2000)
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.branding.title")}</CardTitle>
          <CardDescription>{t("settings.branding.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Institution Name */}
          <div className="space-y-2">
            <Label htmlFor="institutionName">{t("settings.branding.institutionName")}</Label>
            {isLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Input
                id="institutionName"
                value={institutionName}
                onChange={(e) => setInstitutionName(e.target.value)}
                placeholder={t("settings.branding.institutionNamePlaceholder")}
                disabled={!isEditing}
              />
            )}
          </div>

          {/* Logo, Favicon, and Color in one row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Logo Upload */}
            <div className="space-y-2">
              <Label>{t("settings.branding.logo")}</Label>
              <div className="flex items-center gap-2">
                {isLoading ? (
                  <Skeleton className="h-10 w-16" />
                ) : (
                  <div className="h-10 w-16 bg-muted rounded flex items-center justify-center overflow-hidden">
                    <img
                      ref={setLogoRef}
                      src={logoSrc}
                      alt="Logo"
                      className="h-full w-full object-contain"
                      loading="eager"
                      onError={(e) => {
                        // If both custom and default fail, hide the image
                        if (logoUrl && e.currentTarget.src !== DEFAULT_LOGO_URL) {
                          e.currentTarget.src = DEFAULT_LOGO_URL
                        } else {
                          e.currentTarget.style.display = "none"
                        }
                      }}
                    />
                  </div>
                )}
                <label htmlFor="logo-upload" className="cursor-pointer">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10"
                    type="button"
                    disabled={isLogoUploading || isLoading}
                    onClick={() => document.getElementById("logo-upload")?.click()}
                  >
                    {isLogoUploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t("settings.branding.uploading")}
                      </>
                    ) : (
                      t("settings.branding.upload")
                    )}
                  </Button>
                  <input
                    id="logo-upload"
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml"
                    className="hidden"
                    onChange={handleLogoUpload}
                    disabled={isLogoUploading || isLoading}
                  />
                </label>
              </div>
            </div>

            {/* Favicon Upload */}
            <div className="space-y-2">
              <Label>{t("settings.branding.favicon")}</Label>
              <div className="flex items-center gap-2">
                {isLoading ? (
                  <Skeleton className="h-10 w-10" />
                ) : (
                  <div className="h-10 w-10 bg-muted rounded flex items-center justify-center overflow-hidden">
                    <img
                      ref={setFaviconRef}
                      src={faviconSrc}
                      alt="Favicon"
                      className="h-full w-full object-contain"
                      loading="eager"
                      onError={(e) => {
                        // If both custom and default fail, hide the image
                        if (faviconUrl && e.currentTarget.src !== DEFAULT_FAVICON_URL) {
                          e.currentTarget.src = DEFAULT_FAVICON_URL
                        } else {
                          e.currentTarget.style.display = "none"
                        }
                      }}
                    />
                  </div>
                )}
                <label htmlFor="favicon-upload" className="cursor-pointer">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10"
                    type="button"
                    disabled={isFaviconUploading || isLoading}
                    onClick={() => document.getElementById("favicon-upload")?.click()}
                  >
                    {isFaviconUploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t("settings.branding.uploading")}
                      </>
                    ) : (
                      t("settings.branding.upload")
                    )}
                  </Button>
                  <input
                    id="favicon-upload"
                    type="file"
                    accept="image/png,image/x-icon,image/svg+xml"
                    className="hidden"
                    onChange={handleFaviconUpload}
                    disabled={isFaviconUploading || isLoading}
                  />
                </label>
              </div>
            </div>

            {/* Primary Color */}
            <div className="space-y-2">
              <Label htmlFor="primaryColor">{t("settings.branding.primaryColor")}</Label>
              {isLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <div className="flex items-center gap-2">
                  <div
                    className={`h-10 w-10 rounded border ${isEditing ? "cursor-pointer" : "cursor-not-allowed opacity-60"}`}
                    style={{ backgroundColor: primaryColor }}
                    onClick={() => {
                      if (isEditing) {
                        document.getElementById("colorPickerInput")?.click()
                      }
                    }}
                  />
                  <div className="relative flex-1">
                    <Input
                      id="primaryColor"
                      type="text"
                      value={primaryColor}
                      onChange={(e) => {
                        if (!isEditing) return
                        // Validate if it's a valid hex color
                        const isValidHex = /^#([0-9A-F]{3}){1,2}$/i.test(e.target.value)
                        if (isValidHex || e.target.value.startsWith("#")) {
                          setPrimaryColor(e.target.value)
                        }
                      }}
                      disabled={!isEditing}
                    />
                    <input
                      id="colorPickerInput"
                      type="color"
                      value={primaryColor}
                      onChange={(e) => {
                        if (isEditing) {
                          setPrimaryColor(e.target.value)
                        }
                      }}
                      disabled={!isEditing}
                      className="absolute opacity-0"
                      style={{ height: 0, width: 0 }}
                      aria-label="Select color"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={handleCancelEdit} disabled={isSaving || isLoading}>
                  {t("settings.account.cancel") || "Cancel"}
                </Button>
                <Button onClick={handleSaveChanges} disabled={isSaving || isLoading}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("settings.branding.saving")}
                    </>
                  ) : (
                    t("settings.branding.save")
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

      {/* Login Links Card */}
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.branding.loginLinks")}</CardTitle>
          <CardDescription>{t("settings.branding.loginLinksDescription", "Share these login URLs with students and program managers")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Student Login URL */}
          <div className="space-y-2">
            <Label>{t("settings.branding.studentLogin")}</Label>
            <div className="flex items-center gap-2">
              <Input
                value={studentLoginUrl}
                readOnly
                className="flex-1 font-mono text-sm"
              />
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
              <Input
                value={managerLoginUrl}
                readOnly
                className="flex-1 font-mono text-sm"
              />
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
    </div>
  )
}
