export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      academic_years: {
        Row: {
          id: string
          institution_id: string
          program_id: string
          year: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          institution_id: string
          program_id: string
          year: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          institution_id?: string
          program_id?: string
          year?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_years_institution_id_fkey"
            columns: ["institution_id"]
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_years_program_id_fkey"
            columns: ["program_id"]
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      degrees: {
        Row: {
          id: string
          institution_id: string
          name: string
          name_ru: string | null
          code: string
          duration_years: number
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          institution_id: string
          name: string
          name_ru?: string | null
          code: string
          duration_years: number
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          institution_id?: string
          name?: string
          name_ru?: string | null
          code?: string
          duration_years?: number
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "degrees_institution_id_fkey"
            columns: ["institution_id"]
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          id: string
          institution_id: string
          program_id: string
          academic_year_id: string
          name: string
          display_name: string
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          institution_id: string
          program_id: string
          academic_year_id: string
          name: string
          display_name: string
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          institution_id?: string
          program_id?: string
          academic_year_id?: string
          name?: string
          display_name?: string
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_academic_year_id_fkey"
            columns: ["academic_year_id"]
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_institution_id_fkey"
            columns: ["institution_id"]
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_program_id_fkey"
            columns: ["program_id"]
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      institutions: {
        Row: {
          id: string
          name: string
          subdomain: string
          domain: string | null
          logo_url: string | null
          primary_color: string
          created_at: string
          updated_at: string
          is_active: boolean
          subscription_plan: string
          subscription_status: string
          subscription_end_date: string | null
        }
        Insert: {
          id?: string
          name: string
          subdomain: string
          domain?: string | null
          logo_url?: string | null
          primary_color?: string
          created_at?: string
          updated_at?: string
          is_active?: boolean
          subscription_plan?: string
          subscription_status?: string
          subscription_end_date?: string | null
        }
        Update: {
          id?: string
          name?: string
          subdomain?: string
          domain?: string | null
          logo_url?: string | null
          primary_color?: string
          created_at?: string
          updated_at?: string
          is_active?: boolean
          subscription_plan?: string
          subscription_status?: string
          subscription_end_date?: string | null
        }
        Relationships: []
      }
      manager_profiles: {
        Row: {
          profile_id: string
          program_id: string | null
          degree_id: string | null
          academic_year_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          profile_id: string
          program_id?: string | null
          degree_id?: string | null
          academic_year_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          profile_id?: string
          program_id?: string | null
          degree_id?: string | null
          academic_year_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "manager_profiles_profile_id_fkey"
            columns: ["profile_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manager_profiles_program_id_fkey"
            columns: ["program_id"]
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manager_profiles_degree_id_fkey"
            columns: ["degree_id"]
            referencedRelation: "degrees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manager_profiles_academic_year_id_fkey"
            columns: ["academic_year_id"]
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          id: string
          institution_id: string | null
          full_name: string | null
          role: string
          email: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          institution_id?: string | null
          full_name?: string | null
          role: string
          email: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          institution_id?: string | null
          full_name?: string | null
          role?: string
          email?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_institution_id_fkey"
            columns: ["institution_id"]
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          id: string
          institution_id: string
          degree_id: string
          name: string
          name_ru: string | null
          code: string
          description: string | null
          description_ru: string | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          institution_id: string
          degree_id: string
          name: string
          name_ru?: string | null
          code: string
          description?: string | null
          description_ru?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          institution_id?: string
          degree_id?: string
          name?: string
          name_ru?: string | null
          code?: string
          description?: string | null
          description_ru?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "programs_degree_id_fkey"
            columns: ["degree_id"]
            referencedRelation: "degrees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programs_institution_id_fkey"
            columns: ["institution_id"]
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      student_profiles: {
        Row: {
          profile_id: string
          group_id: string | null
          enrollment_year: string
          created_at: string
          updated_at: string
        }
        Insert: {
          profile_id: string
          group_id?: string | null
          enrollment_year: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          profile_id?: string
          group_id?: string | null
          enrollment_year?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_profiles_group_id_fkey"
            columns: ["group_id"]
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_profiles_profile_id_fkey"
            columns: ["profile_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      // Add elective-related tables here
      elective_packs: {
        Row: {
          id: string
          institution_id: string
          name: string
          name_ru: string | null
          description: string | null
          description_ru: string | null
          type: string
          status: string
          academic_year_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          institution_id: string
          name: string
          name_ru?: string | null
          description?: string | null
          description_ru?: string | null
          type: string
          status?: string
          academic_year_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          institution_id?: string
          name?: string
          name_ru?: string | null
          description?: string | null
          description_ru?: string | null
          type?: string
          status?: string
          academic_year_id?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "elective_packs_academic_year_id_fkey"
            columns: ["academic_year_id"]
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elective_packs_institution_id_fkey"
            columns: ["institution_id"]
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          id: string
          institution_id: string
          elective_pack_id: string | null
          name: string
          name_ru: string | null
          degree_id: string | null
          instructor_en: string | null
          instructor_ru: string | null
          description: string | null
          description_ru: string | null
          max_students: number
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          institution_id: string
          elective_pack_id?: string | null
          name: string
          name_ru?: string | null
          degree_id?: string | null
          instructor_en?: string | null
          instructor_ru?: string | null
          description?: string | null
          description_ru?: string | null
          max_students?: number
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          institution_id?: string
          elective_pack_id?: string | null
          name?: string
          name_ru?: string | null
          degree_id?: string | null
          instructor_en?: string | null
          instructor_ru?: string | null
          description?: string | null
          description_ru?: string | null
          max_students?: number
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_elective_pack_id_fkey"
            columns: ["elective_pack_id"]
            referencedRelation: "elective_packs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_institution_id_fkey"
            columns: ["institution_id"]
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      program_electives: {
        Row: {
          id: string
          program_id: string
          elective_pack_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          program_id: string
          elective_pack_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          program_id?: string
          elective_pack_id?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_electives_elective_pack_id_fkey"
            columns: ["elective_pack_id"]
            referencedRelation: "elective_packs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_electives_program_id_fkey"
            columns: ["program_id"]
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      student_selections: {
        Row: {
          id: string
          student_id: string
          elective_pack_id: string
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          student_id: string
          elective_pack_id: string
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          elective_pack_id?: string
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_selections_elective_pack_id_fkey"
            columns: ["elective_pack_id"]
            referencedRelation: "elective_packs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_selections_student_id_fkey"
            columns: ["student_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      selection_courses: {
        Row: {
          id: string
          selection_id: string
          course_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          selection_id: string
          course_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          selection_id?: string
          course_id?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "selection_courses_course_id_fkey"
            columns: ["course_id"]
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "selection_courses_selection_id_fkey"
            columns: ["selection_id"]
            referencedRelation: "student_selections"
            referencedColumns: ["id"]
          },
        ]
      }
      elective_exchange: {
        Row: {
          id: string
          institution_id: string
          name: string
          name_ru: string | null
          description: string | null
          description_ru: string | null
          deadline: string
          max_selections: number
          status: string
          universities: string[] // Array of university IDs
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          institution_id: string
          name: string
          name_ru?: string | null
          description?: string | null
          description_ru?: string | null
          deadline: string
          max_selections: number
          status?: string
          universities: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          institution_id?: string
          name?: string
          name_ru?: string | null
          description?: string | null
          description_ru?: string | null
          deadline?: string
          max_selections?: number
          status?: string
          universities?: string[]
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "elective_exchange_institution_id_fkey"
            columns: ["institution_id"]
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      exchange_universities: {
        Row: {
          id: string
          elective_pack_id: string | null
          name: string
          name_ru: string | null
          country: string
          language: string | null
          max_students: number
          website: string | null
          description: string | null
          description_ru: string | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          elective_pack_id?: string | null
          name: string
          name_ru?: string | null
          country: string
          language?: string | null
          max_students: number
          website?: string | null
          description?: string | null
          description_ru?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          elective_pack_id?: string | null
          name?: string
          name_ru?: string | null
          country?: string
          language?: string | null
          max_students?: number
          website?: string | null
          description?: string | null
          description_ru?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exchange_universities_elective_pack_id_fkey"
            columns: ["elective_pack_id"]
            referencedRelation: "elective_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      exchange_selections: {
        Row: {
          id: string
          student_id: string
          elective_exchange_id: string
          selected_universities: string[] // Array of university IDs
          statement_url: string | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          student_id: string
          elective_exchange_id: string
          selected_universities: string[]
          statement_url?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          elective_exchange_id?: string
          selected_universities?: string[]
          statement_url?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exchange_selections_student_id_fkey"
            columns: ["student_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exchange_selections_elective_exchange_id_fkey"
            columns: ["elective_exchange_id"]
            referencedRelation: "elective_exchange"
            referencedColumns: ["id"]
          },
        ]
      }
      countries: {
        Row: {
          id: string
          name: string
          name_ru: string | null
          code: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          name_ru?: string | null
          code: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          name_ru?: string | null
          code?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  auth: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          created_at: string
          updated_at: string
        }
      }
    }
  }
}
