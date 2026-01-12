"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { LanguageSwitcher } from "@/components/language-switcher"
import { useLanguage } from "@/lib/language-context"
import Logo from "@/components/logo"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { useToast } from "@/components/ui/use-toast"
import { Input } from "@/components/ui/input"
import { Eye, EyeOff } from "lucide-react"
import Indicator from "@/components/indicator"

export default function StudentSignupPage() {
  const { t, language } = useLanguage()
  const router = useRouter()
  const { toast } = useToast()

  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [degree, setDegree] = useState("")
  const [year, setYear] = useState("")
  const [group, setGroup] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // Data states
  const [degrees, setDegrees] = useState<any[]>([])
  const [years, setYears] = useState<string[]>([])
  const [filteredGroups, setFilteredGroups] = useState<any[]>([])

  // Refs to prevent multiple fetches
  const dataFetchedRef = useRef(false)

  const supabase = getSupabaseBrowserClient()

  // Load degrees on component mount
  useEffect(() => {
    if (dataFetchedRef.current) return

    async function loadDegrees() {
      try {
        dataFetchedRef.current = true

        // Fetch degrees
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

        if (data && data.length > 0) {
          setDegrees(data)
          setDegree(data[0].id.toString())
        } else {
          console.warn("No degrees found in database")
          setDegrees([])
        }
      } catch (error) {
        console.error("Error loading degrees:", error)
        dataFetchedRef.current = false // Allow retry on error
        setDegrees([])
      }
    }

    loadDegrees()
  }, [supabase])

  // Fetch academic years when degree changes
  useEffect(() => {
    if (!degree) return

    async function fetchAcademicYears() {
      try {
        const { data, error } = await supabase
          .from("academic_years")
          .select("id, year, degree_id")
          .eq("degree_id", degree)
          .eq("is_active", true)
          .order("year", { ascending: false })

        if (error) throw error

        if (data && data.length > 0) {
          const yearValues = data.map((ay) => ay.year).filter(Boolean)
          setYears(yearValues)

          // Set default year
          const currentYear = new Date().getFullYear().toString()
          if (yearValues.includes(currentYear)) {
            setYear(currentYear)
          } else {
            setYear(yearValues[0])
          }
        } else {
          setYears([])
          setYear("")
        }
      } catch (error) {
        console.error("Error fetching academic years:", error)
        setYears([])
        setYear("")
      }
    }

    fetchAcademicYears()
  }, [degree, supabase])

  // Fetch groups when degree or year changes
  useEffect(() => {
    if (!degree || !year) {
      setFilteredGroups([])
      setGroup("")
      return
    }

    async function fetchGroups() {
      try {
        // First, get the academic_year_id for the selected year and degree
        const { data: academicYearData, error: academicYearError } = await supabase
          .from("academic_years")
          .select("id")
          .eq("degree_id", degree)
          .eq("year", year)
          .eq("is_active", true)
          .single()

        if (academicYearError || !academicYearData) {
          console.error("Error fetching academic year:", academicYearError)
          setFilteredGroups([])
          setGroup("")
          return
        }

        // Fetch groups directly from database for this academic_year_id and degree
        const { data: groupsData, error: groupsError } = await supabase
          .from("groups")
          .select("id, name, name_ru, academic_year_id, degree_id, status")
          .eq("academic_year_id", academicYearData.id)
          .eq("degree_id", degree)
          .eq("status", "active")
          .order("name", { ascending: true })

        if (groupsError) {
          console.error("Error fetching groups:", groupsError)
          setFilteredGroups([])
          setGroup("")
          return
        }

        if (groupsData && groupsData.length > 0) {
          setFilteredGroups(groupsData)

          // Set default group if available and not already set
          if (!group || !groupsData.find((g) => g.id?.toString() === group)) {
            setGroup(groupsData[0].id?.toString() || "")
          }
        } else {
          setFilteredGroups([])
          setGroup("")
        }
      } catch (error) {
        console.error("Error fetching groups:", error)
        setFilteredGroups([])
        setGroup("")
      }
    }

    fetchGroups()
  }, [degree, year, group, supabase])

  // Helper function to get localized degree name
  const getDegreeName = (degreeItem: any) => {
    if (!degreeItem) return ""
    return language === "ru" && degreeItem.name_ru ? degreeItem.name_ru : degreeItem.name || ""
  }

  // Helper function to get localized group name
  const getGroupName = (groupItem: any) => {
    return language === "ru" && groupItem.name_ru ? groupItem.name_ru : groupItem.name
  }

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword)
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      // Basic validation
      if (!email.includes("@")) {
        throw new Error(t("auth.error.invalidEmail"))
      }

      if (!degree || !year || !group) {
        throw new Error(t("auth.error.incompleteFields"))
      }

      // Create the user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          },
        },
      })

      if (authError) throw new Error(authError.message)

      // Create student profile - using the correct column names
      const { error: profileError } = await supabase.from("profiles").insert({
        id: authData.user!.id,
        full_name: name,
        role: "student",
        email: email,
        degree_id: degree,
        academic_year: year,
        group_id: group,
      })

      if (profileError) throw new Error(profileError.message)

      // Send welcome email (non-blocking)
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
      fetch(`${baseUrl}/api/send-email-notification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "welcome",
          userEmail: email,
          firstName: name.split(" ")[0],
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
      router.push("/student/login")
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.signup.error"))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center space-y-2 text-center">
          <Logo className="mb-4 h-8 w-auto max-w-[160px]" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("auth.signup.title")}</CardTitle>
            <CardDescription>{t("auth.signup.description")}</CardDescription>
          </CardHeader>
          <form onSubmit={handleSignup}>
            <CardContent className="space-y-4">
              {error && <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">{error}</div>}

              <div className="space-y-2">
                <Label htmlFor="email">{t("auth.signup.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="student@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">{t("auth.signup.name")}</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder={t("auth.signup.fullNamePlaceholder")}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="degree">{t("auth.signup.degree")}</Label>
                <Select value={degree} onValueChange={setDegree} required disabled={degrees.length === 0}>
                  <SelectTrigger id="degree" className="w-full">
                    <SelectValue placeholder={t("auth.signup.selectDegree")}>
                      {degree && degrees.length > 0
                        ? getDegreeName(degrees.find((d) => d.id?.toString() === degree))
                        : null}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {degrees.length === 0 ? (
                      <SelectItem value="no-degrees" disabled>
                        {t("auth.signup.noDegrees", "No degrees available")}
                      </SelectItem>
                    ) : (
                      degrees.map((d) => (
                        <SelectItem key={d.id} value={d.id?.toString() || ""}>
                          {getDegreeName(d)}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="year">{t("auth.signup.year")}</Label>
                  <Select value={year} onValueChange={setYear} required>
                    <SelectTrigger id="year" className="w-full">
                      <SelectValue placeholder={t("auth.signup.selectYear")} />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((y) => (
                        <SelectItem key={y} value={y}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="group">{t("auth.signup.group")}</Label>
                  <Select value={group} onValueChange={setGroup} required disabled={!degree || !year}>
                    <SelectTrigger id="group" className="w-full">
                      <SelectValue placeholder={t("auth.signup.selectGroup")} />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredGroups.map((g) => (
                        <SelectItem key={g.id} value={g.id?.toString() || ""}>
                          {getGroupName(g)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t("auth.signup.password")}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
                {isLoading ? t("auth.signup.loading") : t("auth.signup.button")}
              </Button>
              <div className="text-center text-sm">
                {t("auth.signup.hasAccount")}{" "}
                <Link href="/student/login" className="text-primary hover:underline">
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
