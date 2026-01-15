"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
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

export default function NewUniversityPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { t, language } = useLanguage()
  const { toast } = useToast()
  const supabase = getSupabaseBrowserClient()
  const [university, setUniversity] = useState({
    name: "",
    name_ru: "",
    description: "",
    description_ru: "",
    country: "",
    website: "",
    status: "active", // Default status
    max_students: 5, // Default max students
  })


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setUniversity((prev) => ({ ...prev, [name]: value }))
  }

  const handleCountryChange = (value: string) => {
    setUniversity((prev) => ({ ...prev, country: value }))
  }

  const handleStatusChange = (value: string) => {
    setUniversity((prev) => ({ ...prev, status: value }))
  }


  // Update the handleSubmit function to save to universities table
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Prepare data for universities table
      const universityData = {
        name: university.name,
        name_ru: university.name_ru || null,
        description: university.description || null,
        description_ru: university.description_ru || null,
        country: university.country,
        website: university.website || null,
        max_students: university.max_students,
        status: university.status,
      }

      // Make the API call to Supabase - save to universities table
      const { error } = await supabase.from("universities").insert(universityData)

      if (error) throw error

      // Invalidate cache to ensure fresh data on list page
      localStorage.removeItem("admin_universities_cache")

      toast({
        title: t("admin.universities.createSuccess", "Success"),
        description: t("admin.universities.createSuccessDesc", "University has been created successfully"),
      })

      // Redirect to universities page after successful submission
      router.push("/admin/universities")
    } catch (error) {
      console.error("Error creating university:", error)
      toast({
        title: t("admin.universities.error", "Error"),
        description: t("admin.universities.errorCreating", "Failed to create university"),
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
          <Link href="/admin/universities">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">{t("admin.newUniversity.title", "Add New University")}</h1>
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
                    value={university.name}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name_ru">{t("admin.newUniversity.nameRu", "University Name (Russian)")}</Label>
                  <Input
                    id="name_ru"
                    name="name_ru"
                    placeholder={t("admin.newUniversity.namePlaceholderRu")}
                    value={university.name_ru}
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
                    value={university.description}
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
                      "Краткое описание университета и деталей партнерства...",
                    )}
                    value={university.description_ru}
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
                    value={university.country}
                    onValueChange={handleCountryChange}
                    countries={getSortedCountries(language)}
                    language={language}
                    placeholder={t("admin.newUniversity.selectCountry", "Select country")}
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">{t("admin.newUniversity.website", "Website")}</Label>
                  <Input
                    id="website"
                    name="website"
                    type="url"
                    placeholder={t("admin.newUniversity.websitePlaceholder", "https://example.com")}
                    value={university.website}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              {/* Status and Max Students */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="status">{t("admin.newUniversity.status", "Status")}</Label>
                  <Select value={university.status} onValueChange={handleStatusChange} required>
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
                    value={university.max_students}
                    onChange={(e) =>
                      setUniversity((prev) => ({ ...prev, max_students: Number.parseInt(e.target.value) || 5 }))
                    }
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-4">
                <Button variant="outline" type="button" onClick={() => router.push("/admin/universities")}>
                  {t("admin.newUniversity.cancel", "Cancel")}
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("admin.newUniversity.creating", "Creating...")}
                    </>
                  ) : (
                    t("admin.newUniversity.create", "Create University")
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
