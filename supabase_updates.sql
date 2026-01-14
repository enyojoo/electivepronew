-- Update SQL for course_selections and exchange_selections tables
-- Run this in Supabase SQL Editor

-- Drop existing tables if they exist
DROP TABLE IF EXISTS public.course_selections CASCADE;
DROP TABLE IF EXISTS public.exchange_selections CASCADE;

-- course_selections table
create table public.course_selections (
  id uuid not null default gen_random_uuid (),
  student_id uuid not null,
  elective_courses_id uuid not null,
  status character varying(50) null default 'pending'::character varying,
  statement_url character varying(255) null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  selected_course_ids uuid[] null,
  authorized_by text null,
  constraint course_selections_pkey primary key (id),
  constraint course_selections_elective_courses_id_fkey foreign KEY (elective_courses_id) references elective_courses (id) on delete RESTRICT,
  constraint course_selections_student_id_fkey foreign KEY (student_id) references profiles (id) on delete CASCADE,
  constraint course_selections_status_check check (
    (
      (status)::text = any (
        (
          array[
            'pending'::character varying,
            'approved'::character varying,
            'rejected'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_course_selections_student_id on public.course_selections using btree (student_id) TABLESPACE pg_default;

create index IF not exists idx_course_selections_elective_courses_id on public.course_selections using btree (elective_courses_id) TABLESPACE pg_default;

create index IF not exists idx_course_selections_status on public.course_selections using btree (status) TABLESPACE pg_default;

create trigger update_course_selections_updated_at BEFORE
update on course_selections for EACH row
execute FUNCTION update_updated_at ();

-- exchange_selections table
create table public.exchange_selections (
  id uuid not null default gen_random_uuid (),
  student_id uuid not null,
  elective_exchange_id uuid not null,
  status character varying(50) null default 'pending'::character varying,
  statement_url character varying(255) null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  selected_university_ids uuid[] null,
  authorized_by text null,
  constraint exchange_selections_pkey primary key (id),
  constraint exchange_selections_elective_exchange_id_fkey foreign KEY (elective_exchange_id) references elective_exchange (id) on delete RESTRICT,
  constraint exchange_selections_student_id_fkey foreign KEY (student_id) references profiles (id) on delete CASCADE,
  constraint exchange_selections_status_check check (
    (
      (status)::text = any (
        (
          array[
            'pending'::character varying,
            'approved'::character varying,
            'rejected'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_exchange_selections_student_id on public.exchange_selections using btree (student_id) TABLESPACE pg_default;

create index IF not exists idx_exchange_selections_elective_exchange_id on public.exchange_selections using btree (elective_exchange_id) TABLESPACE pg_default;

create index IF not exists idx_exchange_selections_status on public.exchange_selections using btree (status) TABLESPACE pg_default;

create trigger update_exchange_selections_updated_at BEFORE
update on exchange_selections for EACH row
execute FUNCTION update_updated_at ();

-- Enable Row Level Security
ALTER TABLE public.elective_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elective_exchange ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_selections ENABLE ROW LEVEL SECURITY;

-- Elective Courses RLS Policies

-- Students can view published courses for their group
CREATE POLICY "Students can view published courses for their group" ON public.elective_courses
    FOR SELECT USING (
        status = 'published' AND
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role = 'student'
            AND p.group_id = elective_courses.group_id
        )
    );

-- Managers can view courses they created
CREATE POLICY "Managers can view courses they created" ON public.elective_courses
    FOR SELECT USING (
        created_by = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'program_manager'
        )
    );

-- Managers can insert courses
CREATE POLICY "Managers can insert courses" ON public.elective_courses
    FOR INSERT WITH CHECK (
        created_by = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'program_manager'
        )
    );

-- Managers can update courses they created
CREATE POLICY "Managers can update courses they created" ON public.elective_courses
    FOR UPDATE USING (
        created_by = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'program_manager'
        )
    )
    WITH CHECK (
        created_by = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'program_manager'
        )
    );

-- Managers can delete courses they created
CREATE POLICY "Managers can delete courses they created" ON public.elective_courses
    FOR DELETE USING (
        created_by = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'program_manager'
        )
    );

-- Admins have full access to elective courses
CREATE POLICY "Admins have full access to elective courses" ON public.elective_courses
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- Elective Exchange RLS Policies

-- Students can view published exchange programs for their group
CREATE POLICY "Students can view published exchange programs for their group" ON public.elective_exchange
    FOR SELECT USING (
        status = 'published' AND
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role = 'student'
            AND p.group_id = elective_exchange.group_id
        )
    );

-- Managers can view exchange programs they created
CREATE POLICY "Managers can view exchange programs they created" ON public.elective_exchange
    FOR SELECT USING (
        created_by = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'program_manager'
        )
    );

-- Managers can insert exchange programs
CREATE POLICY "Managers can insert exchange programs" ON public.elective_exchange
    FOR INSERT WITH CHECK (
        created_by = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'program_manager'
        )
    );

-- Managers can update exchange programs they created
CREATE POLICY "Managers can update exchange programs they created" ON public.elective_exchange
    FOR UPDATE USING (
        created_by = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'program_manager'
        )
    )
    WITH CHECK (
        created_by = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'program_manager'
        )
    );

-- Managers can delete exchange programs they created
CREATE POLICY "Managers can delete exchange programs they created" ON public.elective_exchange
    FOR DELETE USING (
        created_by = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'program_manager'
        )
    );

-- Admins have full access to elective exchange
CREATE POLICY "Admins have full access to elective exchange" ON public.elective_exchange
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- Course Selections RLS Policies

-- Students can view their own selections
CREATE POLICY "Students can view own course selections" ON public.course_selections
    FOR SELECT USING (auth.uid() = student_id);

-- Students can insert their own selections
CREATE POLICY "Students can insert own course selections" ON public.course_selections
    FOR INSERT WITH CHECK (auth.uid() = student_id);

-- Students can update their own selections
CREATE POLICY "Students can update own course selections" ON public.course_selections
    FOR UPDATE USING (auth.uid() = student_id)
    WITH CHECK (auth.uid() = student_id);

-- Managers can view selections for electives they created
CREATE POLICY "Managers can view course selections for their electives" ON public.course_selections
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.elective_courses ec
            WHERE ec.id = elective_courses_id
            AND ec.created_by = auth.uid()
            AND EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = auth.uid() AND p.role = 'program_manager'
            )
        )
    );

-- Managers can update status and authorized_by for selections in their electives
CREATE POLICY "Managers can update course selection status" ON public.course_selections
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.elective_courses ec
            WHERE ec.id = elective_courses_id
            AND ec.created_by = auth.uid()
            AND EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = auth.uid() AND p.role = 'program_manager'
            )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.elective_courses ec
            WHERE ec.id = elective_courses_id
            AND ec.created_by = auth.uid()
            AND EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = auth.uid() AND p.role = 'program_manager'
            )
        )
    );

-- Admins can do everything
CREATE POLICY "Admins have full access to course selections" ON public.course_selections
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- Exchange Selections RLS Policies

-- Students can view their own selections
CREATE POLICY "Students can view own exchange selections" ON public.exchange_selections
    FOR SELECT USING (auth.uid() = student_id);

-- Students can insert their own selections
CREATE POLICY "Students can insert own exchange selections" ON public.exchange_selections
    FOR INSERT WITH CHECK (auth.uid() = student_id);

-- Students can update their own selections
CREATE POLICY "Students can update own exchange selections" ON public.exchange_selections
    FOR UPDATE USING (auth.uid() = student_id)
    WITH CHECK (auth.uid() = student_id);

-- Managers can view selections for electives they created
CREATE POLICY "Managers can view exchange selections for their programs" ON public.exchange_selections
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.elective_exchange ee
            WHERE ee.id = elective_exchange_id
            AND ee.created_by = auth.uid()
            AND EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = auth.uid() AND p.role = 'program_manager'
            )
        )
    );

-- Managers can update status and authorized_by for selections in their programs
CREATE POLICY "Managers can update exchange selection status" ON public.exchange_selections
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.elective_exchange ee
            WHERE ee.id = elective_exchange_id
            AND ee.created_by = auth.uid()
            AND EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = auth.uid() AND p.role = 'program_manager'
            )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.elective_exchange ee
            WHERE ee.id = elective_exchange_id
            AND ee.created_by = auth.uid()
            AND EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = auth.uid() AND p.role = 'program_manager'
            )
        )
    );

-- Admins can do everything
CREATE POLICY "Admins have full access to exchange selections" ON public.exchange_selections
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );