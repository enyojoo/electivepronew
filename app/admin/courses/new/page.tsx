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
import { ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"
import { useLanguage } from "@/lib/language-context"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { useCachedDegrees } from "@/hooks/use-cached-degrees"

// Course status options
const statusOptions = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "draft", label: "Draft" },
]

export default function NewCoursePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { t, language } = useLanguage()
  // Use the cached degrees hook instead of fetching directly
  const { degrees, isLoading: isLoadingDegrees } = useCachedDegrees()

  const [course, setCourse] = useState({
    nameEn: "",
    nameRu: "",
    degreeId: "",
    instructorEn: "",
    instructorRu: "",
    descriptionEn: "",
    descriptionRu: "",
    status: "active", // Default status
    maxStudents: 30, // Default max students
  })

  // Set default degree when degrees are loaded
  useEffect(() => {
    if (degrees.length > 0 && !course.degreeId) {
      setCourse((prev) => ({
        ...prev,
        degreeId: degrees[0].id.toString(),
      }))
    }
  }, [degrees, course.degreeId])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setCourse((prev) => ({ ...prev, [name]: value }))
  }

  const handleDegreeChange = (value: string) => {
    setCourse((prev) => ({ ...prev, degreeId: value }))
  }

  const handleStatusChange = (value: string) => {
    setCourse((prev) => ({ ...prev, status: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Create the course in Supabase
      const { error } = await supabase.from("courses").insert({
        name_en: course.nameEn,
        name_ru: course.nameRu,
        degree_id: course.degreeId,
        instructor_en: course.instructorEn,
        instructor_ru: course.instructorRu,
        description_en: course.descriptionEn,
        description_ru: course.descriptionRu,
        status: course.status,
        max_students: Number.parseInt(course.maxStudents) || 30,
      })

      if (error) {
        toast({
          title: "Error creating course",
          description: error.message,
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Success",
        description: "Course created successfully",
      })

      // Redirect to courses page after successful submission
      router.push("/admin/courses")
    } catch (error: any) {
      console.error("Error creating course:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
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
          <h1 className="text-3xl font-bold tracking-tight">{t("admin.newCourse.title")}</h1>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="nameEn">{t("admin.newCourse.nameEn")}</Label>
                  <Input
                    id="nameEn"
                    name="nameEn"
                    placeholder={t("admin.newCourse.nameEnPlaceholder")}
                    value={course.nameEn}
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
                    value={course.nameRu}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="degreeId">{t("admin.newCourse.degree")}</Label>
                  <Select value={course.degreeId} onValueChange={handleDegreeChange} required>
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
                  <Select value={course.status} onValueChange={handleStatusChange} required>
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
                    value={course.maxStudents || "30"}
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
                    value={course.instructorEn}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="instructorRu">{t("admin.newCourse.instructorRu")}</Label>
                  <Input
                    id="instructorRu"
                    name="instructorRu"
                    placeholder={t("admin.newCourse.instructorRuPlaceholder")}
                    value={course.instructorRu}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="descriptionEn">{t("admin.newCourse.descriptionEn")}</Label>
                  <Textarea
                    id="descriptionEn"
                    name="descriptionEn"
                    placeholder={t("admin.newCourse.descriptionEnPlaceholder")}
                    value={course.descriptionEn}
                    onChange={handleChange}
                    rows={4}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="descriptionRu">{t("admin.newCourse.descriptionRu")}</Label>
                  <Textarea
                    id="descriptionRu"
                    name="descriptionRu"
                    placeholder={t("admin.newCourse.descriptionRuPlaceholder")}
                    value={course.descriptionRu}
                    onChange={handleChange}
                    rows={4}
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-4">
                <Button variant="outline" type="button" onClick={() => router.push("/admin/courses")}>
                  {t("admin.newCourse.cancel")}
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("admin.newCourse.creating")}
                    </>
                  ) : (
                    t("admin.newCourse.create")
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
