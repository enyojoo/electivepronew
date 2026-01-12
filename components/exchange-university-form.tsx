"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import { useLanguage } from "@/lib/language-context"
import { useToast } from "@/hooks/use-toast"
import type { ExchangeUniversity, ExchangeUniversityFormData } from "@/types/exchange-university"
import { createExchangeUniversity, updateExchangeUniversity } from "@/actions/exchange-universities"
import { getSortedCountries, type Country } from "@/lib/countries"
import { CountrySelect } from "@/components/ui/country-select"

interface ExchangeUniversityFormProps {
  university?: ExchangeUniversity
  electivePacks: { id: string; title: string }[]
  countries: { code: string; name: string; name_ru?: string }[]
}

export function ExchangeUniversityForm({ university, electivePacks, countries }: ExchangeUniversityFormProps) {
  const { language, t } = useLanguage()
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const formSchema = z.object({
    name: z.string().min(1, t("name_required")),
    name_ru: z.string().optional(),
    country: z.string().min(1, t("country_required")),
    description: z.string().optional(),
    description_ru: z.string().optional(),
    max_students: z.number().int().min(1, t("max_students_positive")),
    website: z.string().url().optional().or(z.literal("")),
    status: z.enum(["active", "inactive"]),
  })

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: university
      ? {
          ...university,
          max_students: university.max_students || 3,
        }
      : {
          name: "",
          name_ru: "",
          country: "",
          description: "",
          description_ru: "",
          max_students: 3,
          website: "",
          status: "active",
        },
  })

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true)
    try {
      if (university) {
        await updateExchangeUniversity(university.id, values)
        toast({
          title: t("success"),
          description: t("university_updated"),
        })
      } else {
        await createExchangeUniversity(values as ExchangeUniversityFormData)
        toast({
          title: t("success"),
          description: t("university_created"),
        })
      }
      router.push("/admin/electives/exchange")
    } catch (error) {
      toast({
        title: t("error"),
        description: university ? t("university_update_error") : t("university_create_error"),
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{university ? t("edit_university") : t("add_university")}</CardTitle>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("name")} (EN)</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name_ru"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("name")} (RU)</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("country")}</FormLabel>
                  <FormControl>
                    <CountrySelect
                      value={field.value}
                      onValueChange={field.onChange}
                      countries={getSortedCountries(language)}
                      language={language}
                      placeholder={t("select_country")}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="max_students"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("max_students")}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      {...field}
                      onChange={(e) => field.onChange(Number.parseInt(e.target.value))}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormDescription>{t("max_students_description")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("description")} (EN)</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={4} disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description_ru"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("description")} (RU)</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={4} disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("website")}</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("status")}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("select_status")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">{t("active")}</SelectItem>
                      <SelectItem value="inactive">{t("inactive")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/admin/electives/exchange")}
              disabled={isSubmitting}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("saving")}
                </>
              ) : (
                university ? t("update") : t("create")
              )}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  )
}
