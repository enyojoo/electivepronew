export type ExchangeUniversity = {
  id: string
  name: string
  name_ru?: string
  country: string
  description?: string
  description_ru?: string
  max_students: number
  website?: string
  status: "active" | "inactive"
  created_at: string
  updated_at: string
  city?: string
}

export type ExchangeUniversityFormData = Omit<ExchangeUniversity, "id" | "created_at" | "updated_at">
