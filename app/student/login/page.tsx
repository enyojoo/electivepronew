"use client"

import type React from "react"

import { useState, useEffect, Suspense } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import { LanguageSwitcher } from "@/components/language-switcher"
import { useLanguage } from "@/lib/language-context"
import Logo from "@/components/logo"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { useToast } from "@/components/ui/use-toast"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, Mail } from "lucide-react"
import Indicator from "@/components/indicator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

function StudentLoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useLanguage()
  const { toast } = useToast()

  const supabase = getSupabaseBrowserClient()

  // Check if user was redirected from signup with email verification required
  useEffect(() => {
    if (searchParams.get("verify") === "email") {
      toast({
        title: t("auth.signup.success"),
        description: t("auth.signup.emailVerificationRequired"),
        duration: 10000,
      })
      // Clean up URL
      router.replace("/student/login", { scroll: false })
    }
  }, [searchParams, router, toast, t])

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword)
  }

  // Update the handleLogin function to handle missing profiles
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError(error.message)
        return
      }

      if (data.session) {
        // Use a server API endpoint to check the role instead of direct query
        const response = await fetch("/api/auth/check-role", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${data.session.access_token}`,
          },
          body: JSON.stringify({ userId: data.session.user.id }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || t("auth.login.failedToVerifyRole"))
        }

        const { role } = await response.json()

        if (role === "student") {
          toast({
            title: t("auth.login.success"),
            description: t("auth.login.welcomeStudent"),
          })
          router.push("/student/dashboard")
        } else {
          // User is authenticated but not a student
          await supabase.auth.signOut()
          setError(t("auth.login.noStudentAccess"))
        }
      }
    } catch (err) {
      console.error("Login error:", err)
      setError(t("auth.login.failed"))
    } finally {
      setIsLoading(false)
    }
  }

  // Remove loading indicator - render the page immediately

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center space-y-2 text-center">
          <Logo className="mb-4 h-8 w-auto max-w-[160px]" />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{t("auth.login.title")}</CardTitle>
            <CardDescription>{t("auth.login.description")}</CardDescription>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              {searchParams.get("verify") === "email" && (
                <Alert>
                  <Mail className="h-4 w-4" />
                  <AlertTitle>{t("auth.signup.success")}</AlertTitle>
                  <AlertDescription>{t("auth.signup.emailVerificationRequired")}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">{t("auth.login.email")}</Label>
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
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">{t("auth.login.password")}</Label>
                  <Link href="/student/forgot-password" className="text-xs text-primary hover:underline">
                    {t("auth.login.forgotPassword")}
                  </Link>
                </div>
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

              {error && <p className="text-red-500 text-sm">{error}</p>}
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? t("auth.login.loading") : t("auth.login.button")}
              </Button>
              <div className="text-center text-sm">
                {t("auth.login.noAccount")}{" "}
                <Link href="/student/signup" className="text-primary hover:underline">
                  {t("auth.login.signUp")}
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

export default function StudentLoginPage() {
  return (
    <Suspense fallback={null}>
      <StudentLoginForm />
    </Suspense>
  )
}
