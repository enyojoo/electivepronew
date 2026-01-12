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
import { ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"
import { useLanguage } from "@/lib/language-context"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { useCachedDegrees } from "@/hooks/use-cached-degrees"

// Course status options
const statusOptions = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "draft", label: "Draft" },
]

interface Course {
  id: string
  name_en: string
  name_ru: string | null
  degree_id: string
  instructor_en: string
  instructor_ru: string | null
  description_en: string | null
  description_ru: string | null
  status: string
  created_at: string
  updated_at: string
  max_students: number
}

export default function EditCoursePage() {
  const params = useParams()
  const router = useRouter()
  const { t, language } = useLanguage()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const supabase = getSupabaseBrowserClient()
  // Use the cached degrees hook instead of fetching directly
  const { degrees, isLoading: isLoadingDegrees } = useCachedDegrees()

  const [course, setCourse] = useState<Course | null>(null)
  const [formData, setFormData] = useState({
    nameEn: "",
    nameRu: "",
    degreeId: "",
    instructorEn: "",
    instructorRu: "",
    descriptionEn: "",
    descriptionRu: "",
    status: "active",
    maxStudents: 30,
  })

  // Fetch course data
  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const { data, error } = await supabase
          .from("courses")
          .select("*")
          .eq("id", params.id)
          .single()

        if (error) {
          throw error
        }

        if (data) {
          setCourse(data)
          setFormData({
            nameEn: data.name_en || "",
            nameRu: data.name_ru || "",
            degreeId: data.degree_id || "",
            instructorEn: data.instructor_en || "",
            instructorRu: data.instructor_ru || "",
            descriptionEn: data.description_en || "",
            descriptionRu: data.description_ru || "",
            status: data.status || "active",
            maxStudents: data.max_students || 30,
          })
        }
      } catch (error) {
        console.error("Error fetching course:", error)
        toast({
          title: t("admin.courses.error", "Error"),
          description: t("admin.courses.errorFetching", "Failed to fetch course details"),
          variant: "destructive",
        })
        router.push("/admin/courses")
      }
    }

    if (params.id) {
      fetchCourse()
    }
  }, [params.id, supabase, toast, t, institution?.id, router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleDegreeChange = (value: string) => {
    setFormData((prev) => ({ ...prev, degreeId: value }))
  }

  const handleStatusChange = (value: string) => {
    setFormData((prev) => ({ ...prev, status: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (!course || !institution?.id) {
        throw new Error("Course or institution not found")
      }

      const { error } = await supabase
        .from("courses")
        .update({
          name_en: formData.nameEn,
          name_ru: formData.nameRu || null,
          degree_id: formData.degreeId,
          instructor_en: formData.instructorEn,
          instructor_ru: formData.instructorRu || null,
          description_en: formData.descriptionEn || null,
          description_ru: formData.descriptionRu || null,
          status: formData.status,
          max_students: Number.parseInt(formData.maxStudents) || 30,
          updated_at: new Date().toISOString(),
        })
        .eq("id", course.id)

      if (error) {
        throw error
      }

      // Clear cache to ensure fresh data is loaded
      localStorage.removeItem("admin_courses_cache")

      toast({
        title: t("admin.courses.updateSuccess", "Course Updated"),
        description: t("admin.courses.updateSuccessDesc", "Course has been updated successfully"),
      })

      router.push("/admin/courses")
    } catch (error) {
      console.error("Error updating course:", error)
      toast({
        title: t("admin.courses.error", "Error"),
        description: t("admin.courses.errorUpdating", "Failed to update course"),
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Helper function to get localized degree name
  const getLocalizedDegreeName = (degree: any) => {
    if (language === "ru" && degree.name_ru) {
      return degree.name_ru
    }
    return degree.name
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-2">
          <Link href="/admin/courses">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">{t("admin.editCourse.title", "Edit Course")}</h1>
        </div>

        <Card>
          <CardContent className="pt-6">
            {course && (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="nameEn">{t("admin.editCourse.nameEn", "Course Name (English)")}</Label>
                    <Input
                      id="nameEn"
                      name="nameEn"
                      placeholder={t("admin.editCourse.nameEnPlaceholder", "Strategic Management")}
                      value={formData.nameEn}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nameRu">{t("admin.editCourse.nameRu", "Course Name (Russian)")}</Label>
                    <Input
                      id="nameRu"
                      name="nameRu"
                      placeholder={t("admin.editCourse.nameRuPlaceholder", "Стратегический менеджмент")}
                      value={formData.nameRu}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="degreeId">{t("admin.editCourse.degree", "Degree")}</Label>
                    <Select value={formData.degreeId} onValueChange={handleDegreeChange} required>
                      <SelectTrigger>
                        <SelectValue placeholder={t("admin.editCourse.selectDegree", "Select a degree")} />
                      </SelectTrigger>
                      <SelectContent>
                        {degrees.length === 0 ? (
                          <SelectItem value="no-degrees" disabled>
                            {t("admin.editCourse.noDegrees", "No degrees available")}
                          </SelectItem>
                        ) : (
                          degrees.map((degree) => (
                            <SelectItem key={degree.id} value={degree.id.toString()}>
                              {getLocalizedDegreeName(degree)}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">{t("admin.editCourse.status", "Status")}</Label>
                    <Select value={formData.status} onValueChange={handleStatusChange} required>
                      <SelectTrigger>
                        <SelectValue placeholder={t("admin.editCourse.selectStatus", "Select status")} />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {t(`admin.courses.status.${option.value}`, option.label)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxStudents">{t("admin.editCourse.maxStudents", "Max Students")}</Label>
                    <Input
                      id="maxStudents"
                      name="maxStudents"
                      type="number"
                      min="1"
                      placeholder="30"
                      value={formData.maxStudents}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="instructorEn">
                      {t("admin.editCourse.instructorEn", "Instructor Name (English)")}
                    </Label>
                    <Input
                      id="instructorEn"
                      name="instructorEn"
                      placeholder={t("admin.editCourse.instructorEnPlaceholder", "Prof. John Smith")}
                      value={formData.instructorEn}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="instructorRu">
                      {t("admin.editCourse.instructorRu", "Instructor Name (Russian)")}
                    </Label>
                    <Input
                      id="instructorRu"
                      name="instructorRu"
                      placeholder={t("admin.editCourse.instructorRuPlaceholder", "Проф. Ив��н Смирнов")}
                      value={formData.instructorRu}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="descriptionEn">
                      {t("admin.editCourse.descriptionEn", "Description (English)")}
                    </Label>
                    <Textarea
                      id="descriptionEn"
                      name="descriptionEn"
                      placeholder={t("admin.editCourse.descriptionEnPlaceholder", "Course description in English")}
                      value={formData.descriptionEn}
                      onChange={handleChange}
                      rows={4}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="descriptionRu">
                      {t("admin.editCourse.descriptionRu", "Description (Russian)")}
                    </Label>
                    <Textarea
                      id="descriptionRu"
                      name="descriptionRu"
                      placeholder={t("admin.editCourse.descriptionRuPlaceholder", "Описание курса на русском языке")}
                      value={formData.descriptionRu}
                      onChange={handleChange}
                      rows={4}
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-4">
                  <Button variant="outline" type="button" onClick={() => router.push("/admin/courses")}>
                    {t("admin.editCourse.cancel", "Cancel")}
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t("admin.editCourse.updating", "Updating...")}
                      </>
                    ) : (
                      t("admin.editCourse.update", "Update Course")
                    )}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
