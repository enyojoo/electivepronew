"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { UserRole } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, ChevronRight, Check, Search } from "lucide-react"
import Link from "next/link"
import { useLanguage } from "@/lib/language-context"
import { ModernFileUploader } from "@/components/modern-file-uploader"
import { useToast } from "@/components/ui/use-toast"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { useCachedManagerProfile } from "@/hooks/use-cached-manager-profile"

// Removed interface as we're using useParams hook

export default function ElectiveCourseEditPage() {
  const router = useRouter()
  const params = useParams()
  const { t, language } = useLanguage()
  const { toast } = useToast()
  const supabase = getSupabaseBrowserClient()
  const [userId, setUserId] = useState<string | undefined>()

  // Get user ID for manager profile
  useEffect(() => {
    const getUser = async () => {
      try {
        const { data, error } = await supabase.auth.getUser()
        if (error) {
          console.error("Error getting user:", error)
          router.push("/manager/login")
          return
        }
        if (data.user) {
          setUserId(data.user.id)
        } else {
          router.push("/manager/login")
        }
      } catch (error) {
        console.error("Error getting user:", error)
      }
    }
    getUser()
  }, [supabase, router])

  const { profile: managerProfile } = useCachedManagerProfile(userId)

  // Step state
  const [currentStep, setCurrentStep] = useState(1)
  const totalSteps = 3

  // Loading states
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingCourses, setIsLoadingCourses] = useState(false)

  // Data states
  const [courses, setCourses] = useState<any[]>([])
  const [groups, setGroups] = useState<any[]>([])
  const [semesters, setSemesters] = useState<any[]>([])
  const [electiveCourse, setElectiveCourse] = useState<any>(null)

  // Form state - matching course builder exactly
  const [formData, setFormData] = useState({
    semester: "",
    groupId: "",
    maxSelections: 2,
    endDate: "",
  })

  // Selection state
  const [selectedCourses, setSelectedCourses] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState("")

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)

        console.log("Edit page params:", params)
        console.log("Edit page params.id:", params.id)

        // Check if params.id exists
        const courseId = params.id as string
        if (!courseId || courseId === 'undefined') {
          console.error("Invalid course ID:", courseId)
          throw new Error("Invalid course ID")
        }

        // Load elective data
        console.log("Fetching data for course ID:", courseId)
        const response = await fetch(`/api/manager/electives/course/${courseId}`)
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Failed to load course program")
        }

        const electiveData = await response.json()
        console.log("Loaded elective data:", electiveData)
        console.log("Syllabus URL:", electiveData.syllabus_template_url)
        setElectiveCourse(electiveData)

        // Populate form with existing data
        setFormData({
          semester: electiveData.semester || "",
          groupId: electiveData.group_id || "",
          maxSelections: electiveData.max_selections || 2,
          endDate: electiveData.deadline ? electiveData.deadline.split('T')[0] : "",
        })

        // Load selected courses - map to IDs only
        setSelectedCourses(electiveData.courses?.map((course: any) => course.id) || [])

        // Load available courses for selection
        await loadAvailableCourses()

      } catch (error) {
        console.error("Error loading data:", error)
        toast({
          title: "Error",
          description: "Failed to load course program data",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    if (userId && params.id && (params.id as string) !== 'undefined') {
      loadData()
    }
  }, [params.id, userId])

  // Load available courses
  const loadAvailableCourses = async () => {
    try {
      setIsLoadingCourses(true)
      const { data: coursesData, error: coursesError } = await supabase
        .from("courses")
        .select(`
          id,
          name,
          name_ru,
          instructor_en,
          instructor_ru,
          degree_id,
          max_students,
          degrees(
            name,
            name_ru
          )
        `)
        .order("name")

      if (coursesError) {
        console.error("Error loading courses:", coursesError)
      } else {
        setCourses(coursesData || [])
      }
    } catch (error) {
      console.error("Error loading courses:", error)
    } finally {
      setIsLoadingCourses(false)
    }
  }

  // Load semesters and groups
  useEffect(() => {
    const loadReferenceData = async () => {
      try {
        const [semestersData, groupsData] = await Promise.all([
          import("@/actions/semesters").then(m => m.getSemesters()),
          supabase.from("groups").select("*").order("name")
        ])

        setSemesters(semestersData)
        setGroups(groupsData.data || [])
      } catch (error) {
        console.error("Error loading reference data:", error)
      }
    }

    loadReferenceData()
  }, [supabase])

  // Handle form changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  // Navigation handlers
  const handleNextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  // Toggle course selection
  const toggleCourseSelection = (courseId: string) => {
    if (selectedCourses.includes(courseId)) {
      setSelectedCourses(selectedCourses.filter(id => id !== courseId))
    } else {
      setSelectedCourses([...selectedCourses, courseId])
    }
  }

  // Generate program name
  const generateProgramName = () => {
    const selectedSemester = semesters.find((s) => s.code === formData.semester)
    const selectedYear = managerProfile?.academic_years?.find((y: any) => y.id === managerProfile?.academic_year_id)

    const semesterName = language === "ru"
      ? selectedSemester?.name_ru || (formData.semester === "fall" ? "Осенний" : "Весенний")
      : selectedSemester?.name || (formData.semester === "fall" ? "Fall" : "Spring")

    const yearValue = selectedYear?.year || ""
    const courseText = language === "ru" ? "Выбор курсов" : "Course Selection"

    return `${semesterName} ${yearValue} ${courseText}`
  }

  // File upload handler
  const handleFileUpload = async (file: File) => {
    setSelectedFile(file)
    setIsUploading(true)
    setUploadProgress(0)

    try {
      const fileExt = file.name.split(".").pop()
      const originalFileName = file.name
      const timestamp = Date.now()
      const fileName = `statement_templates/${timestamp}_${originalFileName}`

      // Simulate progress during upload (Supabase doesn't provide progress callbacks)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          const newProgress = prev + Math.random() * 20
          return newProgress > 90 ? 90 : newProgress
        })
      }, 200)

      const { error: uploadError } = await supabase.storage.from("documents").upload(fileName, file)

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from("documents").getPublicUrl(fileName)

      if (urlData) {
        setElectiveCourse((prev: any) => ({
          ...prev,
          syllabus_template_url: urlData.publicUrl,
        }))
        toast({
          title: t("manager.courseBuilder.uploadSuccess", "Upload Successful"),
          description: file.name,
        })
      }
    } catch (error) {
      console.error("Error uploading file:", error)
      toast({
        title: t("manager.courseBuilder.uploadError", "Upload Error"),
        description: t("manager.courseBuilder.uploadErrorDesc", "Failed to upload file"),
        variant: "destructive",
      })
      setSelectedFile(null)
    } finally {
      setIsUploading(false)
      // Reset progress after a short delay
      setTimeout(() => setUploadProgress(0), 1000)
    }
  }

  // Handle publish
  const handlePublish = async () => {
    try {
      const courseId = params.id as string
      const { error } = await supabase
        .from("elective_courses")
        .update({
          semester: formData.semester,
          academic_year: managerProfile?.academic_year_id,
          max_selections: formData.maxSelections,
          deadline: formData.endDate,
          courses: selectedCourses,
          status: "published",
        })
        .eq("id", courseId)

      if (error) throw error

      toast({
        title: "Success",
        description: "Course program updated successfully",
      })

      router.push(`/manager/electives/course/${courseId}`)
    } catch (error: any) {
      console.error("Error updating course:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to update course program",
        variant: "destructive",
      })
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout userRole={UserRole.PROGRAM_MANAGER}>
        <div className="space-y-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">{t("manager.courseBuilder.loading", "Loading...")}</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!electiveCourse) {
    return (
      <DashboardLayout userRole={UserRole.PROGRAM_MANAGER}>
        <div className="space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold">{t("manager.courseBuilder.notFound", "Course program not found")}</h1>
            <Button onClick={() => router.push("/manager/electives/course")} className="mt-4">
              {t("manager.courseBuilder.backToList", "Back to Course Programs")}
            </Button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  // Filter courses based on search term
  const filteredCourses = courses.filter((course) => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    const courseName = course.name || ""
    const instructor = course.instructor_en || course.instructor_ru || ""
    return (
      courseName.toLowerCase().includes(term) ||
      instructor.toLowerCase().includes(term)
    )
  })

  return (
    <DashboardLayout userRole={UserRole.PROGRAM_MANAGER}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-2">
            <Link href={`/manager/electives/course/${params.id as string}`}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {t("manager.courseBuilder.editTitle", "Edit Course Program")}
              </h1>
              <p className="text-muted-foreground">
                {t("manager.courseBuilder.editSubtitle", "Modify the course program details and selections")}
              </p>
            </div>
          </div>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full ${
                  currentStep >= 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {currentStep > 1 ? <Check className="h-4 w-4" /> : "1"}
              </div>
              <div className="ml-2 hidden sm:block">
                <p className="text-sm font-medium">{t("manager.courseBuilder.programInfo", "Program Information")}</p>
              </div>
            </div>

            <div className="mx-2 h-px w-8 bg-muted" />

            <div className="flex items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full ${
                  currentStep >= 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {currentStep > 2 ? <Check className="h-4 w-4" /> : "2"}
              </div>
              <div className="ml-2 hidden sm:block">
                <p className="text-sm font-medium">{t("manager.courseBuilder.addCourses", "Select Courses")}</p>
              </div>
            </div>

            <div className="mx-2 h-px w-8 bg-muted" />

            <div className="flex items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full ${
                  currentStep >= 3 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                3
              </div>
              <div className="ml-2 hidden sm:block">
                <p className="text-sm font-medium">{t("manager.courseBuilder.programDetails", "Confirmation")}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Stepper */}
        <div className="md:hidden">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium">
              {t("manager.courseBuilder.step")} {currentStep} {t("manager.courseBuilder.of")} {totalSteps}
            </p>
            <p className="text-sm font-medium">
              {currentStep === 1 && t("manager.courseBuilder.programInfo", "Program Information")}
              {currentStep === 2 && t("manager.courseBuilder.addCourses", "Select Courses")}
              {currentStep === 3 && t("manager.courseBuilder.programDetails", "Confirmation")}
            </p>
          </div>
          <div className="w-full bg-muted h-2 rounded-full mb-6">
            <div
              className="bg-primary h-2 rounded-full"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Step 1: Program Information */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>{t("manager.courseBuilder.programInfo", "Program Information")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="semester">{t("manager.courseBuilder.semester", "Semester")}</Label>
                  {isLoading ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <Select value={formData.semester} onValueChange={(value) => handleSelectChange("semester", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("manager.courseBuilder.selectSemester", "Select a semester")} />
                      </SelectTrigger>
                      <SelectContent>
                        {semesters.length > 0 ? (
                          semesters.map((semester) => (
                            <SelectItem key={semester.id} value={semester.code}>
                              {language === "ru" && semester.name_ru ? semester.name_ru : semester.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="fall">{language === "ru" ? "Осенний" : "Fall"}</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="group">{t("manager.courseBuilder.group", "Group")}</Label>
                  {isLoading ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <Select value={formData.groupId} onValueChange={(value) => handleSelectChange("groupId", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("manager.courseBuilder.selectGroup", "Select a group")} />
                      </SelectTrigger>
                      <SelectContent>
                        {groups.length > 0 ? (
                          groups.map((group) => (
                            <SelectItem key={group.id} value={group.id}>
                              {group.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-groups" disabled>
                            {t("manager.courseBuilder.noGroupsAvailable", "No groups available")}
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-medium">{t("manager.courseBuilder.selectionRules", "Selection Rules")}</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="maxSelections">{t("manager.courseBuilder.maxSelections", "Max Selections")}</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="maxSelections"
                        name="maxSelections"
                        type="number"
                        min={1}
                        max={10}
                        value={formData.maxSelections}
                        onChange={handleChange}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {t("manager.courseBuilder.coursesPerStudent", "Maximum number of courses a student can select")}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endDate">{t("manager.courseBuilder.deadline", "Deadline")}</Label>
                    <Input id="endDate" name="endDate" type="date" value={formData.endDate} onChange={handleChange} />
                  </div>
                </div>
              </div>

              <ModernFileUploader
                title={t("manager.courseBuilder.statementUpload", "Statement Upload")}
                description={t(
                  "manager.courseBuilder.statementDescription",
                  "Upload a blank statement file that students will download, sign, and re-upload."
                )}
                selectedFile={selectedFile}
                onFileSelect={(file) => {
                  if (file) {
                    handleFileUpload(file)
                  } else {
                    setSelectedFile(null)
                  }
                }}
                isUploading={isUploading}
                uploadProgress={uploadProgress}
                accept=".pdf,.doc,.docx"
                maxSize={10}
                existingFileUrl={electiveCourse?.syllabus_template_url}
                existingFileName={(() => {
                  const url = electiveCourse?.syllabus_template_url
                  if (!url) return undefined

                  const extracted = url.split('/').pop()?.split('_').slice(1).join('_')
                  console.log("Extracted filename:", extracted, "from URL:", url)
                  return extracted
                })()}
                onDeleteExisting={() => {
                  setElectiveCourse((prev: any) => ({
                    ...prev,
                    syllabus_template_url: null,
                  }))
                }}
              />

              <div className="pt-4 flex justify-end">
                <Button type="button" onClick={handleNextStep} disabled={isLoading}>
                  {t("manager.courseBuilder.next", "Next")}
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Select Courses */}
        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>{t("manager.courseBuilder.addCourses", "Select Courses")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder={t("manager.courseBuilder.searchCourses", "Search courses...")}
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">{selectedCourses.length}</span>{" "}
                  {t("manager.courseBuilder.coursesSelected", "courses selected")}
                </div>
              </div>

              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]"></TableHead>
                      <TableHead>{t("manager.courseBuilder.courseName", "Course Name")}</TableHead>
                      <TableHead>{t("manager.courseBuilder.instructor", "Instructor")}</TableHead>
                      <TableHead>{t("manager.courseBuilder.maxStudents", "Max Students")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingCourses ? (
                      Array.from({ length: 5 }).map((_, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Skeleton className="h-4 w-4" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-12" />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : filteredCourses.length > 0 ? (
                      filteredCourses.map((course) => {
                        const courseName = language === "ru" && course.name_ru ? course.name_ru : course.name
                        const instructor = language === "ru" && course.instructor_ru ? course.instructor_ru : course.instructor_en || ""
                        return (
                          <TableRow
                            key={course.id}
                            className={`border-b hover:bg-muted/50 cursor-pointer ${
                              selectedCourses.includes(course.id) ? "bg-primary/10" : ""
                            }`}
                            onClick={() => toggleCourseSelection(course.id)}
                          >
                            <TableCell>
                              <Checkbox
                                checked={selectedCourses.includes(course.id)}
                                onChange={() => {}}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{courseName}</TableCell>
                            <TableCell>{instructor}</TableCell>
                            <TableCell>{course.max_students || 0}</TableCell>
                          </TableRow>
                        )
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          {t("manager.courseBuilder.noCoursesFound", "No courses found")}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={handlePrevStep}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {t("manager.courseBuilder.back")}
                </Button>
                <Button onClick={handleNextStep}>
                  {t("manager.courseBuilder.next")}
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Confirmation */}
        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>{t("manager.courseBuilder.programDetails", "Program Details")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Program details in a single row */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">
                    {t("manager.courseBuilder.programName", "Program Name")}
                  </h3>
                  <p className="text-lg">{generateProgramName()}</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">
                    {t("manager.courseBuilder.group", "Group")}
                  </h3>
                  <p className="text-lg">{groups.find((g) => g.id === formData.groupId)?.name || "N/A"}</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">
                    {t("manager.courseBuilder.maxSelectionsLabel", "Max Selections")}
                  </h3>
                  <p className="text-lg">{formData.maxSelections}</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">
                    {t("manager.courseBuilder.deadline", "Deadline")}
                  </h3>
                  <p className="text-lg">{formData.endDate}</p>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-medium">
                  {t("manager.courseBuilder.selectedCourses", "Selected Courses")}
                </h3>

                {selectedCourses.length > 0 ? (
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("manager.courseBuilder.courseName", "Course Name")}</TableHead>
                          <TableHead>{t("manager.courseBuilder.instructor", "Instructor")}</TableHead>
                          <TableHead>{t("manager.courseBuilder.maxStudents", "Max Students")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedCourses.map((courseId) => {
                          const course = courses.find((c) => c.id === courseId)
                          if (!course) return null

                          const courseName = language === "ru" && course.name_ru ? course.name_ru : course.name
                          const instructor = language === "ru" && course.instructor_ru ? course.instructor_ru : course.instructor_en || ""

                          return (
                            <TableRow key={course.id}>
                              <TableCell className="font-medium">{courseName}</TableCell>
                              <TableCell>{instructor}</TableCell>
                              <TableCell>{course.max_students || 0}</TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-muted-foreground">{t("manager.courseBuilder.noCoursesSelected", "No courses selected")}</p>
                )}
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={handlePrevStep}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {t("manager.courseBuilder.back")}
                </Button>
                <Button
                  onClick={handlePublish}
                  disabled={
                    !formData.semester ||
                    !formData.endDate ||
                    selectedCourses.length === 0
                  }
                >
                  {t("manager.courseBuilder.publishCourseSelection", "Publish Course Selection")}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}