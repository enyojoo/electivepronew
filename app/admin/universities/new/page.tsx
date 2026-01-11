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

interface Country {
  id: string
  code: string
  name: string
  name_ru: string | null
  created_at: string
}

export default function NewUniversityPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { t, language } = useLanguage()
  const { toast } = useToast()
  const supabase = getSupabaseBrowserClient()
  const [countries, setCountries] = useState<Country[]>([])
  const [university, setUniversity] = useState({
    name: "",
    name_ru: "",
    description: "",
    description_ru: "",
    city: "",
    city_ru: "",
    country: "",
    website: "",
    status: "active", // Default status
    max_students: 5, // Default max students
  })

  // State for languages and programs
  const [languages, setLanguages] = useState<string[]>([])
  const [programs, setPrograms] = useState<string[]>([])
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

  const handleAddLanguage = () => {
    if (customLanguage && !languages.includes(customLanguage)) {
      setLanguages([...languages, customLanguage])
      setCustomLanguage("")
    }
  }

  const handleAddProgram = () => {
    if (customProgram && !programs.includes(customProgram)) {
      setPrograms([...programs, customProgram])
      setCustomProgram("")
    }
  }

  const handleRemoveLanguage = (language: string) => {
    setLanguages(languages.filter((l) => l !== language))
  }

  const handleRemoveProgram = (program: string) => {
    setPrograms(programs.filter((p) => p !== program))
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

  // Update the handleSubmit function to properly format the data for Supabase
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Prepare data with languages and programs
      const universityData = {
        ...university,
        university_languages: languages,
        university_programs: programs,
      }

      // Make the API call to Supabase
      const { error } = await supabase.from("universities").insert([universityData])

      if (error) throw error

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
                    placeholder={t("admin.newUniversity.namePlaceholder", "Harvard University")}
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
                    placeholder={t("admin.newUniversity.namePlaceholder", "Гарвардский университет")}
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

              {/* Languages of Instruction and Available Programs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Languages of Instruction */}
                <div className="space-y-2">
                  <Label htmlFor="languages">{t("admin.newUniversity.languages", "Languages of Instruction")}</Label>

                  <div className="flex flex-wrap gap-2 mb-2">
                    {languages.map((language) => (
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
                    {programs.map((program) => (
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
                    value={university.city}
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
                    value={university.city_ru}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              {/* Country and Website */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="country">{t("admin.newUniversity.country", "Country")}</Label>
                  <Select value={university.country} onValueChange={handleCountryChange} required>
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
                  {isSubmitting
                    ? t("admin.newUniversity.creating", "Creating...")
                    : t("admin.newUniversity.create", "Create University")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
