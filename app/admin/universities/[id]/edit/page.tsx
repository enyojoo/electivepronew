"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, X, Plus, Loader2 } from "lucide-react"
import Link from "next/link"
import { useLanguage } from "@/lib/language-context"
import { Badge } from "@/components/ui/badge"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { getSortedCountries, type Country } from "@/lib/countries"
import { CountrySelect } from "@/components/ui/country-select"

// University status options - will be translated in component
const statusOptions = [
  { value: "active", labelKey: "admin.universities.status.active" },
  { value: "inactive", labelKey: "admin.universities.status.inactive" },
  { value: "draft", labelKey: "admin.universities.status.draft" },
]

interface University {
  id: string
  name: string
  name_ru: string | null
  country: string
  city: string
  city_ru: string | null
  website: string | null
  status: string
  max_students: number
  created_at: string
  updated_at: string
  description?: string
  description_ru?: string | null
}

export default function EditUniversityPage() {
  const params = useParams()
  const router = useRouter()
  const { t, language } = useLanguage()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = getSupabaseBrowserClient()
  const [university, setUniversity] = useState<University | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    name_ru: "",
    description: "",
    description_ru: "",
    country: "",
    website: "",
    status: "active",
    max_students: 5,
  })

  // Countries are now static data from lib/countries.ts - no need to fetch

  // Fetch university data
  useEffect(() => {
    const fetchUniversity = async () => {
      if (!params.id) return

      setIsLoading(true)
      try {
        const { data, error } = await supabase
          .from("universities")
          .select("*")
          .eq("id", params.id)
          .single()

        if (error) {
          throw error
        }

        if (data) {
          setUniversity(data)
          setFormData({
            name: data.name || "",
            name_ru: data.name_ru || "",
            description: data.description || "",
            description_ru: data.description_ru || "",
            country: data.country || "",
            website: data.website || "",
            status: data.status || "active",
            max_students: data.max_students || 5,
          })
        }
      } catch (error) {
        console.error("Error fetching university:", error)
        toast({
          title: t("admin.universities.error", "Error"),
          description: t("admin.universities.errorFetching", "Failed to fetch university details"),
          variant: "destructive",
        })
        router.push("/admin/universities")
      } finally {
        setIsLoading(false)
      }
    }

    fetchUniversity()
  }, [params.id, supabase, toast, t, router])

  // Set up real-time subscription for instant updates
  useEffect(() => {
    if (!params.id) return

    const channel = supabase
      .channel(`university-edit-${params.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "universities",
          filter: `id=eq.${params.id}`,
        },
        async (payload) => {
          console.log("University change detected:", payload)
          // Only update if the change is not from the current user's edit
          // (to avoid updating while user is typing)
          if (payload.eventType === "UPDATE" || payload.eventType === "DELETE") {
            setIsLoading(true)
            try {
              const { data, error } = await supabase
                .from("universities")
                .select("*")
                .eq("id", params.id)
                .single()

              if (error) {
                console.error("Error refetching university after real-time update:", error)
                return
              }

              if (data) {
                setUniversity(data)
                setFormData({
                  name: data.name || "",
                  name_ru: data.name_ru || "",
                  description: data.description || "",
                  description_ru: data.description_ru || "",
                  country: data.country || "",
                  website: data.website || "",
                  status: data.status || "active",
                  max_students: data.max_students || 5,
                })
                toast({
                  title: t("admin.universities.updated", "University Updated"),
                  description: t("admin.universities.updatedDesc", "University data has been updated"),
                })
              }
            } catch (error) {
              console.error("Error in real-time update handler:", error)
            } finally {
              setIsLoading(false)
            }
          }
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log(`✓ Subscribed to university ${params.id} changes`)
        } else if (status === "CHANNEL_ERROR") {
          console.error(`✗ Error subscribing to university ${params.id} changes`)
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [params.id, supabase, toast, t])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleCountryChange = (value: string) => {
    setFormData((prev) => ({ ...prev, country: value }))
  }

  const handleStatusChange = (value: string) => {
    setFormData((prev) => ({ ...prev, status: value }))
  }


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (!university?.id) {
        throw new Error(t("admin.universities.notFound"))
      }

      const { error } = await supabase
          .from("universities")
        .update({
          name: formData.name,
          name_ru: formData.name_ru || null,
          description: formData.description || null,
          description_ru: formData.description_ru || null,
          country: formData.country,
          website: formData.website || null,
          status: formData.status,
          max_students: formData.max_students,
        })
        .eq("id", university.id)

      if (error) {
        throw error
      }

      // Invalidate cache to ensure fresh data on list page
      localStorage.removeItem("admin_universities_cache")
      // Also invalidate the specific university cache if it exists
      if (typeof window !== "undefined") {
        const universityCacheKey = `university-${university.id}`
        localStorage.removeItem(universityCacheKey)
      }

      toast({
        title: t("admin.universities.updateSuccess", "University Updated"),
        description: t("admin.universities.updateSuccessDesc", "University has been updated successfully"),
      })

      router.push(`/admin/universities/${university.id}`)
    } catch (error) {
      console.error("Error updating university:", error)
      toast({
        title: t("admin.universities.error", "Error"),
        description: t("admin.universities.errorUpdating", "Failed to update university"),
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-2">
          <Link href={`/admin/universities/${params.id}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("admin.universities.editUniversity", "Edit University")}
          </h1>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name - English and Russian */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">{t("admin.newUniversity.nameEn", "University Name (English)")}</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder={t("admin.newUniversity.namePlaceholder", "Enter university name")}
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name_ru">{t("admin.newUniversity.nameRu", "University Name (Russian)")}</Label>
                  <Input
                    id="name_ru"
                    name="name_ru"
                    placeholder={language === "en" ? "Enter university name (Russian)" : "Введите название университета"}
                    value={formData.name_ru}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              {/* Description - English and Russian */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="description">{t("admin.newUniversity.descriptionEn", "Description (English)")}</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder={t(
                      "admin.newUniversity.descriptionPlaceholder",
                      "Brief description of the university and partnership details...",
                    )}
                    value={formData.description}
                    onChange={handleChange}
                    rows={4}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description_ru">
                    {t("admin.newUniversity.descriptionRu", "Description (Russian)")}
                  </Label>
                  <Textarea
                    id="description_ru"
                    name="description_ru"
                    placeholder={t(
                      "admin.newUniversity.descriptionPlaceholder",
                      "Краткое описание университета и деталей партнерст��а...",
                    )}
                    value={formData.description_ru}
                    onChange={handleChange}
                    rows={4}
                    required
                  />
                </div>
              </div>

              {/* Country and Website */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="country">{t("admin.newUniversity.country", "Country")}</Label>
                  <CountrySelect
                    value={formData.country}
                    onValueChange={handleCountryChange}
                    countries={getSortedCountries(language)}
                    language={language}
                    placeholder={t("admin.newUniversity.selectCountry", "Select country")}
                    required
                    disabled={isLoading || isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">{t("admin.newUniversity.website", "Website")}</Label>
                  <Input
                    id="website"
                    name="website"
                    type="url"
                    placeholder={t("admin.newUniversity.websitePlaceholder", "https://example.com")}
                    value={formData.website}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              {/* Status and Max Students */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="status">{t("admin.newUniversity.status", "Status")}</Label>
                  <Select value={formData.status} onValueChange={handleStatusChange} required>
                    <SelectTrigger>
                      <SelectValue placeholder={t("admin.newUniversity.selectStatus", "Select status")} />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {t(`admin.universities.status.${option.value}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_students">{t("admin.newUniversity.maxStudents", "Max Students")}</Label>
                  <Input
                    id="max_students"
                    name="max_students"
                    type="number"
                    min="1"
                    placeholder="5"
                    value={formData.max_students}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, max_students: Number.parseInt(e.target.value) || 5 }))
                    }
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-4">
                <Button variant="outline" type="button" onClick={() => router.push(`/admin/universities/${params.id}`)}>
                  {t("admin.newUniversity.cancel", "Cancel")}
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("admin.universities.saving", "Saving...")}
                    </>
                  ) : (
                    t("admin.universities.saveChanges", "Save Changes")
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
