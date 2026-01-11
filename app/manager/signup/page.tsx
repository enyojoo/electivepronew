"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { useLanguage } from "@/lib/language-context"
import { LanguageSwitcher } from "@/components/language-switcher"
import { DEFAULT_LOGO_URL } from "@/lib/constants"
import { createClient } from "@supabase/supabase-js"
import { Eye, EyeOff } from "lucide-react"

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

  // Ref to prevent multiple fetches
  const dataFetchedRef = useRef(false)

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

  // Load all data once when the component mounts
  useEffect(() => {
    if (dataFetchedRef.current) return

    async function loadAllData() {
      try {
        dataFetchedRef.current = true

        // Fetch all data in parallel
        const [degreesResponse, groupsResponse] = await Promise.all([
          supabase.from("degrees").select("*").eq("status", "active"),
          supabase.from("groups").select("academic_year").eq("status", "active"),
        ])

        // Process degrees
        if (degreesResponse.data && degreesResponse.data.length > 0) {
          setDegrees(degreesResponse.data)
          setFormData((prev) => ({
            ...prev,
            degreeId: degreesResponse.data[0].id.toString(),
          }))
        }

        // Process years from groups
        if (groupsResponse.data && groupsResponse.data.length > 0) {
          const uniqueYears = [...new Set(groupsResponse.data.map((g) => g.academic_year).filter(Boolean))]
            .sort()
            .reverse()

          setYears(uniqueYears)

          // Set default year
          if (uniqueYears.length > 0) {
            const currentYear = new Date().getFullYear().toString()
            if (uniqueYears.includes(currentYear)) {
              setFormData((prev) => ({
                ...prev,
                academicYear: currentYear,
              }))
            } else {
              setFormData((prev) => ({
                ...prev,
                academicYear: uniqueYears[0],
              }))
            }
          }
        }
      } catch (error) {
        console.error("Error loading data:", error)
      }
    }

    loadAllData()
  }, [supabase])

  // Helper function to get localized degree name
  const getDegreeName = (degreeItem: any) => {
    return language === "ru" && degreeItem.name_ru ? degreeItem.name_ru : degreeItem.name
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

  // Generate enrollment years if no years are available from the database
  const enrollmentYears =
    years.length > 0 ? years : Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - 2 + i).toString())

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center space-y-2 text-center">
          <Image
            src={DEFAULT_LOGO_URL}
            alt="ElectivePRO Logo"
            width={160}
            height={45}
            className="h-10 w-auto"
            priority
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("auth.signup.createAccount")}</CardTitle>
            <CardDescription>Create a new manager account</CardDescription>
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

              {/* Degree Assignment */}
              <div className="space-y-2">
                <Label htmlFor="degree">{t("admin.users.degree")}</Label>
                <Select
                  value={formData.degreeId}
                  onValueChange={(value) => handleSelectChange("degreeId", value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("admin.users.selectDegree")} />
                  </SelectTrigger>
                  <SelectContent>
                    {degrees.map((degree) => (
                      <SelectItem key={degree.id} value={degree.id.toString()}>
                        {getDegreeName(degree)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Year */}
              <div className="space-y-2">
                <Label htmlFor="academicYear">{t("year.enrollment")}</Label>
                <Select
                  value={formData.academicYear}
                  onValueChange={(value) => handleSelectChange("academicYear", value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("auth.signup.selectYear")} />
                  </SelectTrigger>
                  <SelectContent>
                    {enrollmentYears.map((year) => (
                      <SelectItem key={year} value={year}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
      </div>
    </div>
  )
}
