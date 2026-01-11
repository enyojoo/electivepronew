"use client"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, ExternalLink, Edit } from "lucide-react"
import { useLanguage } from "@/lib/language-context"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { useCachedUniversity } from "@/hooks/use-cached-university"
import { useCachedCountries } from "@/hooks/use-cached-countries"
import { useDataCache } from "@/lib/data-cache-context"

interface University {
  id: string
  name: string
  name_ru: string | null
  country: string
  city: string
  city_ru: string | null
  website: string | null
  status: string
  max_students: number
  created_at: string
  updated_at: string
  university_languages: string[] | null
  university_programs: string[] | null
  description?: string
  description_ru?: string | null
}

export default function UniversityDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const { t, language } = useLanguage()
  const { toast } = useToast()
  const supabase = getSupabaseBrowserClient()
  const { invalidateCache } = useDataCache()

  // Use our custom hooks for cached data
  const { university } = useCachedUniversity(params.id as string)
  const { countries } = useCachedCountries()

  const getLocalizedName = (university: University) => {
    if (language === "ru" && university.name_ru) {
      return university.name_ru
    }
    return university.name
  }

  const getLocalizedCity = (university: University) => {
    if (language === "ru" && university.city_ru) {
      return university.city_ru
    }
    return university.city
  }

  const getLocalizedCountry = (countryCode: string) => {
    const country = countries.find((c) => c.code === countryCode)
    if (!country) return countryCode

    if (language === "ru" && country.name_ru) {
      return country.name_ru
    }
    return country.name
  }

  const getLocalizedDescription = (university: University) => {
    if (language === "ru" && university.description_ru) {
      return university.description_ru
    }
    return university.description || ""
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">
            {t("admin.universities.status.active", "Active")}
          </Badge>
        )
      case "inactive":
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-800 hover:bg-gray-100 border-gray-200">
            {t("admin.universities.status.inactive", "Inactive")}
          </Badge>
        )
      case "draft":
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-200">
            {t("admin.universities.status.draft", "Draft")}
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // If we don't have university data yet, return minimal UI
  if (!university) {
    return (
      <DashboardLayout>
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link href="/admin/universities">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/admin/universities">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-3xl font-bold tracking-tight">{getLocalizedName(university)}</h1>
            <div className="ml-2">{getStatusBadge(university.status)}</div>
          </div>
          <div>
            <Link href={`/admin/universities/${university.id}/edit`}>
              <Button variant="outline">
                <Edit className="mr-2 h-4 w-4" />
                {t("admin.universities.edit", "Edit")}
              </Button>
            </Link>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("admin.universities.details", "University Details")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">
                  {t("admin.universities.nameEn", "Name (English)")}
                </h3>
                <p className="text-lg">{university.name}</p>
              </div>
              {university.name_ru && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">
                    {t("admin.universities.nameRu", "Name (Russian)")}
                  </h3>
                  <p className="text-lg">{university.name_ru}</p>
                </div>
              )}
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">
                  {t("admin.universities.country", "Country")}
                </h3>
                <p>{getLocalizedCountry(university.country)}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">
                  {t("admin.universities.cityEn", "City (English)")}
                </h3>
                <p>{university.city}</p>
              </div>
              {university.city_ru && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">
                    {t("admin.universities.cityRu", "City (Russian)")}
                  </h3>
                  <p>{university.city_ru}</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">
                  {t("admin.universities.status.label", "Status")}
                </h3>
                <p className="mt-1">{getStatusBadge(university.status)}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">
                  {t("admin.universities.maxStudents", "Max Students")}
                </h3>
                <p className="mt-1">{university.max_students}</p>
              </div>
            </div>

            {university.website && (
              <>
                <Separator />
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">
                    {t("admin.universities.website", "Website")}
                  </h3>
                  <a
                    href={university.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary flex items-center hover:underline"
                  >
                    {university.website}
                    <ExternalLink className="ml-1 h-3 w-3" />
                  </a>
                </div>
              </>
            )}

            {university.description || university.description_ru ? (
              <>
                <Separator />
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">
                    {t("admin.universities.description", "Description")}
                  </h3>
                  <p className="whitespace-pre-line">{getLocalizedDescription(university)}</p>
                </div>
              </>
            ) : null}

            {university.university_languages && university.university_languages.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">
                    {t("admin.universities.languages", "Languages of Instruction")}
                  </h3>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {university.university_languages.map((language) => (
                      <Badge key={language} variant="secondary">
                        {language}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            {university.university_programs && university.university_programs.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">
                    {t("admin.universities.programs", "Available Programs")}
                  </h3>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {university.university_programs.map((program) => (
                      <Badge key={program} variant="secondary">
                        {program}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            <Separator />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
