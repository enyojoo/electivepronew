export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      academic_years: {
        Row: {
          id: string
          year: string
          is_active: boolean | null
          created_at: string
          updated_at: string
          degree_id: string
        }
        Insert: {
          id?: string
          year: string
          is_active?: boolean | null
          created_at?: string
          updated_at?: string
          degree_id: string
        }
        Update: {
          id?: string
          year?: string
          is_active?: boolean | null
          created_at?: string
          updated_at?: string
          degree_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_years_degree_id_fkey"
            columns: ["degree_id"]
            referencedRelation: "degrees"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          id: string
          name: string
          name_ru: string | null
          description: string | null
          description_ru: string | null
          max_students: number
          status: string
          created_at: string
          updated_at: string
          instructor_en: string | null
          instructor_ru: string | null
          degree_id: string | null
        }
        Insert: {
          id?: string
          name: string
          name_ru?: string | null
          description?: string | null
          description_ru?: string | null
          max_students?: number
          status?: string
          created_at?: string
          updated_at?: string
          instructor_en?: string | null
          instructor_ru?: string | null
          degree_id?: string | null
        }
        Update: {
          id?: string
          name?: string
          name_ru?: string | null
          description?: string | null
          description_ru?: string | null
          max_students?: number
          status?: string
          created_at?: string
          updated_at?: string
          instructor_en?: string | null
          instructor_ru?: string | null
          degree_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "courses_degree_id_fkey"
            columns: ["degree_id"]
            referencedRelation: "degrees"
            referencedColumns: ["id"]
          },
        ]
      }
      course_selections: {
        Row: {
          id: string
          student_id: string
          elective_courses_id: string
          status: string
          statement_url: string | null
          created_at: string
          updated_at: string
          selected_course_ids: string[] | null
          authorized_by: string | null
        }
        Insert: {
          id?: string
          student_id: string
          elective_courses_id: string
          status?: string
          statement_url?: string | null
          created_at?: string
          updated_at?: string
          selected_course_ids?: string[] | null
          authorized_by?: string | null
        }
        Update: {
          id?: string
          student_id?: string
          elective_courses_id?: string
          status?: string
          statement_url?: string | null
          created_at?: string
          updated_at?: string
          selected_course_ids?: string[] | null
          authorized_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_selections_elective_courses_id_fkey"
            columns: ["elective_courses_id"]
            referencedRelation: "elective_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_selections_student_id_fkey"
            columns: ["student_id"]
            referencedRelation: "profiles"
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
      elective_courses: {
        Row: {
          id: string
          name: string
          name_ru: string | null
          status: string
          created_at: string
          updated_at: string
          academic_year: string | null
          semester: string | null
          created_by: string | null
          deadline: string | null
          max_selections: number
          syllabus_template_url: string | null
          courses: string[] | null
          group_id: string | null
          requires_statement: boolean
        }
        Insert: {
          id?: string
          name: string
          name_ru?: string | null
          status?: string
          created_at?: string
          updated_at?: string
          academic_year?: string | null
          semester?: string | null
          created_by?: string | null
          deadline?: string | null
          max_selections?: number
          syllabus_template_url?: string | null
          courses?: string[] | null
          group_id?: string | null
          requires_statement?: boolean
        }
        Update: {
          id?: string
          name?: string
          name_ru?: string | null
          status?: string
          created_at?: string
          updated_at?: string
          academic_year?: string | null
          semester?: string | null
          created_by?: string | null
          deadline?: string | null
          max_selections?: number
          syllabus_template_url?: string | null
          courses?: string[] | null
          group_id?: string | null
          requires_statement?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "elective_courses_academic_year_fkey"
            columns: ["academic_year"]
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elective_courses_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elective_courses_group_id_fkey"
            columns: ["group_id"]
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      elective_exchange: {
        Row: {
          id: string
          name: string
          name_ru: string | null
          semester: string
          academic_year: string
          status: string
          created_by: string | null
          created_at: string
          updated_at: string
          deadline: string | null
          max_selections: number
          statement_template_url: string | null
          universities: string[] | null
          group_id: string | null
        }
        Insert: {
          id?: string
          name: string
          name_ru?: string | null
          semester: string
          academic_year: string
          status?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
          deadline?: string | null
          max_selections?: number
          statement_template_url?: string | null
          universities?: string[] | null
          group_id?: string | null
        }
        Update: {
          id?: string
          name?: string
          name_ru?: string | null
          semester?: string
          academic_year?: string
          status?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
          deadline?: string | null
          max_selections?: number
          statement_template_url?: string | null
          universities?: string[] | null
          group_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "elective_exchange_academic_year_fkey"
            columns: ["academic_year"]
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elective_exchange_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elective_exchange_group_id_fkey"
            columns: ["group_id"]
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      exchange_selections: {
        Row: {
          id: string
          student_id: string
          elective_exchange_id: string
          status: string
          statement_url: string | null
          created_at: string
          updated_at: string
          selected_university_ids: string[] | null
          authorized_by: string | null
        }
        Insert: {
          id?: string
          student_id: string
          elective_exchange_id: string
          status?: string
          statement_url?: string | null
          created_at?: string
          updated_at?: string
          selected_university_ids?: string[] | null
          authorized_by?: string | null
        }
        Update: {
          id?: string
          student_id?: string
          elective_exchange_id?: string
          status?: string
          statement_url?: string | null
          created_at?: string
          updated_at?: string
          selected_university_ids?: string[] | null
          authorized_by?: string | null
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
      semesters: {
        Row: {
          id: string
          name: string
          name_ru: string
          code: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          name_ru: string
          code: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          name_ru?: string
          code?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      universities: {
        Row: {
          id: string
          name: string
          name_ru: string | null
          country: string
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
          name: string
          name_ru?: string | null
          country: string
          max_students?: number
          website?: string | null
          description?: string | null
          description_ru?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          name_ru?: string | null
          country?: string
          max_students?: number
          website?: string | null
          description?: string | null
          description_ru?: string | null
          status?: string
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