"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { useLanguage } from "@/lib/language-context"
import { LanguageSwitcher } from "@/components/language-switcher"
import Logo from "@/components/logo"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { Eye, EyeOff } from "lucide-react"
import Indicator from "@/components/indicator"

export default function ManagerSignupPage() {
  const { t, language } = useLanguage()
  const router = useRouter()
  const { toast } = useToast()

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    degreeId: "",
    academicYear: "",
  })

  // Data states
  const [degrees, setDegrees] = useState<any[]>([])
  const [years, setYears] = useState<string[]>([])
  const [isLoadingDegrees, setIsLoadingDegrees] = useState(true)

  // Ref to prevent multiple fetches
  const dataFetchedRef = useRef(false)

  const supabase = getSupabaseBrowserClient()

  // Load degrees on component mount
  useEffect(() => {
    if (dataFetchedRef.current) return

    async function loadDegrees() {
      try {
        setIsLoadingDegrees(true)
        dataFetchedRef.current = true

        const { data, error } = await supabase
          .from("degrees")
          .select("id, name, name_ru, code, status")
          .eq("status", "active")
          .order("name", { ascending: true })

        if (error) {
          console.error("Error fetching degrees:", error)
          dataFetchedRef.current = false // Allow retry on error
          throw error
        }

        // Process degrees
        if (data && data.length > 0) {
          setDegrees(data)
          setFormData((prev) => ({
            ...prev,
            degreeId: data[0].id.toString(),
          }))
        } else {
          console.warn("No degrees found in database")
          setDegrees([])
        }
      } catch (error) {
        console.error("Error loading degrees:", error)
        dataFetchedRef.current = false // Allow retry on error
        setDegrees([])
      } finally {
        setIsLoadingDegrees(false)
      }
    }

    loadDegrees()
  }, [supabase])

  // Fetch academic years when degree changes
  useEffect(() => {
    if (!formData.degreeId) {
      setYears([])
      setFormData((prev) => ({
        ...prev,
        academicYear: "",
      }))
      return
    }

    async function fetchAcademicYears() {
      try {
        console.log("Fetching academic years for degree:", formData.degreeId)
        const { data, error } = await supabase
          .from("academic_years")
          .select("id, year, degree_id")
          .eq("degree_id", formData.degreeId)
          .eq("is_active", true)
          .order("year", { ascending: false })

        if (error) {
          console.error("Error fetching academic years:", error)
          throw error
        }

        console.log("Academic years data:", data)

        if (data && data.length > 0) {
          const yearValues = data.map((ay) => ay.year).filter(Boolean)
          console.log("Year values extracted:", yearValues)
          setYears(yearValues)

          // Set default year
          const currentYear = new Date().getFullYear().toString()
          if (yearValues.includes(currentYear)) {
            setFormData((prev) => ({
              ...prev,
              academicYear: currentYear,
            }))
          } else {
            setFormData((prev) => ({
              ...prev,
              academicYear: yearValues[0],
            }))
          }
        } else {
          console.warn("No academic years found for degree:", formData.degreeId)
          setYears([])
          setFormData((prev) => ({
            ...prev,
            academicYear: "",
          }))
        }
      } catch (error) {
        console.error("Error fetching academic years:", error)
        setYears([])
        setFormData((prev) => ({
          ...prev,
          academicYear: "",
        }))
      }
    }

    fetchAcademicYears()
  }, [formData.degreeId, supabase])

  // Helper function to get localized degree name
  const getDegreeName = (degreeItem: any) => {
    if (!degreeItem) return ""
    return language === "ru" && degreeItem.name_ru ? degreeItem.name_ru : degreeItem.name || ""
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value,
    })
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData({
      ...formData,
      [name]: value,
    })
  }

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      if (!formData.degreeId) {
        throw new Error(t("auth.error.incompleteFields"))
      }

      // Create the user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.name,
          },
        },
      })

      if (authError) throw new Error(authError.message)

      // Create manager profile
      const { error: profileError } = await supabase.from("profiles").insert({
        id: authData.user!.id,
        full_name: formData.name,
        role: "program_manager",
        email: formData.email,
        degree_id: formData.degreeId,
        academic_year: formData.academicYear,
      })

      if (profileError) throw new Error(profileError.message)

      // Send welcome email (non-blocking)
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
      fetch(`${baseUrl}/api/send-email-notification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "welcome",
          userEmail: formData.email,
          firstName: formData.name.split(" ")[0],
          language,
        }),
      }).catch((error) => {
        console.error("Failed to send welcome email:", error)
      })

      toast({
        title: t("auth.signup.success"),
        description: t("auth.signup.successMessage"),
      })

      // Redirect to login page
      router.push("/manager/login")
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.signup.error"))
    } finally {
      setIsLoading(false)
    }
  }

  // Use years from database only (no fallback)
  const enrollmentYears = years

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center space-y-2 text-center">
          <Logo className="mb-4 h-8 w-auto max-w-[160px]" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("auth.signup.createAccount")}</CardTitle>
            <CardDescription>{t("auth.signup.managerDescription")}</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">{error}</div>}

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">{t("auth.signup.email")}</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="manager@university.edu"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>

              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="name">{t("admin.users.fullName")}</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder={t("auth.signup.fullNamePlaceholder")}
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>

              {/* Degree and Year */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="degree">{t("admin.users.degree")}</Label>
                  <Select
                    value={formData.degreeId}
                    onValueChange={(value) => handleSelectChange("degreeId", value)}
                    required
                    disabled={isLoadingDegrees}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("admin.users.selectDegree")}>
                        {formData.degreeId && degrees.length > 0
                          ? getDegreeName(degrees.find((d) => d.id?.toString() === formData.degreeId))
                          : null}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {degrees.length === 0 ? (
                        <SelectItem value="no-degrees" disabled>
                          {t("auth.signup.noDegrees")}
                        </SelectItem>
                      ) : (
                        degrees.map((degree) => (
                          <SelectItem key={degree.id} value={degree.id.toString()}>
                            {getDegreeName(degree)}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="academicYear">{t("auth.signup.year")}</Label>
                  <Select
                    value={formData.academicYear}
                    onValueChange={(value) => handleSelectChange("academicYear", value)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("auth.signup.selectYear")} />
                    </SelectTrigger>
                    <SelectContent>
                      {enrollmentYears.length === 0 ? (
                        <SelectItem value="no-years" disabled>
                          {t("auth.signup.noYears")}
                        </SelectItem>
                      ) : (
                        enrollmentYears.map((year) => (
                          <SelectItem key={year} value={year}>
                            {year}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">{t("auth.signup.password")}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? t("auth.signup.creating") : t("auth.signup.createAccount")}
              </Button>
              <div className="text-center text-sm">
                {t("auth.signup.alreadyHaveAccount")}{" "}
                <Link href="/manager/login" className="text-primary hover:underline">
                  {t("auth.signup.login")}
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
        <div className="flex justify-center mt-8">
          <LanguageSwitcher />
        </div>
        <Indicator />
      </div>
    </div>
  )
}
