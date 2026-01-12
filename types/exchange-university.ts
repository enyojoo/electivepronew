export type ExchangeUniversity = {
  id: string
  elective_pack_id: string
  name: string
  name_ru?: string
  country: string
  description?: string
  description_ru?: string
  language?: string
  max_students: number
  website_url?: string
  logo_url?: string
  status: "active" | "inactive"
  created_at: string
  updated_at: string
}

export type ExchangeUniversityFormData = Omit<ExchangeUniversity, "id" | "created_at" | "updated_at">
