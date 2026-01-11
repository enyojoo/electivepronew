"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@supabase/supabase-js"
import Link from "next/link"
import Image from "next/image"
import { LanguageSwitcher } from "@/components/language-switcher"
import { useLanguage } from "@/lib/language-context"
import { useToast } from "@/components/ui/use-toast"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState("")
  const { t } = useLanguage()
  const { toast } = useToast()

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      // Check if email exists and is an admin
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email)
        .eq("role", "admin")
        .single()

      if (profileError) {
        throw new Error(t("auth.forgotPassword.emailNotFound"))
      }

      // Send password reset email
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/admin/reset-password`,
      })

      if (error) throw error

      toast({
        title: t("auth.forgotPassword.emailSent"),
        description: t("auth.forgotPassword.checkEmail"),
      })

      setIsSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.forgotPassword.errorMessage"))
    } finally {
      setIsLoading(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-6 bg-background">
        <div className="mx-auto max-w-md space-y-6 w-full">
          <div className="flex justify-center mb-6">
            <Image
              src="https://pbqvvvdhssghkpvsluvw.supabase.co/storage/v1/object/public/logos//epro_logo.svg"
              alt="ElectivePRO Logo"
              width={160}
              height={45}
              className="h-10 w-auto"
            />
          </div>
          <Card>
            <CardHeader>
              <CardTitle>{t("auth.forgotPassword.checkEmail")}</CardTitle>
              <CardDescription>{t("auth.forgotPassword.resetLinkSent").replace("{email}", email)}</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground">{t("auth.forgotPassword.checkEmailInstructions")}</p>
            </CardContent>
            <CardFooter>
              <Link href="/admin/login" className="w-full">
                <Button variant="outline" className="w-full">
                  {t("auth.forgotPassword.backToLogin")}
                </Button>
              </Link>
            </CardFooter>
          </Card>
          <div className="flex justify-center mt-6">
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-6 bg-background">
      <div className="mx-auto max-w-md space-y-6 w-full">
        <div className="flex justify-center mb-6">
          <Image
            src="https://pbqvvvdhssghkpvsluvw.supabase.co/storage/v1/object/public/logos//epro_logo.svg"
            alt="ElectivePRO Logo"
            width={160}
            height={45}
            className="h-10 w-auto"
          />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{t("auth.forgotPassword.title")}</CardTitle>
            <CardDescription>{t("auth.forgotPassword.description")}</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t("auth.login.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder={t("auth.login.email")}
                />
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? t("auth.forgotPassword.sending") : t("auth.forgotPassword.sendResetLink")}
              </Button>

              <p className="text-sm text-center">
                <Link href="/admin/login" className="text-primary hover:underline">
                  {t("auth.forgotPassword.backToLogin")}
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
        <div className="flex justify-center mt-6">
          <LanguageSwitcher />
        </div>
      </div>
    </div>
  )
}
