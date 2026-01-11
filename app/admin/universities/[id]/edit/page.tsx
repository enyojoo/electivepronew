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
import { ArrowLeft, X, Plus } from "lucide-react"
import Link from "next/link"
import { useLanguage } from "@/lib/language-context"
import { Badge } from "@/components/ui/badge"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

// University status options
const statusOptions = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "draft", label: "Draft" },
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
  university_languages: string[] | null
  university_programs: string[] | null
  description?: string
  description_ru?: string | null
}

interface Country {
  id: string
  code: string
  name: string
  name_ru: string | null
  created_at: string
}

export default function EditUniversityPage() {
  const params = useParams()
  const router = useRouter()
  const { t, language } = useLanguage()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const supabase = getSupabaseBrowserClient()
  const [countries, setCountries] = useState<Country[]>([])
  const [university, setUniversity] = useState<University | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    name_ru: "",
    description: "",
    description_ru: "",
    city: "",
    city_ru: "",
    country: "",
    website: "",
    status: "active",
    max_students: 5,
    university_languages: [] as string[],
    university_programs: [] as string[],
  })
  const [customLanguage, setCustomLanguage] = useState("")
  const [customProgram, setCustomProgram] = useState("")

  // Fetch countries from Supabase
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const { data, error } = await supabase.from("countries").select("*").order("name", { ascending: true })

        if (error) {
          throw error
        }

        if (data) {
          setCountries(data)
        }
      } catch (error) {
        console.error("Error fetching countries:", error)
        toast({
          title: t("admin.newUniversity.error", "Error"),
          description: t("admin.newUniversity.errorFetchingCountries", "Failed to fetch countries"),
          variant: "destructive",
        })
      }
    }

    fetchCountries()
  }, [supabase, toast, t])

  // Fetch university data
  useEffect(() => {
    const fetchUniversity = async () => {
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
            city: data.city || "",
            city_ru: data.city_ru || "",
            country: data.country || "",
            website: data.website || "",
            status: data.status || "active",
            max_students: data.max_students || 5,
            university_languages: data.university_languages || [],
            university_programs: data.university_programs || [],
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
      }
    }

    if (params.id) {
      fetchUniversity()
    }
  }, [params.id, supabase, toast, t, router])

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

  const handleAddLanguage = () => {
    if (customLanguage && !formData.university_languages.includes(customLanguage)) {
      setFormData((prev) => ({
        ...prev,
        university_languages: [...prev.university_languages, customLanguage],
      }))
      setCustomLanguage("")
    }
  }

  const handleAddProgram = () => {
    if (customProgram && !formData.university_programs.includes(customProgram)) {
      setFormData((prev) => ({
        ...prev,
        university_programs: [...prev.university_programs, customProgram],
      }))
      setCustomProgram("")
    }
  }

  const handleRemoveLanguage = (language: string) => {
    setFormData((prev) => ({
      ...prev,
      university_languages: prev.university_languages.filter((l) => l !== language),
    }))
  }

  const handleRemoveProgram = (program: string) => {
    setFormData((prev) => ({
      ...prev,
      university_programs: prev.university_programs.filter((p) => p !== program),
    }))
  }

  const handleKeyPress = (e: React.KeyboardEvent, type: "language" | "program") => {
    if (e.key === "Enter") {
      e.preventDefault()
      if (type === "language") {
        handleAddLanguage()
      } else {
        handleAddProgram()
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (!university || !institution?.id) {
        throw new Error("University or institution not found")
      }

      const { error } = await supabase
        .from("universities")
        .update({
          name: formData.name,
          name_ru: formData.name_ru || null,
          description: formData.description || null,
          description_ru: formData.description_ru || null,
          city: formData.city,
          city_ru: formData.city_ru || null,
          country: formData.country,
          website: formData.website || null,
          status: formData.status,
          max_students: formData.max_students,
          university_languages: formData.university_languages,
          university_programs: formData.university_programs,
          updated_at: new Date().toISOString(),
        })
        .eq("id", university.id)

      if (error) {
        throw error
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
                    placeholder={t("admin.newUniversity.namePlaceholder", "Harvard University")}
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
                    placeholder={t("admin.newUniversity.namePlaceholder", "Гарвардский университет")}
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

              {/* Languages of Instruction and Available Programs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Languages of Instruction */}
                <div className="space-y-2">
                  <Label htmlFor="languages">{t("admin.newUniversity.languages", "Languages of Instruction")}</Label>

                  <div className="flex flex-wrap gap-2 mb-2">
                    {formData.university_languages.map((language) => (
                      <Badge key={language} variant="secondary" className="px-2 py-1 text-sm">
                        {language}
                        <button
                          type="button"
                          onClick={() => handleRemoveLanguage(language)}
                          className="ml-1 text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Input
                      id="languages"
                      placeholder={t("admin.newUniversity.addLanguage", "Add language")}
                      value={customLanguage}
                      onChange={(e) => setCustomLanguage(e.target.value)}
                      onKeyPress={(e) => handleKeyPress(e, "language")}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleAddLanguage}
                      disabled={!customLanguage}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Available Programs */}
                <div className="space-y-2">
                  <Label htmlFor="programs">{t("admin.newUniversity.programs", "Available Programs")}</Label>

                  <div className="flex flex-wrap gap-2 mb-2">
                    {formData.university_programs.map((program) => (
                      <Badge key={program} variant="secondary" className="px-2 py-1 text-sm">
                        {program}
                        <button
                          type="button"
                          onClick={() => handleRemoveProgram(program)}
                          className="ml-1 text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Input
                      id="programs"
                      placeholder={t("admin.newUniversity.addProgram", "Add program")}
                      value={customProgram}
                      onChange={(e) => setCustomProgram(e.target.value)}
                      onKeyPress={(e) => handleKeyPress(e, "program")}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleAddProgram}
                      disabled={!customProgram}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* City - English and Russian */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="city">{t("admin.newUniversity.cityEn", "City (English)")}</Label>
                  <Input
                    id="city"
                    name="city"
                    placeholder={t("admin.newUniversity.cityPlaceholder", "Cambridge")}
                    value={formData.city}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city_ru">{t("admin.newUniversity.cityRu", "City (Russian)")}</Label>
                  <Input
                    id="city_ru"
                    name="city_ru"
                    placeholder={t("admin.newUniversity.cityPlaceholder", "Кембридж")}
                    value={formData.city_ru}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              {/* Country and Website */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="country">{t("admin.newUniversity.country", "Country")}</Label>
                  <Select value={formData.country} onValueChange={handleCountryChange} required>
                    <SelectTrigger>
                      <SelectValue placeholder={t("admin.newUniversity.selectCountry", "Select country")} />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((country) => (
                        <SelectItem key={country.id} value={country.code}>
                          {language === "ru" && country.name_ru ? country.name_ru : country.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">{t("admin.newUniversity.website", "Website")}</Label>
                  <Input
                    id="website"
                    name="website"
                    type="url"
                    placeholder={t("admin.newUniversity.websitePlaceholder", "https://www.harvard.edu")}
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
                          {t(`admin.universities.status.${option.value}`, option.label)}
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
                  {isSubmitting
                    ? t("admin.universities.saving", "Saving...")
                    : t("admin.universities.saveChanges", "Save Changes")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
