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
import { DocumentUpload } from "@/components/document-upload"
import { useToast } from "@/components/ui/use-toast"
import { getSupabaseBrowserClient } from "@/lib/supabase"

interface ElectiveCourseEditPageProps {
  params: {
    id: string
  }
}

export default function ElectiveCourseEditPage({ params }: ElectiveCourseEditPageProps) {
  const router = useRouter()
  const { t } = useLanguage()
  const [activeStep, setActiveStep] = useState(0)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCourses, setSelectedCourses] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  // Form state
  const [packDetails, setPackDetails] = useState({
    semester: "",
    year: new Date().getFullYear(),
    maxSelections: 2,
    startDate: "",
    endDate: "",
    status: ElectivePackStatus.DRAFT,
  })

  const supabase = getSupabaseBrowserClient()
  const [availableCourses, setAvailableCourses] = useState<any[]>([])
  const [electiveCourse, setElectiveCourse] = useState<any>(null)

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

  // Updated steps for the 3-step wizard
  const steps = [
    { title: t("manager.courseBuilder.step1") },
    { title: t("manager.courseBuilder.step2") },
    { title: t("manager.courseBuilder.step3") },
  ]

  // Add a computed pack name function
  const getPackName = () => {
    if (!packDetails.semester || !packDetails.year) return ""

    const semester =
      packDetails.semester === "fall" ? t("manager.courseBuilder.fall") : t("manager.courseBuilder.spring")

    return `${semester} ${packDetails.year}`
  }

  // Handle next step
  const handleNextStep = () => {
    if (activeStep < steps.length - 1) {
      setActiveStep(activeStep + 1)
    }
  }

  // Handle previous step
  const handlePrevStep = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1)
    }
  }

  // Handle save as draft
  const handleSaveAsDraft = async () => {
    try {
      const deadline = packDetails.startDate && packDetails.endDate ? packDetails.endDate : null

      const { error } = await supabase
        .from("elective_courses")
        .update({
          semester: packDetails.semester,
          year: packDetails.year,
          max_selections: packDetails.maxSelections,
          deadline: deadline,
          courses: selectedCourses,
          status: "draft",
        })
        .eq("id", params.id)

      if (error) throw error

      toast({
        title: t("toast.success", "Success"),
        description: t("toast.savedAsDraft", "Saved as draft successfully"),
      })

      router.push(`/manager/electives/course/${params.id}`)
    } catch (error: any) {
      console.error("Error saving as draft:", error)
      toast({
        title: t("toast.error", "Error"),
        description: error.message || t("toast.errorDesc", "Failed to save as draft"),
        variant: "destructive",
      })
    }
  }

  // Handle publish
  const handlePublish = async () => {
    try {
      const deadline = packDetails.startDate && packDetails.endDate ? packDetails.endDate : null

      const { error } = await supabase
        .from("elective_courses")
        .update({
          semester: packDetails.semester,
          year: packDetails.year,
          max_selections: packDetails.maxSelections,
          deadline: deadline,
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
          <div className="flex items-center gap-2">
            <Badge variant="outline">{t("manager.courseBuilder.draft")}</Badge>
          </div>
        </div>

        {/* Stepper */}
        <div className="hidden md:flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={index} className="flex items-center">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  index === activeStep
                    ? "border-primary bg-primary text-primary-foreground"
                    : index < activeStep
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground text-muted-foreground"
                }`}
              >
                {index < activeStep ? <Check className="h-5 w-5" /> : <span>{index + 1}</span>}
              </div>
              <div className="ml-4 mr-8">
                <p className="text-sm font-medium">{step.title}</p>
              </div>
              {index < steps.length - 1 && <ChevronRight className="h-5 w-5 text-muted-foreground mr-8" />}
            </div>
          ))}
        </div>

        {/* Mobile Stepper */}
        <div className="md:hidden">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium">
              {t("manager.courseBuilder.step")} {activeStep + 1} {t("manager.courseBuilder.of")} {steps.length}
            </p>
            <p className="text-sm font-medium">{steps[activeStep].title}</p>
          </div>
          <div className="w-full bg-muted h-2 rounded-full mb-6">
            <div
              className="bg-primary h-2 rounded-full"
              style={{ width: `${((activeStep + 1) / steps.length) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Step Content */}
        <Card>
          <CardHeader>
            <CardTitle>{steps[activeStep].title}</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Step 1: Basic Information & Selection Rules (Combined) */}
            {activeStep === 0 && (
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
                    <div className="space-y-2">
                      <Label htmlFor="year">{t("manager.courseBuilder.year")}</Label>
                      <Input
                        id="year"
                        name="year"
                        type="number"
                        placeholder="e.g. 2025"
                        value={packDetails.year}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  {packDetails.semester && packDetails.year && (
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="startDate">{t("manager.courseBuilder.startDate")}</Label>
                        <Input
                          id="startDate"
                          name="startDate"
                          type="date"
                          value={formatDateForInput(packDetails.startDate)}
                          onChange={handleInputChange}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="endDate">{t("manager.courseBuilder.endDate")}</Label>
                        <Input
                          id="endDate"
                          name="endDate"
                          type="date"
                          value={formatDateForInput(packDetails.endDate)}
                          onChange={handleInputChange}
                        />
                      </div>
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
              </div>
            )}

            {/* Step 2: Add Courses */}
            {activeStep === 1 && (
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
            {activeStep === 2 && (
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
                  !packDetails.year ||
                  !packDetails.startDate ||
                  !packDetails.endDate ||
                  selectedCourses.length === 0) && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-md">
                    <div className="flex items-start gap-2">
                      <Info className="h-5 w-5 text-amber-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-amber-800">{t("manager.courseBuilder.missingInfo")}</p>
                        <ul className="text-sm text-amber-700 list-disc list-inside">
                          {!packDetails.semester && <li>{t("manager.courseBuilder.semesterRequired")}</li>}
                          {!packDetails.year && <li>{t("manager.courseBuilder.yearRequired")}</li>}
                          {!packDetails.startDate && <li>{t("manager.courseBuilder.startDateRequired")}</li>}
                          {!packDetails.endDate && <li>{t("manager.courseBuilder.endDateRequired")}</li>}
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
              {activeStep > 0 && (
                <Button variant="outline" onClick={handlePrevStep}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {t("manager.courseBuilder.back")}
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleSaveAsDraft}>
                {t("manager.courseBuilder.saveAsDraft")}
              </Button>
              {activeStep < steps.length - 1 ? (
                <Button onClick={handleNextStep}>
                  {t("manager.courseBuilder.next")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={handlePublish}
                  disabled={
                    !packDetails.semester ||
                    !packDetails.year ||
                    !packDetails.startDate ||
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
        <div className="mt-6">
          <DocumentUpload
            courseId={params.id}
            onUploadComplete={(url, fileName) => {
              // In a real app, you would save this to the database
              console.log("Document uploaded:", url, fileName)
              toast({
                title: "Document uploaded",
                description: `${fileName} has been uploaded successfully.`,
              })
            }}
            existingDocuments={
              [
                // In a real app, you would fetch these from the database
                // This is just a placeholder
              ]
            }
            onDelete={(id) => {
              // In a real app, you would delete this from the database and storage
              console.log("Delete document:", id)
              toast({
                title: "Document deleted",
                description: "The document has been deleted successfully.",
              })
            }}
          />
        </div>
      </div>
    </DashboardLayout>
  )
}
