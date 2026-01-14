"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { UserRole, ElectivePackStatus } from "@/lib/types"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, ArrowRight, Calendar, Check, ChevronRight, Info, Search } from "lucide-react"
import Link from "next/link"
import { useLanguage } from "@/lib/language-context"
import { ModernFileUploader } from "@/components/modern-file-uploader"
import { useToast } from "@/components/ui/use-toast"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { useCachedManagerProfile } from "@/hooks/use-cached-manager-profile"
import { getYears, type Year } from "@/actions/years"

interface ElectiveCourseEditPageProps {
  params: {
    id: string
  }
}

export default function ElectiveCourseEditPage({ params }: ElectiveCourseEditPageProps) {
  const router = useRouter()
  const { t } = useLanguage()
  const [currentStep, setCurrentStep] = useState(1)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCourses, setSelectedCourses] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  // Form state
  const [packDetails, setPackDetails] = useState({
    semester: "",
    maxSelections: 2,
    endDate: "",
    status: ElectivePackStatus.DRAFT,
  })

  const supabase = getSupabaseBrowserClient()
  const [availableCourses, setAvailableCourses] = useState<any[]>([])
  const [electiveCourse, setElectiveCourse] = useState<any>(null)
  const [userId, setUserId] = useState<string | undefined>()
  const [years, setYears] = useState<Year[]>([])
  const { profile: managerProfile } = useCachedManagerProfile(userId)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  // Mock available courses data (REMOVED - now using real data)
  const mockAvailableCourses = [
    {
      id: "1",
      name: "Business Ethics",
      description: "Explore ethical principles and moral challenges in business decision-making.",
      maxStudents: 30,
      teacher: "Dr. Anna Ivanova",
      academicYear: 2,
      degree: "Bachelor",
      programs: ["Management", "International Management"],
    },
    {
      id: "2",
      name: "Digital Marketing",
      description: "Learn modern digital marketing strategies and tools for business growth.",
      maxStudents: 25,
      teacher: "Prof. Mikhail Petrov",
      academicYear: 2,
      degree: "Bachelor",
      programs: ["Management", "International Management"],
    },
    {
      id: "3",
      name: "Sustainable Business",
      description: "Study sustainable business practices and their impact on the environment and society.",
      maxStudents: 35,
      teacher: "Dr. Elena Smirnova",
      academicYear: 2,
      degree: "Bachelor",
      programs: ["Management", "International Management", "Public Administration"],
    },
    {
      id: "4",
      name: "Project Management",
      description: "Master the principles and methodologies of effective project management.",
      maxStudents: 30,
      teacher: "Prof. Sergei Kuznetsov",
      academicYear: 2,
      degree: "Bachelor",
      programs: ["Management", "International Management", "Public Administration"],
    },
    {
      id: "5",
      name: "International Business Law",
      description: "Understand legal frameworks governing international business operations.",
      maxStudents: 25,
      teacher: "Dr. Olga Volkova",
      academicYear: 2,
      degree: "Bachelor",
      programs: ["International Management"],
    },
    {
      id: "6",
      name: "Financial Markets",
      description: "Analyze financial markets, instruments, and investment strategies.",
      maxStudents: 30,
      teacher: "Prof. Dmitry Sokolov",
      academicYear: 2,
      degree: "Bachelor",
      programs: ["Management", "International Management"],
    },
    {
      id: "7",
      name: "Strategic Management",
      description: "Develop strategic thinking and decision-making skills for business leadership.",
      maxStudents: 30,
      teacher: "Prof. Natalia Volkova",
      academicYear: 3,
      degree: "Bachelor",
      programs: ["Management", "International Management"],
    },
    {
      id: "8",
      name: "Data Analytics for Business",
      description: "Learn to analyze and interpret data for business decision-making.",
      maxStudents: 25,
      teacher: "Dr. Ivan Petrov",
      academicYear: 3,
      degree: "Bachelor",
      programs: ["Management", "International Management"],
    },
  ]

  // Filter courses based on search query
  const filteredCourses = availableCourses.filter((course) => {
    if (!searchQuery) return true
    const term = searchQuery.toLowerCase()
    const courseName = course.name || ""
    const instructor = course.instructor_en || course.instructor_ru || ""
    const description = course.description || ""
    return (
      courseName.toLowerCase().includes(term) ||
      instructor.toLowerCase().includes(term) ||
      description.toLowerCase().includes(term)
    )
  })

  // Toggle course selection
  const toggleCourseSelection = (courseId: string) => {
    if (selectedCourses.includes(courseId)) {
      setSelectedCourses(selectedCourses.filter((id) => id !== courseId))
    } else {
      setSelectedCourses([...selectedCourses, courseId])
    }
  }

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setPackDetails({
      ...packDetails,
      [name]: value,
    })
  }

  // Handle select changes
  const handleSelectChange = (name: string, value: string) => {
    setPackDetails({
      ...packDetails,
      [name]: value,
    })
  }

  // Get user ID and years data
  useEffect(() => {
    const getUser = async () => {
      try {
        const { data, error } = await supabase.auth.getUser()
        if (error) {
          console.error("Error getting user:", error)
          return
        }
        if (data.user) {
          setUserId(data.user.id)
        }
      } catch (error) {
        console.error("Error getting user:", error)
      }
    }

    const loadYears = async () => {
      try {
        const yearsData = await getYears()
        setYears(yearsData)
      } catch (error) {
        console.error("Error loading years:", error)
      }
    }

    getUser()
    loadYears()
  }, [supabase])

  // Updated steps for the 3-step wizard
  const steps = [
    { title: t("manager.courseBuilder.step1") },
    { title: t("manager.courseBuilder.step2") },
    { title: t("manager.courseBuilder.step3") },
  ]

  // Add a computed pack name function
  const getPackName = () => {
    if (!packDetails.semester) return ""

    const selectedYear = years.find((y) => y.id === managerProfile?.academic_year_id)
    const yearValue = selectedYear?.year || ""

    const semester =
      packDetails.semester === "fall" ? t("manager.courseBuilder.fall") : t("manager.courseBuilder.spring")

    const courseText = language === "ru" ? "Выбор курсов" : "Course Selection"

    return `${semester} ${yearValue} ${courseText}`
  }

  // Handle next step
  const handleNextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  // Handle previous step
  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    setSelectedFile(file)
    setIsUploading(true)

    try {
      const fileExt = file.name.split(".").pop()
      const fileName = `statement_templates/${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage.from("documents").upload(fileName, file)

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from("documents").getPublicUrl(fileName)

      if (urlData) {
        // Update the elective course with the new template URL
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
    }
  }


  // Handle publish
  const handlePublish = async () => {
    try {
      const { error } = await supabase
        .from("elective_courses")
        .update({
          semester: packDetails.semester,
          academic_year: managerProfile?.academic_year_id,
          max_selections: packDetails.maxSelections,
          deadline: packDetails.endDate,
          courses: selectedCourses,
          status: "published",
        })
        .eq("id", params.id)

      if (error) throw error

      toast({
        title: t("toast.success", "Success"),
        description: t("toast.published", "Published successfully"),
      })

      router.push(`/manager/electives/course/${params.id}`)
    } catch (error: any) {
      console.error("Error publishing:", error)
      toast({
        title: t("toast.error", "Error"),
        description: error.message || t("toast.errorDesc", "Failed to publish"),
        variant: "destructive",
      })
    }
  }

  // Format date for input fields
  const formatDateForInput = (dateString: string) => {
    if (!dateString) return ""
    const date = new Date(dateString)
    return date.toISOString().split("T")[0]
  }

  return (
    <DashboardLayout userRole={UserRole.PROGRAM_MANAGER}>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-2">
            <Link href={`/manager/electives/course/${params.id}`}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {t("manager.courseBuilder.editTitle") || t("manager.courseBuilder.title")}
              </h1>
            </div>
          </div>
        </div>

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
              {t("manager.courseBuilder.step")} {currentStep} {t("manager.courseBuilder.of")} {steps.length}
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
              style={{ width: `${(currentStep / steps.length) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Step Content */}
        <Card>
          <CardHeader>
            <CardTitle>
              {currentStep === 1 && t("manager.courseBuilder.programInfo", "Program Information")}
              {currentStep === 2 && t("manager.courseBuilder.addCourses", "Select Courses")}
              {currentStep === 3 && t("manager.courseBuilder.programDetails", "Confirmation")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Step 1: Basic Information & Selection Rules (Combined) */}
            {currentStep === 1 && (
              <div className="space-y-6">
                {/* Basic Information Section */}
                <div>
                  <h3 className="text-lg font-medium mb-4">{t("manager.courseBuilder.courseInfo")}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="semester">{t("manager.courseBuilder.semester")}</Label>
                      <Select
                        value={packDetails.semester}
                        onValueChange={(value) => handleSelectChange("semester", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t("manager.courseBuilder.semester")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fall">{t("manager.courseBuilder.fall")}</SelectItem>
                          <SelectItem value="spring">{t("manager.courseBuilder.spring")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {packDetails.semester && (
                    <div className="p-4 bg-muted rounded-md mt-4">
                      <div className="flex items-center gap-2">
                        <Info className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{t("manager.courseBuilder.namePreview")}</p>
                          <p className="text-lg font-semibold">{getPackName()}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Selection Rules Section */}
                <div>
                  <h3 className="text-lg font-medium mb-4">{t("manager.courseBuilder.selectionRules")}</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="maxSelections">{t("manager.courseBuilder.maxSelections")}</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="maxSelections"
                          name="maxSelections"
                          type="number"
                          min={1}
                          placeholder="e.g. 2"
                          value={packDetails.maxSelections}
                          onChange={handleInputChange}
                        />
                        <span className="text-sm text-muted-foreground">
                          {t("manager.courseBuilder.coursesPerStudent")}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endDate">{t("manager.courseBuilder.deadline", "Deadline")}</Label>
                      <Input
                        id="endDate"
                        name="endDate"
                        type="date"
                        value={formatDateForInput(packDetails.endDate)}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-md">
                      <div className="flex items-start gap-2">
                        <Info className="h-5 w-5 text-amber-500 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-amber-800">
                            {t("manager.courseBuilder.importantNote")}
                          </p>
                          <p className="text-sm text-amber-700">{t("manager.courseBuilder.dateRangeNote")}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Statement Upload Section */}
                <div>
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
                    uploadProgress={0}
                    accept=".pdf,.doc,.docx"
                    maxSize={10}
                    existingFileUrl={electiveCourse?.syllabus_template_url}
                    existingFileName={electiveCourse?.syllabus_template_url ? "Statement Template" : undefined}
                    onDeleteExisting={() => {
                      setElectiveCourse((prev: any) => ({
                        ...prev,
                        syllabus_template_url: null,
                      }))
                    }}
                  />
                </div>
              </div>
            )}

            {/* Step 2: Add Courses */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="relative w-full md:w-auto">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder={t("manager.courseBuilder.searchCourses")}
                      className="pl-8 w-full md:w-[300px]"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {selectedCourses.length} {t("manager.courseBuilder.coursesSelected")}
                    </span>
                  </div>
                </div>

                <div className="rounded-md border">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="w-[50px] py-3 px-4 text-left text-sm font-medium"></th>
                        <th className="py-3 px-4 text-left text-sm font-medium">{t("manager.courseBuilder.name")}</th>
                        <th className="py-3 px-4 text-left text-sm font-medium">
                          {t("manager.courseBuilder.teacher")}
                        </th>
                        <th className="py-3 px-4 text-left text-sm font-medium">
                          {t("manager.courseBuilder.maxStudents")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCourses.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-muted-foreground">
                            {t("manager.courseBuilder.noCoursesFound")}
                          </td>
                        </tr>
                      ) : (
                        filteredCourses.map((course) => {
                          const courseName = language === "ru" && course.name_ru ? course.name_ru : course.name
                          const instructor = language === "ru" && course.instructor_ru ? course.instructor_ru : course.instructor_en || ""
                          return (
                            <tr
                              key={course.id}
                              className={`border-b hover:bg-muted/50 cursor-pointer ${
                                selectedCourses.includes(course.id) ? "bg-primary/10" : ""
                              }`}
                              onClick={() => toggleCourseSelection(course.id)}
                            >
                              <td className="py-3 px-4 text-sm">
                                <Checkbox
                                  checked={selectedCourses.includes(course.id)}
                                  onCheckedChange={() => toggleCourseSelection(course.id)}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </td>
                              <td className="py-3 px-4 text-sm">{courseName}</td>
                              <td className="py-3 px-4 text-sm">{instructor}</td>
                              <td className="py-3 px-4 text-sm">{course.max_students || 0}</td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Step 3: Review & Publish */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-medium mb-2">{t("manager.courseBuilder.courseSelectionDetails")}</h3>
                    <dl className="space-y-2">
                      <div className="flex justify-between">
                        <dt className="font-medium">{t("manager.courseBuilder.name")}:</dt>
                        <dd>{getPackName() || t("manager.courseBuilder.notSpecified")}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="font-medium">{t("manager.courseBuilder.maxSelectionsLabel")}</dt>
                        <dd>
                          {packDetails.maxSelections} {t("manager.courseBuilder.courses")}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="font-medium">{t("manager.courseBuilder.selectionPeriod")}</dt>
                        <dd>
                          {packDetails.startDate && packDetails.endDate
                            ? `${new Date(packDetails.startDate).toLocaleDateString()} - ${new Date(packDetails.endDate).toLocaleDateString()}`
                            : t("manager.courseBuilder.notSpecified")}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="font-medium">{t("manager.courseBuilder.courses")}</dt>
                        <dd>{selectedCourses.length}</dd>
                      </div>
                    </dl>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-2">{t("manager.courseBuilder.selectedCourses")}</h3>
                  {selectedCourses.length === 0 ? (
                    <div className="text-center py-8 border rounded-md">
                      <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
                      <h3 className="mt-4 text-lg font-semibold">{t("manager.courseBuilder.noCoursesSelected")}</h3>
                      <p className="mt-2 text-muted-foreground">{t("manager.courseBuilder.goBackToAdd")}</p>
                    </div>
                  ) : (
                    <div className="rounded-md border">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="py-3 px-4 text-left text-sm font-medium">
                              {t("manager.courseBuilder.name")}
                            </th>
                            <th className="py-3 px-4 text-left text-sm font-medium">
                              {t("manager.courseBuilder.teacher")}
                            </th>
                            <th className="py-3 px-4 text-left text-sm font-medium">
                              {t("manager.courseBuilder.maxStudents")}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {availableCourses
                            .filter((course) => selectedCourses.includes(course.id))
                            .map((course) => {
                              const courseName = language === "ru" && course.name_ru ? course.name_ru : course.name
                              const instructor = language === "ru" && course.instructor_ru ? course.instructor_ru : course.instructor_en || ""
                              return (
                                <tr key={course.id} className="border-b">
                                  <td className="py-3 px-4 text-sm">{courseName}</td>
                                  <td className="py-3 px-4 text-sm">{instructor}</td>
                                  <td className="py-3 px-4 text-sm">{course.max_students || 0}</td>
                                </tr>
                              )
                            })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Validation warnings */}
                {(!packDetails.semester ||
                  !packDetails.endDate ||
                  selectedCourses.length === 0) && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-md">
                    <div className="flex items-start gap-2">
                      <Info className="h-5 w-5 text-amber-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-amber-800">{t("manager.courseBuilder.missingInfo")}</p>
                        <ul className="text-sm text-amber-700 list-disc list-inside">
                          {!packDetails.semester && <li>{t("manager.courseBuilder.semesterRequired")}</li>}
                          {!packDetails.endDate && <li>{t("manager.courseBuilder.deadlineRequired", "Deadline is required")}</li>}
                          {selectedCourses.length === 0 && <li>{t("manager.courseBuilder.courseRequired")}</li>}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <div>
              {currentStep > 1 && (
                <Button variant="outline" onClick={handlePrevStep}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {t("manager.courseBuilder.back")}
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              {currentStep < steps.length ? (
                <Button onClick={handleNextStep}>
                  {t("manager.courseBuilder.next")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={handlePublish}
                  disabled={
                    !packDetails.semester ||
                    !packDetails.endDate ||
                    selectedCourses.length === 0
                  }
                >
                  {t("manager.courseBuilder.publishCourseSelection")}
                </Button>
              )}
            </div>
          </CardFooter>
        </Card>
      </div>
    </DashboardLayout>
  )
}
