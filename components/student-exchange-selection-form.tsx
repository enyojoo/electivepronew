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
import { useLanguage } from "@/lib/language-context"
import { useToast } from "@/hooks/use-toast"
import type { ExchangeUniversity } from "@/types/exchange-university"
import { createStudentExchangeSelection } from "@/actions/student-exchange-selections"
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { restrictToVerticalAxis } from "@dnd-kit/modifiers"
import { GripVertical } from "lucide-react"

interface StudentExchangeSelectionFormProps {
  electivePackId: string
  universities: ExchangeUniversity[]
  maxSelections: number
}

interface SortableUniversityItemProps {
  university: ExchangeUniversity
  index: number
}

function SortableUniversityItem({ university, index }: SortableUniversityItemProps) {
  const { language } = useLanguage()
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: university.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} className="flex items-center p-3 mb-2 bg-white border rounded-md shadow-sm">
      <div {...attributes} {...listeners} className="mr-2 cursor-grab">
        <GripVertical className="h-5 w-5 text-gray-400" />
      </div>
      <div className="flex-1">
        <p className="font-medium">
          {index + 1}. {language === "ru" && university.name_ru ? university.name_ru : university.name}
        </p>
        <p className="text-sm text-gray-500">
          {university.city}, {university.country}
        </p>
      </div>
    </div>
  )
}

export function StudentExchangeSelectionForm({
  electivePackId,
  universities,
  maxSelections,
}: StudentExchangeSelectionFormProps) {
  const { t } = useLanguage()
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedUniversities, setSelectedUniversities] = useState<ExchangeUniversity[]>([])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const formSchema = z.object({
    motivationLetterUrl: z.string().url().optional().or(z.literal("")),
    transcriptUrl: z.string().url().optional().or(z.literal("")),
  })

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      motivationLetterUrl: "",
      transcriptUrl: "",
    },
  })

  const handleAddUniversity = (universityId: string) => {
    const university = universities.find((u) => u.id === universityId)
    if (university && !selectedUniversities.some((u) => u.id === universityId)) {
      if (selectedUniversities.length < maxSelections) {
        setSelectedUniversities([...selectedUniversities, university])
      } else {
        toast({
          title: t("error"),
          description: t("max_selections_reached", { count: maxSelections }),
          variant: "destructive",
        })
      }
    }
  }

  const handleRemoveUniversity = (universityId: string) => {
    setSelectedUniversities(selectedUniversities.filter((u) => u.id !== universityId))
  }

  const handleDragEnd = (event: any) => {
    const { active, over } = event

    if (active.id !== over.id) {
      const oldIndex = selectedUniversities.findIndex((u) => u.id === active.id)
      const newIndex = selectedUniversities.findIndex((u) => u.id === over.id)

      const newSelectedUniversities = [...selectedUniversities]
      const [movedItem] = newSelectedUniversities.splice(oldIndex, 1)
      newSelectedUniversities.splice(newIndex, 0, movedItem)

      setSelectedUniversities(newSelectedUniversities)
    }
  }

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (selectedUniversities.length === 0) {
      toast({
        title: t("error"),
        description: t("select_at_least_one_university"),
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      await createStudentExchangeSelection({
        electivePackId,
        universities: selectedUniversities.map((u, index) => ({
          universityId: u.id,
          preferenceOrder: index + 1,
        })),
        motivationLetterUrl: values.motivationLetterUrl,
        transcriptUrl: values.transcriptUrl,
      })

      toast({
        title: t("success"),
        description: t("selection_submitted"),
      })

      router.push("/student/electives/exchange")
    } catch (error) {
      toast({
        title: t("error"),
        description: t("selection_submit_error"),
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const availableUniversities = universities.filter((u) => !selectedUniversities.some((su) => su.id === u.id))

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("exchange_university_selection")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-lg font-medium mb-2">{t("selected_universities")}</h3>
          <p className="text-sm text-gray-500 mb-4">
            {t("drag_to_reorder")}. {t("max_selections", { count: maxSelections })}.
          </p>

          {selectedUniversities.length === 0 ? (
            <p className="text-sm text-gray-500">{t("no_universities_selected")}</p>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
              modifiers={[restrictToVerticalAxis]}
            >
              <SortableContext items={selectedUniversities.map((u) => u.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {selectedUniversities.map((university, index) => (
                    <div key={university.id} className="flex items-center">
                      <SortableUniversityItem university={university} index={index} />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-2"
                        onClick={() => handleRemoveUniversity(university.id)}
                      >
                        {t("remove")}
                      </Button>
                    </div>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        <div>
          <h3 className="text-lg font-medium mb-2">{t("available_universities")}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableUniversities.map((university) => (
              <Card key={university.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <h4 className="font-medium">{university.name}</h4>
                  <p className="text-sm text-gray-500">
                    {university.city}, {university.country}
                  </p>
                  <p className="text-sm mt-2">
                    {t("max_students")}: {university.max_students}
                  </p>
                  {university.language && (
                    <p className="text-sm">
                      {t("language")}: {university.language}
                    </p>
                  )}
                </CardContent>
                <CardFooter className="bg-gray-50 p-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => handleAddUniversity(university.id)}
                  >
                    {t("add_to_selection")}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="motivationLetterUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("motivation_letter_url")}</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormDescription>{t("motivation_letter_url_description")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="transcriptUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("transcript_url")}</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormDescription>{t("transcript_url_description")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/student/electives/exchange")}
                disabled={isSubmitting}
              >
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={isSubmitting || selectedUniversities.length === 0}>
                {isSubmitting ? t("submitting") : t("submit_selection")}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
