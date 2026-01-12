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
import { DEFAULT_LOGO_URL, DEFAULT_FAVICON_URL, DEFAULT_PRIMARY_COLOR, DEFAULT_PLATFORM_NAME } from "@/lib/constants"
import { Loader2 } from "lucide-react"
import { useBrand } from "@/lib/brand-context"
import { Skeleton } from "@/components/ui/skeleton"

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
// Use localStorage to persist custom logos/favicons across page navigations
const IMAGE_CACHE_KEY = "epro-brand-image-cache"

function getImageCache() {
  if (typeof window === "undefined") {
    return { logo: DEFAULT_LOGO_URL, favicon: DEFAULT_FAVICON_URL }
  }
  
  try {
    const cached = localStorage.getItem(IMAGE_CACHE_KEY)
    if (cached) {
      const parsed = JSON.parse(cached)
      return {
        logo: parsed.logo || DEFAULT_LOGO_URL,
        favicon: parsed.favicon || DEFAULT_FAVICON_URL,
      }
    }
  } catch {
    // Ignore errors
  }
  
  return { logo: DEFAULT_LOGO_URL, favicon: DEFAULT_FAVICON_URL }
}

function saveImageCache(logo: string, favicon: string) {
  if (typeof window === "undefined") return
  
  try {
    localStorage.setItem(IMAGE_CACHE_KEY, JSON.stringify({ logo, favicon }))
  } catch {
    // Ignore errors
  }
}

const imageCache = getImageCache()

export function BrandingSettings() {
  const { t } = useLanguage()
  const { toast } = useToast()
  const { settings, updateSettings, isLoading } = useBrand()
  const [isSaving, setIsSaving] = useState(false)
  const [isLogoUploading, setIsLogoUploading] = useState(false)
  const [isFaviconUploading, setIsFaviconUploading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_PRIMARY_COLOR)
  const [institutionName, setInstitutionName] = useState("")
  const [originalPrimaryColor, setOriginalPrimaryColor] = useState(DEFAULT_PRIMARY_COLOR)
  const [originalInstitutionName, setOriginalInstitutionName] = useState("")
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null)
  const [pendingFaviconFile, setPendingFaviconFile] = useState<File | null>(null)
  const [pendingLogoUrl, setPendingLogoUrl] = useState<string | null>(null)
  const [pendingFaviconUrl, setPendingFaviconUrl] = useState<string | null>(null)
  
  // Use refs to directly manipulate image elements without causing re-renders
  // Initialize from localStorage cache (persists across navigations)
  const logoImgRef = useRef<HTMLImageElement>(null)
  const faviconImgRef = useRef<HTMLImageElement>(null)
  const logoSrcRef = useRef<string>(imageCache.logo)
  const faviconSrcRef = useRef<string>(imageCache.favicon)

  // Ref callbacks to set src immediately when element is created (synchronous, prevents flash)
  const setLogoRef = (element: HTMLImageElement | null) => {
    logoImgRef.current = element
    if (element && logoSrcRef.current) {
      // Set src immediately from ref to prevent flash
      element.src = logoSrcRef.current
    }
  }

  const setFaviconRef = (element: HTMLImageElement | null) => {
    faviconImgRef.current = element
    if (element && faviconSrcRef.current) {
      // Set src immediately from ref to prevent flash
      element.src = faviconSrcRef.current
    }
  }

  // Check if custom branding has been established
  const hasCustomBranding = settings && !!(
    settings.name ||
    settings.primary_color ||
    settings.logo_url ||
    settings.favicon_url
  )

  // Update images immediately when settings load (synchronously, no flicker)
  // This matches the Logo component behavior - instant update, no preloading delay
  useEffect(() => {
    if (isLoading || !settings) return

    // Determine final sources - same logic as Logo component
    // If custom branding exists and we have valid custom logo/favicon, use it
    // Otherwise use defaults (only if no custom branding exists)
    const finalLogoSrc = (hasCustomBranding && isValidUrl(logoUrl))
      ? logoUrl
      : DEFAULT_LOGO_URL
    const finalFaviconSrc = (hasCustomBranding && isValidUrl(faviconUrl))
      ? faviconUrl
      : DEFAULT_FAVICON_URL

    // Update refs immediately (synchronous, prevents flash)
    // This ensures preview shows correct image instantly when navigating back
    if (logoSrcRef.current !== finalLogoSrc) {
      logoSrcRef.current = finalLogoSrc
      // Update image element if it exists
      if (logoImgRef.current) {
        logoImgRef.current.src = finalLogoSrc
        logoImgRef.current.style.display = "block"
      }
      // Save to persistent cache for next navigation
      saveImageCache(finalLogoSrc, faviconSrcRef.current)
    }

    if (faviconSrcRef.current !== finalFaviconSrc) {
      faviconSrcRef.current = finalFaviconSrc
      // Update image element if it exists
      if (faviconImgRef.current) {
        faviconImgRef.current.src = finalFaviconSrc
        faviconImgRef.current.style.display = "block"
      }
      // Save to persistent cache for next navigation
      saveImageCache(logoSrcRef.current, finalFaviconSrc)
    }
  }, [settings, isLoading, logoUrl, faviconUrl, hasCustomBranding])

  // Use ref values for rendering - show skeleton while loading, then show image
  // Refs are updated synchronously when settings load, so they'll have the correct value
  const logoSrc = isLoading || !settings 
    ? null // Show skeleton while loading
    : logoSrcRef.current // Will be custom logo or default based on branding
  const faviconSrc = isLoading || !settings
    ? null // Show skeleton while loading
    : faviconSrcRef.current // Will be custom favicon or default based on branding

  // Update state when settings are loaded
  useEffect(() => {
    if (settings) {
      // Only set URLs if they are valid, otherwise keep as null (will show default without fetching)
      const validFavicon = isValidUrl(settings.favicon_url) ? settings.favicon_url : null
      const validLogo = isValidUrl(settings.logo_url) ? settings.logo_url : null
      setFaviconUrl(validFavicon)
      setLogoUrl(validLogo)
      const color = settings.primary_color || DEFAULT_PRIMARY_COLOR
      const name = settings.name || DEFAULT_PLATFORM_NAME
      setPrimaryColor(color)
      setInstitutionName(name)
      setOriginalPrimaryColor(color)
      setOriginalInstitutionName(name)
    } else if (!isLoading) {
      // Only initialize with defaults if we're done loading and there's no settings
      setPrimaryColor(DEFAULT_PRIMARY_COLOR)
      setInstitutionName(DEFAULT_PLATFORM_NAME)
      setOriginalPrimaryColor(DEFAULT_PRIMARY_COLOR)
      setOriginalInstitutionName(DEFAULT_PLATFORM_NAME)
      setFaviconUrl(null)
      setLogoUrl(null)
    }
  }, [settings, isLoading])

  const handleCancelEdit = () => {
    setPrimaryColor(originalPrimaryColor)
    setInstitutionName(originalInstitutionName)
    setPendingLogoFile(null)
    setPendingFaviconFile(null)
    setPendingLogoUrl(null)
    setPendingFaviconUrl(null)
    setIsEditing(false)
  }

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type - check both MIME type and file extension
    const validTypes = ["image/png", "image/x-icon", "image/vnd.microsoft.icon", "image/svg+xml", "image/ico"]
    const fileExt = file.name.split(".").pop()?.toLowerCase()
    const validExtensions = ["png", "ico", "svg"]
    
    const isValidType = validTypes.includes(file.type) || (fileExt && validExtensions.includes(fileExt))
    
    if (!isValidType) {
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
      // Upload file but don't save to database yet - just store for preview
      const newFaviconUrl = await uploadFavicon(file)
      setPendingFaviconFile(file)
      setPendingFaviconUrl(newFaviconUrl)
      
      // Update preview immediately
      setFaviconUrl(newFaviconUrl)
      
      // Update ref immediately to show in preview
      faviconSrcRef.current = newFaviconUrl
      if (faviconImgRef.current) {
        faviconImgRef.current.src = newFaviconUrl
        faviconImgRef.current.style.display = "block"
      }
      saveImageCache(logoSrcRef.current, newFaviconUrl)

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

    // Validate file type - check both MIME type and file extension
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/svg+xml"]
    const fileExt = file.name.split(".").pop()?.toLowerCase()
    const validExtensions = ["jpg", "jpeg", "png", "svg"]
    
    const isValidType = validTypes.includes(file.type) || (fileExt && validExtensions.includes(fileExt))
    
    if (!isValidType) {
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
      // Upload file but don't save to database yet - just store for preview
      const newLogoUrl = await uploadLogo(file)
      setPendingLogoFile(file)
      setPendingLogoUrl(newLogoUrl)
      
      // Update preview immediately
      setLogoUrl(newLogoUrl)
      
      // Update ref immediately to show in preview
      logoSrcRef.current = newLogoUrl
      if (logoImgRef.current) {
        logoImgRef.current.src = newLogoUrl
        logoImgRef.current.style.display = "block"
      }
      saveImageCache(newLogoUrl, faviconSrcRef.current)

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
      // Prepare updates for BrandContext
      const updates: {
        name?: string
        primary_color?: string
        logo_url?: string | null
        favicon_url?: string | null
      } = {
        name: institutionName.trim() || DEFAULT_PLATFORM_NAME,
        primary_color: primaryColor.trim() || DEFAULT_PRIMARY_COLOR,
      }

      // Include logo URL if a new logo was uploaded, otherwise preserve existing
      if (pendingLogoUrl) {
        updates.logo_url = pendingLogoUrl
      } else if (settings?.logo_url !== undefined) {
        updates.logo_url = settings.logo_url
      }

      // Include favicon URL if a new favicon was uploaded, otherwise preserve existing
      if (pendingFaviconUrl) {
        updates.favicon_url = pendingFaviconUrl
      } else if (settings?.favicon_url !== undefined) {
        updates.favicon_url = settings.favicon_url
      }

      // Update settings via BrandContext (this will save to DB and apply to DOM immediately)
      await updateSettings(updates)

      // Update original values and clear pending changes
      setOriginalPrimaryColor(primaryColor)
      setOriginalInstitutionName(institutionName)
      if (pendingLogoUrl) {
        setLogoUrl(pendingLogoUrl)
        // Update ref immediately to show in preview
        logoSrcRef.current = pendingLogoUrl
        if (logoImgRef.current) {
          logoImgRef.current.src = pendingLogoUrl
          logoImgRef.current.style.display = "block"
        }
        saveImageCache(pendingLogoUrl, faviconSrcRef.current)
      }
      if (pendingFaviconUrl) {
        setFaviconUrl(pendingFaviconUrl)
        // Update ref immediately to show in preview
        faviconSrcRef.current = pendingFaviconUrl
        if (faviconImgRef.current) {
          faviconImgRef.current.src = pendingFaviconUrl
          faviconImgRef.current.style.display = "block"
        }
        saveImageCache(logoSrcRef.current, pendingFaviconUrl)
      }
      setPendingLogoFile(null)
      setPendingFaviconFile(null)
      setPendingLogoUrl(null)
      setPendingFaviconUrl(null)
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

  const handleResetDefaults = async () => {
    try {
      setIsSaving(true)
      
      // Reset all brand settings to defaults in the database
      await updateSettings({
        name: DEFAULT_PLATFORM_NAME,
        primary_color: DEFAULT_PRIMARY_COLOR,
        logo_url: null,
        favicon_url: null,
      })

      // Update local state to reflect defaults
      setPrimaryColor(DEFAULT_PRIMARY_COLOR)
      setInstitutionName(DEFAULT_PLATFORM_NAME)
      setOriginalPrimaryColor(DEFAULT_PRIMARY_COLOR)
      setOriginalInstitutionName(DEFAULT_PLATFORM_NAME)
      setLogoUrl(null)
      setFaviconUrl(null)
      setPendingLogoFile(null)
      setPendingFaviconFile(null)
      setPendingLogoUrl(null)
      setPendingFaviconUrl(null)

      toast({
        title: t("settings.toast.resetDefaults"),
        description: t("settings.toast.resetDefaultsDesc"),
      })
    } catch (error) {
      console.error("Error resetting to defaults:", error)
      toast({
        title: t("settings.toast.error"),
        description: t("settings.toast.errorDesc"),
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
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
                        // If custom image fails, only fall back to default if no custom branding
                        if (hasCustomBranding) {
                          e.currentTarget.style.display = "none"
                        } else if (e.currentTarget.src !== DEFAULT_LOGO_URL) {
                          e.currentTarget.src = DEFAULT_LOGO_URL
                          logoSrcRef.current = DEFAULT_LOGO_URL
                          saveImageCache(DEFAULT_LOGO_URL, faviconSrcRef.current)
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
                    disabled={isLogoUploading || isLoading || !isEditing}
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
                    disabled={isLogoUploading || isLoading || !isEditing}
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
                        // If custom image fails, only fall back to default if no custom branding
                        if (hasCustomBranding) {
                          e.currentTarget.style.display = "none"
                        } else if (e.currentTarget.src !== DEFAULT_FAVICON_URL) {
                          e.currentTarget.src = DEFAULT_FAVICON_URL
                          faviconSrcRef.current = DEFAULT_FAVICON_URL
                          saveImageCache(logoSrcRef.current, DEFAULT_FAVICON_URL)
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
                    disabled={isFaviconUploading || isLoading || !isEditing}
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
                    disabled={isFaviconUploading || isLoading || !isEditing}
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

          <div className="flex justify-between items-center pt-4">
            <Button
              variant="outline"
              onClick={handleResetDefaults}
              disabled={isLoading || isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("settings.branding.saving")}
                </>
              ) : (
                t("settings.branding.reset") || "Reset to Default"
              )}
            </Button>
            <div className="flex gap-2">
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
          </div>
        </CardContent>
      </Card>

    </div>
  )
}
