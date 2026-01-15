"use client"

import type React from "react"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { useLanguage } from "@/lib/language-context"
import { LanguageSwitcher } from "@/components/language-switcher"
import Logo from "@/components/logo"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { Eye, EyeOff, Mail } from "lucide-react"
import Indicator from "@/components/indicator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

function ManagerLoginForm() {
  const { t } = useLanguage()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

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
      router.replace("/manager/login", { scroll: false })
    }
  }, [searchParams, router, toast, t])

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword)
  }

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
          throw new Error(errorData.error || "Failed to verify user role")
        }

        const { role } = await response.json()

        if (role === "program_manager") {
          toast({
            title: "Login successful",
            description: "Welcome to the manager dashboard",
          })
          router.push("/manager/dashboard")
        } else {
          // User is authenticated but not a manager
          await supabase.auth.signOut()
          setError("You do not have manager access")
        }
      }
    } catch (err) {
      console.error("Login error:", err)
      setError("Login failed. Please try again.")
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="manager@example.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t("auth.login.password")}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    onClick={togglePasswordVisibility}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <div className="text-sm text-right">
                <Link href="/manager/forgot-password" className="text-primary hover:underline">
                  {t("auth.login.forgotPassword")}
                </Link>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? t("auth.login.loggingIn") : t("auth.login.button")}
              </Button>

              <p className="text-sm text-center">
                {t("auth.login.noAccount")}{" "}
                <Link href="/manager/signup" className="text-primary hover:underline">
                  {t("auth.login.register")}
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
        <div className="flex justify-center">
          <LanguageSwitcher />
        </div>
        <Indicator />
      </div>
    </div>
  )
}

export default function ManagerLoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ManagerLoginForm />
    </Suspense>
  )
}
