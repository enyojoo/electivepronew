"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/lib/language-context"

interface ElectivePack {
  id: string
  name: string
  description: string
  maxSelections: number
}

interface ElectivePackSelectionProps {
  electivePacks: ElectivePack[]
}

export function ElectivePackSelection({ electivePacks }: ElectivePackSelectionProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { t } = useLanguage()

  // Remove useSearchParams
  // const searchParams = useSearchParams()

  const [selectedPacks, setSelectedPacks] = useState<string[]>([])

  const handlePackSelection = (packId: string) => {
    setSelectedPacks((prev) => {
      if (prev.includes(packId)) {
        return prev.filter((id) => id !== packId)
      } else {
        return [...prev, packId]
      }
    })
  }

  const handleSubmit = () => {
    if (selectedPacks.length === 0) {
      toast({
        title: t("student.courses.noPacksSelected", "No Packs Selected"),
        description: t("student.courses.selectAtLeastOne", "Please select at least one elective pack."),
      })
      return
    }

    if (selectedPacks.length > 1) {
      toast({
        title: t("student.courses.tooManyPacks", "Too Many Packs Selected"),
        description: t("student.courses.selectOnlyOne", "Please select only one elective pack."),
      })
      return
    }

    // Remove searchParams
    // const packId = searchParams?.get("packId")
    const packId = selectedPacks[0]

    router.push(`/student/courses/${packId}`)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("student.courses.selectElectivePacks", "Select Elective Packs")}</CardTitle>
        <CardDescription>
          {t("student.courses.chooseFromAvailable", "Choose from the available elective packs.")}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {electivePacks.map((pack) => (
          <div key={pack.id} className="flex items-center space-x-2">
            <Checkbox
              id={pack.id}
              checked={selectedPacks.includes(pack.id)}
              onCheckedChange={() => handlePackSelection(pack.id)}
            />
            <Label
              htmlFor={pack.id}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {pack.name}
            </Label>
          </div>
        ))}
      </CardContent>
      <Button onClick={handleSubmit}>{t("student.courses.selectCourses", "Select Courses")}</Button>
    </Card>
  )
}
