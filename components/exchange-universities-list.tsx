"use client"

import { useState } from "react"
import type { ExchangeUniversity } from "@/types/exchange-university"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/lib/language-context"
import { deleteExchangeUniversity } from "@/actions/exchange-universities"
import { useToast } from "@/hooks/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

interface ExchangeUniversitiesListProps {
  universities: ExchangeUniversity[]
}

export function ExchangeUniversitiesList({ universities }: ExchangeUniversitiesListProps) {
  const { language, t } = useLanguage()
  const router = useRouter()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")

  const handleDelete = async (id: string) => {
    try {
      await deleteExchangeUniversity(id)
      toast({
        title: t("success"),
        description: t("university_deleted"),
      })
    } catch (error) {
      toast({
        title: t("error"),
        description: t("university_delete_error"),
        variant: "destructive",
      })
    }
  }

  const filteredUniversities = universities.filter((university) => {
    const name = language === "ru" && university.name_ru ? university.name_ru : university.name
    return (
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      university.country.toLowerCase().includes(searchTerm.toLowerCase()) ||
      university.city.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t("exchange_universities")}</CardTitle>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder={t("search_universities")}
              className="w-[200px] pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button onClick={() => router.push("/admin/electives/exchange/new")}>{t("add_university")}</Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("name")}</TableHead>
              <TableHead>{t("country")}</TableHead>
              <TableHead>{t("city")}</TableHead>
              <TableHead className="text-center">{t("max_students")}</TableHead>
              <TableHead className="text-right">{t("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUniversities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  {t("no_universities_found")}
                </TableCell>
              </TableRow>
            ) : (
              filteredUniversities.map((university) => (
                <TableRow key={university.id}>
                  <TableCell className="font-medium">
                    {language === "ru" && university.name_ru ? university.name_ru : university.name}
                  </TableCell>
                  <TableCell>{university.country}</TableCell>
                  <TableCell>{university.city || "-"}</TableCell>
                  <TableCell className="text-center">{university.max_students}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/admin/electives/exchange/${university.id}`)}
                      >
                        {t("view")}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/admin/electives/exchange/${university.id}/edit`)}
                      >
                        {t("edit")}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            {t("delete")}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t("confirm_delete")}</AlertDialogTitle>
                            <AlertDialogDescription>{t("delete_university_confirmation")}</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(university.id)}>
                              {t("delete")}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
