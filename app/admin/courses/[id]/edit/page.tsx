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
  name: string
  name_ru: string | null
  degree_id: string | null
  instructor_en: string | null
  instructor_ru: string | null
  description: string | null
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
  const { degrees, isLoading: isLoadingDegrees } = useCachedDegrees()

  const [course, setCourse] = useState<Course | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    nameRu: "",
    degreeId: "",
    instructorEn: "",
    instructorRu: "",
    description: "",
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
            name: data.name || "",
            nameRu: data.name_ru || "",
            degreeId: data.degree_id || "",
            instructorEn: data.instructor_en || "",
            instructorRu: data.instructor_ru || "",
            description: data.description || "",
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
  }, [params.id, supabase, toast, t, router])

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

  // Helper function to get localized degree name
  const getLocalizedDegreeName = (degree: any) => {
    if (language === "ru" && degree.name_ru) {
      return degree.name_ru
    }
    return degree.name
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (!course) {
        throw new Error("Course not found")
      }

      const { error } = await supabase
        .from("courses")
        .update({
          name: formData.name,
          name_ru: formData.nameRu || null,
          degree_id: formData.degreeId || null,
          instructor_en: formData.instructorEn || null,
          instructor_ru: formData.instructorRu || null,
          description: formData.description || null,
          description_ru: formData.descriptionRu || null,
          status: formData.status,
          max_students: Number.parseInt(formData.maxStudents.toString()) || 30,
        })
        .eq("id", course.id)

      if (error) {
        throw error
      }

      // Clear cache to ensure fresh data is loaded
      localStorage.removeItem("admin_courses_cache")
      localStorage.removeItem("admin_dashboard_stats_cache")

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
                    <Label htmlFor="name">{t("admin.newCourse.nameEn")}</Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder={t("admin.newCourse.nameEnPlaceholder")}
                      value={formData.name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nameRu">{t("admin.newCourse.nameRu")}</Label>
                    <Input
                      id="nameRu"
                      name="nameRu"
                      placeholder={t("admin.newCourse.nameRuPlaceholder")}
                      value={formData.nameRu}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="degreeId">{t("admin.newCourse.degree")}</Label>
                    <Select value={formData.degreeId} onValueChange={handleDegreeChange} required>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={isLoadingDegrees ? t("admin.courses.loading") : t("admin.newCourse.selectDegree")}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {degrees.length === 0 ? (
                          <SelectItem value="no-degrees" disabled>
                            {t("admin.newCourse.noDegrees")}
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
                    <Label htmlFor="status">{t("admin.newCourse.status")}</Label>
                    <Select value={formData.status} onValueChange={handleStatusChange} required>
                      <SelectTrigger>
                        <SelectValue placeholder={t("admin.newCourse.selectStatus")} />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {t(`admin.courses.${option.value}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxStudents">{t("admin.newCourse.maxStudents", "Max Students")}</Label>
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
                    <Label htmlFor="instructorEn">{t("admin.newCourse.instructorEn")}</Label>
                    <Input
                      id="instructorEn"
                      name="instructorEn"
                      placeholder={t("admin.newCourse.instructorEnPlaceholder")}
                      value={formData.instructorEn}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="instructorRu">{t("admin.newCourse.instructorRu")}</Label>
                    <Input
                      id="instructorRu"
                      name="instructorRu"
                      placeholder={t("admin.newCourse.instructorRuPlaceholder")}
                      value={formData.instructorRu}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="description">{t("admin.newCourse.descriptionEn")}</Label>
                    <Textarea
                      id="description"
                      name="description"
                      placeholder={t("admin.newCourse.descriptionEnPlaceholder")}
                      value={formData.description}
                      onChange={handleChange}
                      rows={4}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="descriptionRu">{t("admin.newCourse.descriptionRu")}</Label>
                    <Textarea
                      id="descriptionRu"
                      name="descriptionRu"
                      placeholder={t("admin.newCourse.descriptionRuPlaceholder")}
                      value={formData.descriptionRu}
                      onChange={handleChange}
                      rows={4}
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
