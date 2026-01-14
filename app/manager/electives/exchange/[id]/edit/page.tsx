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

// Cache constants
const EXCHANGE_EDIT_CACHE_KEY = "exchangeEditData"
const CACHE_EXPIRY = 60 * 60 * 1000 // 60 minutes

// Cache helper functions
const getCachedData = (key: string): any | null => {
  try {
    const cachedData = localStorage.getItem(key)
    if (!cachedData) return null

    const parsed = JSON.parse(cachedData)

    // Check if cache is expired
    if (Date.now() - parsed.timestamp > CACHE_EXPIRY) {
      localStorage.removeItem(key)
      return null
    }

    return parsed.data
  } catch (error) {
    console.error(`Error reading from cache (${key}):`, error)
    return null
  }
}

const setCachedData = (key: string, data: any) => {
  try {
    const cacheData = {
      data,
      timestamp: Date.now(),
    }
    localStorage.setItem(key, JSON.stringify(cacheData))
  } catch (error) {
    console.error(`Error writing to cache (${key}):`, error)
  }
}
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { useCachedManagerProfile } from "@/hooks/use-cached-manager-profile"

export default function ExchangeEditPage() {
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
  const [isLoadingUniversities, setIsLoadingUniversities] = useState(false)

  // Data states
  const [universities, setUniversities] = useState<any[]>([])
  const [groups, setGroups] = useState<any[]>([])
  const [semesters, setSemesters] = useState<any[]>([])
  const [exchangeProgram, setExchangeProgram] = useState<any>(null)

  // Form state - matching exchange builder exactly
  const [formData, setFormData] = useState({
    semester: "",
    groupId: "",
    maxSelections: 2,
    endDate: "",
  })

  // Selection state
  const [selectedUniversities, setSelectedUniversities] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState("")

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      const exchangeId = params.id as string
      if (!exchangeId || exchangeId === 'undefined' || !userId) return

      const cacheKey = `${EXCHANGE_EDIT_CACHE_KEY}_${exchangeId}`

      // Try to load from cache first for instant loading
      const cachedData = getCachedData(cacheKey)
      if (cachedData) {
        console.log("Loading exchange from cache:", cachedData)
        setExchangeProgram(cachedData)

        // Populate form with existing data
        setFormData({
          semester: cachedData.semester || "",
          groupId: cachedData.group_id || "",
          maxSelections: cachedData.max_selections || 2,
          endDate: cachedData.deadline ? cachedData.deadline.split('T')[0] : "",
        })

        // Load selected universities - map to IDs only
        setSelectedUniversities(cachedData.universities?.map((university: any) => university.id) || [])
      }

      try {
        // Load exchange program data from API (refresh cache in background)
        const response = await fetch(`/api/manager/electives/exchange/${exchangeId}`)
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Failed to load exchange program")
        }

        const exchangeData = await response.json()
        console.log("Loaded exchange data:", exchangeData)
        console.log("Statement URL:", exchangeData.statement_template_url)

        // Update cache with fresh data
        setCachedData(cacheKey, exchangeData)
        setExchangeProgram(exchangeData)

        // Populate form with existing data
        setFormData({
          semester: exchangeData.semester || "",
          groupId: exchangeData.group_id || "",
          maxSelections: exchangeData.max_selections || 2,
          endDate: exchangeData.deadline ? exchangeData.deadline.split('T')[0] : "",
        })

        // Load selected universities - map to IDs only
        setSelectedUniversities(exchangeData.universities?.map((university: any) => university.id) || [])

        // Load available universities for selection
        await loadAvailableUniversities()

      } catch (error) {
        console.error("Error loading data:", error)
        toast({
          title: "Error",
          description: "Failed to load exchange program data",
          variant: "destructive",
        })
      }
    }

    loadData()
  }, [params.id, userId])

  // Load available universities
  const loadAvailableUniversities = async () => {
    try {
      setIsLoadingUniversities(true)
      const { data: universitiesData, error: universitiesError } = await supabase
        .from("exchange_universities")
        .select(`
          id,
          name,
          name_ru,
          country,
          max_students,
          status
        `)
        .eq("status", "active")
        .order("name")

      if (universitiesError) {
        console.error("Error loading universities:", universitiesError)
      } else {
        setUniversities(universitiesData || [])
      }
    } catch (error) {
      console.error("Error loading universities:", error)
    } finally {
      setIsLoadingUniversities(false)
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

  // Toggle university selection
  const toggleUniversitySelection = (universityId: string) => {
    if (selectedUniversities.includes(universityId)) {
      setSelectedUniversities(selectedUniversities.filter(id => id !== universityId))
    } else {
      setSelectedUniversities([...selectedUniversities, universityId])
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
    const exchangeText = language === "ru" ? "Обмен программами" : "Exchange Program"

    return `${semesterName} ${yearValue} ${exchangeText}`
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
        setExchangeProgram((prev: any) => ({
          ...prev,
          statement_template_url: urlData.publicUrl,
        }))
        toast({
          title: t("manager.exchangeBuilder.uploadSuccess", "Upload Successful"),
          description: file.name,
        })
      }
    } catch (error) {
      console.error("Error uploading file:", error)
      toast({
        title: t("manager.exchangeBuilder.uploadError", "Upload Error"),
        description: t("manager.exchangeBuilder.uploadErrorDesc", "Failed to upload file"),
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
      const exchangeId = params.id as string
      const { error } = await supabase
        .from("elective_exchange")
        .update({
          semester: formData.semester,
          academic_year: managerProfile?.academic_year_id,
          max_selections: formData.maxSelections,
          deadline: formData.endDate,
          universities: selectedUniversities,
          status: "published",
        })
        .eq("id", exchangeId)

      if (error) throw error

      toast({
        title: "Success",
        description: "Exchange program updated successfully",
      })

      router.push(`/manager/electives/exchange/${exchangeId}`)
    } catch (error: any) {
      console.error("Error updating exchange program:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to update exchange program",
        variant: "destructive",
      })
    }
  }

  // No loading spinner - page loads instantly from cache

  if (!exchangeProgram) {
    return (
      <DashboardLayout userRole={UserRole.PROGRAM_MANAGER}>
        <div className="space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold">{t("manager.exchangeBuilder.notFound", "Exchange program not found")}</h1>
            <Button onClick={() => router.push("/manager/electives/exchange")} className="mt-4">
              {t("manager.exchangeBuilder.backToList", "Back to Exchange Programs")}
            </Button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  // Filter universities based on search term
  const filteredUniversities = universities.filter((university) => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    const universityName = university.name || ""
    const country = university.country || ""
    return (
      universityName.toLowerCase().includes(term) ||
      country.toLowerCase().includes(term)
    )
  })

  return (
    <DashboardLayout userRole={UserRole.PROGRAM_MANAGER}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-2">
            <Link href={`/manager/electives/exchange/${params.id as string}`}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {t("manager.exchangeBuilder.editTitle", "Edit Exchange Program")}
              </h1>
              <p className="text-muted-foreground">
                {t("manager.exchangeBuilder.editSubtitle", "Modify the exchange program details and selections")}
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
                <p className="text-sm font-medium">{t("manager.exchangeBuilder.programInfo", "Program Information")}</p>
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
                <p className="text-sm font-medium">{t("manager.exchangeBuilder.addUniversities", "Select Universities")}</p>
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
                <p className="text-sm font-medium">{t("manager.exchangeBuilder.programDetails", "Confirmation")}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Stepper */}
        <div className="md:hidden">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium">
              {t("manager.exchangeBuilder.step")} {currentStep} {t("manager.exchangeBuilder.of")} {totalSteps}
            </p>
            <p className="text-sm font-medium">
              {currentStep === 1 && t("manager.exchangeBuilder.programInfo", "Program Information")}
              {currentStep === 2 && t("manager.exchangeBuilder.addUniversities", "Select Universities")}
              {currentStep === 3 && t("manager.exchangeBuilder.programDetails", "Confirmation")}
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
              <CardTitle>{t("manager.exchangeBuilder.programInfo", "Program Information")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="semester">{t("manager.exchangeBuilder.semester", "Semester")}</Label>
                  {false ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <Select value={formData.semester} onValueChange={(value) => handleSelectChange("semester", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("manager.exchangeBuilder.selectSemester", "Select a semester")} />
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
                  <Label htmlFor="group">{t("manager.exchangeBuilder.group", "Group")}</Label>
                  {false ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <Select value={formData.groupId} onValueChange={(value) => handleSelectChange("groupId", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("manager.exchangeBuilder.selectGroup", "Select a group")} />
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
                            {t("manager.exchangeBuilder.noGroupsAvailable", "No groups available")}
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-medium">{t("manager.exchangeBuilder.selectionRules", "Selection Rules")}</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="maxSelections">{t("manager.exchangeBuilder.maxSelections", "Max Selections")}</Label>
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
                        {t("manager.exchangeBuilder.studentsPerProgram", "Maximum number of students per exchange program")}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endDate">{t("manager.exchangeBuilder.deadline", "Deadline")}</Label>
                    <Input id="endDate" name="endDate" type="date" value={formData.endDate} onChange={handleChange} />
                  </div>
                </div>
              </div>

              <ModernFileUploader
                title={t("manager.exchangeBuilder.statementUpload", "Statement Upload")}
                description={t(
                  "manager.exchangeBuilder.statementDescription",
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
                existingFileUrl={exchangeProgram?.statement_template_url}
                existingFileName={(() => {
                  const url = exchangeProgram?.statement_template_url
                  if (!url) return undefined

                  const extracted = url.split('/').pop()?.split('_').slice(1).join('_')
                  console.log("Exchange extracted filename:", extracted, "from URL:", url)
                  return extracted
                })()}
                onDeleteExisting={() => {
                  setExchangeProgram((prev: any) => ({
                    ...prev,
                    statement_template_url: null,
                  }))
                }}
              />

              <div className="pt-4 flex justify-end">
                <Button type="button" onClick={handleNextStep} disabled={false}>
                  {t("manager.exchangeBuilder.next", "Next")}
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Select Universities */}
        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>{t("manager.exchangeBuilder.addUniversities", "Select Universities")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder={t("manager.exchangeBuilder.searchUniversities", "Search universities...")}
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">{selectedUniversities.length}</span>{" "}
                  {t("manager.exchangeBuilder.universitiesSelected", "universities selected")}
                </div>
              </div>

              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]"></TableHead>
                      <TableHead>{t("manager.exchangeBuilder.universityName", "University Name")}</TableHead>
                      <TableHead>{t("manager.exchangeBuilder.country", "Country")}</TableHead>
                      <TableHead>{t("manager.exchangeBuilder.maxStudents", "Max Students")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingUniversities ? (
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
                    ) : filteredUniversities.length > 0 ? (
                      filteredUniversities.map((university) => {
                        const universityName = language === "ru" && university.name_ru ? university.name_ru : university.name
                        return (
                          <TableRow
                            key={university.id}
                            className={`border-b hover:bg-muted/50 cursor-pointer ${
                              selectedUniversities.includes(university.id) ? "bg-primary/10" : ""
                            }`}
                            onClick={() => toggleUniversitySelection(university.id)}
                          >
                            <TableCell>
                              <Checkbox
                                checked={selectedUniversities.includes(university.id)}
                                onChange={() => {}}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{universityName}</TableCell>
                            <TableCell>{university.country}</TableCell>
                            <TableCell>{university.max_students || 0}</TableCell>
                          </TableRow>
                        )
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          {t("manager.exchangeBuilder.noUniversitiesFound", "No universities found")}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={handlePrevStep}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {t("manager.exchangeBuilder.back")}
                </Button>
                <Button onClick={handleNextStep}>
                  {t("manager.exchangeBuilder.next")}
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
              <CardTitle>{t("manager.exchangeBuilder.programDetails", "Program Details")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Program details in a single row */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">
                    {t("manager.exchangeBuilder.programName", "Program Name")}
                  </h3>
                  <p className="text-lg">{generateProgramName()}</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">
                    {t("manager.exchangeBuilder.group", "Group")}
                  </h3>
                  <p className="text-lg">{groups.find((g) => g.id === formData.groupId)?.name || "N/A"}</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">
                    {t("manager.exchangeBuilder.maxSelectionsLabel", "Max Selections")}
                  </h3>
                  <p className="text-lg">{formData.maxSelections}</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">
                    {t("manager.exchangeBuilder.deadline", "Deadline")}
                  </h3>
                  <p className="text-lg">{formData.endDate}</p>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-medium">
                  {t("manager.exchangeBuilder.selectedUniversities", "Selected Universities")}
                </h3>

                {selectedUniversities.length > 0 ? (
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("manager.exchangeBuilder.universityName", "University Name")}</TableHead>
                          <TableHead>{t("manager.exchangeBuilder.country", "Country")}</TableHead>
                          <TableHead>{t("manager.exchangeBuilder.maxStudents", "Max Students")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedUniversities.map((universityId) => {
                          const university = universities.find((u) => u.id === universityId)
                          if (!university) return null

                          const universityName = language === "ru" && university.name_ru ? university.name_ru : university.name

                          return (
                            <TableRow key={university.id}>
                              <TableCell className="font-medium">{universityName}</TableCell>
                              <TableCell>{university.country}</TableCell>
                              <TableCell>{university.max_students || 0}</TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-muted-foreground">{t("manager.exchangeBuilder.noUniversitiesSelected", "No universities selected")}</p>
                )}
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={handlePrevStep}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {t("manager.exchangeBuilder.back")}
                </Button>
                <Button
                  onClick={handlePublish}
                  disabled={
                    !formData.semester ||
                    !formData.endDate ||
                    selectedUniversities.length === 0
                  }
                >
                  {t("manager.exchangeBuilder.publishExchangeProgram", "Publish Exchange Program")}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}