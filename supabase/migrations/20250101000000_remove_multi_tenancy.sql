-- Migration: Fresh Schema Setup for Single-Tenant ElectivePRO
-- Description: Creates complete database schema for single-tenant ElectivePRO application
--              All tables are created WITHOUT institution_id columns (single-tenant setup)
--              Includes RLS policies, helper functions, and settings table
--
-- This is a self-hosted, open-source application. To set up:
-- 1. Create a new Supabase project
-- 2. Run this migration file in Supabase SQL Editor
-- 3. Add Supabase environment variables to your .env.local
-- 4. Deploy the application

BEGIN;

-- ====================================================
-- STEP 1: CREATE CORE TABLES
-- ====================================================

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'program_manager', 'student')),
  email TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Degrees table
CREATE TABLE IF NOT EXISTS degrees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_ru TEXT,
  code TEXT NOT NULL,
  duration_years INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Programs table
CREATE TABLE IF NOT EXISTS programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  degree_id UUID NOT NULL REFERENCES degrees(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  name_ru TEXT,
  code TEXT NOT NULL,
  description TEXT,
  description_ru TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Academic Years table
CREATE TABLE IF NOT EXISTS academic_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE RESTRICT,
  year TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Groups table
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE RESTRICT,
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Countries table
CREATE TABLE IF NOT EXISTS countries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_ru TEXT,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================
-- STEP 2: CREATE ELECTIVE-RELATED TABLES
-- ====================================================

-- Elective Packs table
CREATE TABLE IF NOT EXISTS elective_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_ru TEXT,
  description TEXT,
  description_ru TEXT,
  type TEXT NOT NULL CHECK (type IN ('course', 'exchange')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'draft')),
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Courses table
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  elective_pack_id UUID REFERENCES elective_packs(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  name_ru TEXT,
  code TEXT NOT NULL,
  description TEXT,
  description_ru TEXT,
  credits INTEGER NOT NULL,
  max_students INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Elective Courses table (links courses to groups)
CREATE TABLE IF NOT EXISTS elective_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  elective_pack_id UUID NOT NULL REFERENCES elective_packs(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(elective_pack_id, course_id, group_id)
);

-- Elective Exchange table
CREATE TABLE IF NOT EXISTS elective_exchange (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_ru TEXT,
  description TEXT,
  description_ru TEXT,
  deadline TIMESTAMPTZ NOT NULL,
  max_selections INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'draft')),
  universities TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Exchange Universities table
CREATE TABLE IF NOT EXISTS exchange_universities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  elective_pack_id UUID REFERENCES elective_packs(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  name_ru TEXT,
  country TEXT NOT NULL,
  city TEXT NOT NULL,
  language TEXT,
  max_students INTEGER NOT NULL DEFAULT 0,
  website TEXT,
  description TEXT,
  description_ru TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Universities table (general universities, not exchange-specific)
CREATE TABLE IF NOT EXISTS universities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_ru TEXT,
  country TEXT NOT NULL,
  city TEXT NOT NULL,
  website TEXT,
  description TEXT,
  description_ru TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================
-- STEP 3: CREATE PROFILE EXTENSION TABLES
-- ====================================================

-- Manager Profiles table
CREATE TABLE IF NOT EXISTS manager_profiles (
  profile_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  program_id UUID REFERENCES programs(id) ON DELETE SET NULL,
  degree_id UUID REFERENCES degrees(id) ON DELETE SET NULL,
  academic_year_id UUID REFERENCES academic_years(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Student Profiles table
CREATE TABLE IF NOT EXISTS student_profiles (
  profile_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
  enrollment_year TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================
-- STEP 4: CREATE SELECTION TABLES
-- ====================================================

-- Program Electives table (links programs to elective packs)
CREATE TABLE IF NOT EXISTS program_electives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  elective_pack_id UUID NOT NULL REFERENCES elective_packs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(program_id, elective_pack_id)
);

-- Student Selections table (for course electives)
CREATE TABLE IF NOT EXISTS student_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  elective_pack_id UUID NOT NULL REFERENCES elective_packs(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Selection Courses table (courses selected by student)
CREATE TABLE IF NOT EXISTS selection_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  selection_id UUID NOT NULL REFERENCES student_selections(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(selection_id, course_id)
);

-- Course Selections table (for course elective selections)
CREATE TABLE IF NOT EXISTS course_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  elective_courses_id UUID NOT NULL REFERENCES elective_courses(id) ON DELETE RESTRICT,
  selected_course_ids TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  statement_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Exchange Selections table
CREATE TABLE IF NOT EXISTS exchange_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  elective_exchange_id UUID NOT NULL REFERENCES elective_exchange(id) ON DELETE RESTRICT,
  selected_universities TEXT[] DEFAULT '{}',
  statement_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Selection Universities table (universities selected by student for exchange)
CREATE TABLE IF NOT EXISTS selection_universities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  selection_id UUID NOT NULL REFERENCES exchange_selections(id) ON DELETE CASCADE,
  university_id UUID NOT NULL REFERENCES exchange_universities(id) ON DELETE CASCADE,
  preference_order INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(selection_id, university_id)
);

-- ====================================================
-- STEP 5: CREATE SETTINGS TABLE
-- ====================================================

-- Settings table for single-institution branding and settings
-- Note: Default values are hardcoded in application code (lib/constants.ts), not in database
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
  name TEXT,
  primary_color TEXT,
  logo_url TEXT,
  favicon_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT settings_single_row CHECK (id = '00000000-0000-0000-0000-000000000000'::uuid)
);

-- Note: Default settings are hardcoded in the application code (lib/constants.ts)
-- No default row is inserted - settings are only created when admin updates branding

-- ====================================================
-- STEP 6: CREATE INDEXES
-- ====================================================

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Degrees indexes
CREATE INDEX IF NOT EXISTS idx_degrees_status ON degrees(status);

-- Programs indexes
CREATE INDEX IF NOT EXISTS idx_programs_degree_id ON programs(degree_id);
CREATE INDEX IF NOT EXISTS idx_programs_status ON programs(status);

-- Academic Years indexes
CREATE INDEX IF NOT EXISTS idx_academic_years_program_id ON academic_years(program_id);
CREATE INDEX IF NOT EXISTS idx_academic_years_is_active ON academic_years(is_active);

-- Groups indexes
CREATE INDEX IF NOT EXISTS idx_groups_program_id ON groups(program_id);
CREATE INDEX IF NOT EXISTS idx_groups_academic_year_id ON groups(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_groups_status ON groups(status);

-- Elective Packs indexes
CREATE INDEX IF NOT EXISTS idx_elective_packs_type ON elective_packs(type);
CREATE INDEX IF NOT EXISTS idx_elective_packs_academic_year_id ON elective_packs(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_elective_packs_status ON elective_packs(status);

-- Courses indexes
CREATE INDEX IF NOT EXISTS idx_courses_elective_pack_id ON courses(elective_pack_id);
CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status);

-- Elective Courses indexes
CREATE INDEX IF NOT EXISTS idx_elective_courses_elective_pack_id ON elective_courses(elective_pack_id);
CREATE INDEX IF NOT EXISTS idx_elective_courses_group_id ON elective_courses(group_id);

-- Student Selections indexes
CREATE INDEX IF NOT EXISTS idx_student_selections_student_id ON student_selections(student_id);
CREATE INDEX IF NOT EXISTS idx_student_selections_elective_pack_id ON student_selections(elective_pack_id);
CREATE INDEX IF NOT EXISTS idx_student_selections_status ON student_selections(status);

-- Course Selections indexes
CREATE INDEX IF NOT EXISTS idx_course_selections_student_id ON course_selections(student_id);
CREATE INDEX IF NOT EXISTS idx_course_selections_elective_courses_id ON course_selections(elective_courses_id);
CREATE INDEX IF NOT EXISTS idx_course_selections_status ON course_selections(status);

-- Exchange Selections indexes
CREATE INDEX IF NOT EXISTS idx_exchange_selections_student_id ON exchange_selections(student_id);
CREATE INDEX IF NOT EXISTS idx_exchange_selections_elective_exchange_id ON exchange_selections(elective_exchange_id);
CREATE INDEX IF NOT EXISTS idx_exchange_selections_status ON exchange_selections(status);

-- Manager Profiles indexes
CREATE INDEX IF NOT EXISTS idx_manager_profiles_program_id ON manager_profiles(program_id);

-- Student Profiles indexes
CREATE INDEX IF NOT EXISTS idx_student_profiles_group_id ON student_profiles(group_id);

-- ====================================================
-- STEP 7: CREATE TRIGGERS FOR updated_at
-- ====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for all tables with updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_degrees_updated_at BEFORE UPDATE ON degrees FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_programs_updated_at BEFORE UPDATE ON programs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_academic_years_updated_at BEFORE UPDATE ON academic_years FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON groups FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_countries_updated_at BEFORE UPDATE ON countries FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_elective_packs_updated_at BEFORE UPDATE ON elective_packs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_elective_courses_updated_at BEFORE UPDATE ON elective_courses FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_elective_exchange_updated_at BEFORE UPDATE ON elective_exchange FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_exchange_universities_updated_at BEFORE UPDATE ON exchange_universities FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_universities_updated_at BEFORE UPDATE ON universities FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_manager_profiles_updated_at BEFORE UPDATE ON manager_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_student_profiles_updated_at BEFORE UPDATE ON student_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_program_electives_updated_at BEFORE UPDATE ON program_electives FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_student_selections_updated_at BEFORE UPDATE ON student_selections FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_selection_courses_updated_at BEFORE UPDATE ON selection_courses FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_course_selections_updated_at BEFORE UPDATE ON course_selections FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_exchange_selections_updated_at BEFORE UPDATE ON exchange_selections FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_selection_universities_updated_at BEFORE UPDATE ON selection_universities FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ====================================================
-- STEP 8: CREATE HELPER FUNCTIONS FOR RLS
-- ====================================================

-- Helper function to get user role
CREATE OR REPLACE FUNCTION public.user_role()
RETURNS TEXT AS $func$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role::TEXT INTO user_role
  FROM profiles 
  WHERE id = auth.uid();
  
  RETURN COALESCE(user_role, NULL);
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper function to check if user is a manager of a specific program
CREATE OR REPLACE FUNCTION public.is_manager_of_program(program_id UUID)
RETURNS BOOLEAN AS $func$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM manager_profiles 
    WHERE profile_id = auth.uid() 
      AND manager_profiles.program_id = is_manager_of_program.program_id
  );
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper function to get student's group_id
CREATE OR REPLACE FUNCTION public.get_student_group_id()
RETURNS UUID AS $func$
BEGIN
  RETURN (
    SELECT group_id 
    FROM student_profiles 
    WHERE profile_id = auth.uid()
  );
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper function to get settings
CREATE OR REPLACE FUNCTION get_settings()
RETURNS TABLE (
  name TEXT,
  primary_color TEXT,
  logo_url TEXT,
  favicon_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.name,
    s.primary_color,
    s.logo_url,
    s.favicon_url
  FROM settings s
  WHERE s.id = '00000000-0000-0000-0000-000000000000'::uuid
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================================
-- STEP 9: ENABLE RLS AND CREATE POLICIES
-- ====================================================

-- PROFILES TABLE
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (public.user_role() = 'admin');

CREATE POLICY "Managers can view profiles in their programs"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    public.user_role() = 'program_manager' AND
    EXISTS (
      SELECT 1 FROM manager_profiles mp
      JOIN student_profiles sp ON sp.group_id IN (
        SELECT id FROM groups WHERE program_id = mp.program_id
      )
      WHERE mp.profile_id = auth.uid() AND sp.profile_id = profiles.id
    )
  );

CREATE POLICY "Admins can manage all profiles"
  ON profiles FOR ALL
  TO authenticated
  USING (public.user_role() = 'admin')
  WITH CHECK (public.user_role() = 'admin');

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- DEGREES TABLE
ALTER TABLE degrees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read degrees"
  ON degrees FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage degrees"
  ON degrees FOR ALL
  TO authenticated
  USING (public.user_role() = 'admin')
  WITH CHECK (public.user_role() = 'admin');

-- PROGRAMS TABLE
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read programs"
  ON programs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage programs"
  ON programs FOR ALL
  TO authenticated
  USING (public.user_role() = 'admin')
  WITH CHECK (public.user_role() = 'admin');

-- ACADEMIC_YEARS TABLE
ALTER TABLE academic_years ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read academic years"
  ON academic_years FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage academic years"
  ON academic_years FOR ALL
  TO authenticated
  USING (public.user_role() = 'admin')
  WITH CHECK (public.user_role() = 'admin');

-- GROUPS TABLE
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read groups"
  ON groups FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage groups"
  ON groups FOR ALL
  TO authenticated
  USING (public.user_role() = 'admin')
  WITH CHECK (public.user_role() = 'admin');

-- COURSES TABLE
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read courses"
  ON courses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can manage courses"
  ON courses FOR ALL
  TO authenticated
  USING (public.user_role() IN ('admin', 'program_manager'))
  WITH CHECK (public.user_role() IN ('admin', 'program_manager'));

-- ELECTIVE_COURSES TABLE
ALTER TABLE elective_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read elective courses"
  ON elective_courses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Students can view their group's elective courses"
  ON elective_courses FOR SELECT
  TO authenticated
  USING (
    public.user_role() = 'student' AND
    group_id = public.get_student_group_id()
  );

CREATE POLICY "Admins and managers can manage elective courses"
  ON elective_courses FOR ALL
  TO authenticated
  USING (public.user_role() IN ('admin', 'program_manager'))
  WITH CHECK (public.user_role() IN ('admin', 'program_manager'));

-- ELECTIVE_EXCHANGE TABLE
ALTER TABLE elective_exchange ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read exchange programs"
  ON elective_exchange FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Students can view their group's exchange programs"
  ON elective_exchange FOR SELECT
  TO authenticated
  USING (
    public.user_role() = 'student' AND
    EXISTS (
      SELECT 1 FROM student_profiles sp
      JOIN groups g ON g.id = sp.group_id
      JOIN elective_packs ep ON ep.academic_year_id = g.academic_year_id
      WHERE sp.profile_id = auth.uid() AND ep.type = 'exchange'
    )
  );

CREATE POLICY "Admins and managers can manage exchange programs"
  ON elective_exchange FOR ALL
  TO authenticated
  USING (public.user_role() IN ('admin', 'program_manager'))
  WITH CHECK (public.user_role() IN ('admin', 'program_manager'));

-- ELECTIVE_PACKS TABLE
ALTER TABLE elective_packs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read elective packs"
  ON elective_packs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can manage elective packs"
  ON elective_packs FOR ALL
  TO authenticated
  USING (public.user_role() IN ('admin', 'program_manager'))
  WITH CHECK (public.user_role() IN ('admin', 'program_manager'));

-- UNIVERSITIES TABLE
ALTER TABLE universities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read universities"
  ON universities FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can manage universities"
  ON universities FOR ALL
  TO authenticated
  USING (public.user_role() IN ('admin', 'program_manager'))
  WITH CHECK (public.user_role() IN ('admin', 'program_manager'));

-- EXCHANGE_UNIVERSITIES TABLE
ALTER TABLE exchange_universities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read exchange universities"
  ON exchange_universities FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can manage exchange universities"
  ON exchange_universities FOR ALL
  TO authenticated
  USING (public.user_role() IN ('admin', 'program_manager'))
  WITH CHECK (public.user_role() IN ('admin', 'program_manager'));

-- COURSE_SELECTIONS TABLE
ALTER TABLE course_selections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own course selections"
  ON course_selections FOR SELECT
  TO authenticated
  USING (
    public.user_role() = 'student' AND
    student_id = auth.uid()
  );

CREATE POLICY "Students can create own course selections"
  ON course_selections FOR INSERT
  TO authenticated
  WITH CHECK (
    public.user_role() = 'student' AND
    student_id = auth.uid()
  );

CREATE POLICY "Students can update own pending course selections"
  ON course_selections FOR UPDATE
  TO authenticated
  USING (
    public.user_role() = 'student' AND
    student_id = auth.uid() AND
    status = 'pending'
  )
  WITH CHECK (
    public.user_role() = 'student' AND
    student_id = auth.uid()
  );

CREATE POLICY "Students can delete own pending course selections"
  ON course_selections FOR DELETE
  TO authenticated
  USING (
    public.user_role() = 'student' AND
    student_id = auth.uid() AND
    status = 'pending'
  );

CREATE POLICY "Admins and managers can view all course selections"
  ON course_selections FOR SELECT
  TO authenticated
  USING (public.user_role() IN ('admin', 'program_manager'));

CREATE POLICY "Admins and managers can update course selections"
  ON course_selections FOR UPDATE
  TO authenticated
  USING (public.user_role() IN ('admin', 'program_manager'))
  WITH CHECK (public.user_role() IN ('admin', 'program_manager'));

-- EXCHANGE_SELECTIONS TABLE
ALTER TABLE exchange_selections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own exchange selections"
  ON exchange_selections FOR SELECT
  TO authenticated
  USING (
    public.user_role() = 'student' AND
    student_id = auth.uid()
  );

CREATE POLICY "Students can create own exchange selections"
  ON exchange_selections FOR INSERT
  TO authenticated
  WITH CHECK (
    public.user_role() = 'student' AND
    student_id = auth.uid()
  );

CREATE POLICY "Students can update own pending exchange selections"
  ON exchange_selections FOR UPDATE
  TO authenticated
  USING (
    public.user_role() = 'student' AND
    student_id = auth.uid() AND
    status = 'pending'
  )
  WITH CHECK (
    public.user_role() = 'student' AND
    student_id = auth.uid()
  );

CREATE POLICY "Students can delete own pending exchange selections"
  ON exchange_selections FOR DELETE
  TO authenticated
  USING (
    public.user_role() = 'student' AND
    student_id = auth.uid() AND
    status = 'pending'
  );

CREATE POLICY "Admins and managers can view all exchange selections"
  ON exchange_selections FOR SELECT
  TO authenticated
  USING (public.user_role() IN ('admin', 'program_manager'));

CREATE POLICY "Admins and managers can update exchange selections"
  ON exchange_selections FOR UPDATE
  TO authenticated
  USING (public.user_role() IN ('admin', 'program_manager'))
  WITH CHECK (public.user_role() IN ('admin', 'program_manager'));

-- MANAGER_PROFILES TABLE
ALTER TABLE manager_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can view own profile"
  ON manager_profiles FOR SELECT
  TO authenticated
  USING (
    public.user_role() = 'program_manager' AND
    profile_id = auth.uid()
  );

CREATE POLICY "Admins can view all manager profiles"
  ON manager_profiles FOR SELECT
  TO authenticated
  USING (public.user_role() = 'admin');

CREATE POLICY "Admins can manage manager profiles"
  ON manager_profiles FOR ALL
  TO authenticated
  USING (public.user_role() = 'admin')
  WITH CHECK (public.user_role() = 'admin');

-- STUDENT_PROFILES TABLE
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own profile"
  ON student_profiles FOR SELECT
  TO authenticated
  USING (
    public.user_role() = 'student' AND
    profile_id = auth.uid()
  );

CREATE POLICY "Admins can view all student profiles"
  ON student_profiles FOR SELECT
  TO authenticated
  USING (public.user_role() = 'admin');

CREATE POLICY "Managers can view students in their programs"
  ON student_profiles FOR SELECT
  TO authenticated
  USING (
    public.user_role() = 'program_manager' AND
    EXISTS (
      SELECT 1 FROM manager_profiles mp
      JOIN groups g ON g.program_id = mp.program_id
      WHERE mp.profile_id = auth.uid() AND g.id = student_profiles.group_id
    )
  );

CREATE POLICY "Admins can manage student profiles"
  ON student_profiles FOR ALL
  TO authenticated
  USING (public.user_role() = 'admin')
  WITH CHECK (public.user_role() = 'admin');

-- COUNTRIES TABLE
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access to countries"
  ON countries FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Admins can manage countries"
  ON countries FOR ALL
  TO authenticated
  USING (public.user_role() = 'admin')
  WITH CHECK (public.user_role() = 'admin');

-- PROGRAM_ELECTIVES TABLE
ALTER TABLE program_electives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read program electives"
  ON program_electives FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage program electives"
  ON program_electives FOR ALL
  TO authenticated
  USING (public.user_role() = 'admin')
  WITH CHECK (public.user_role() = 'admin');

-- STUDENT_SELECTIONS TABLE
ALTER TABLE student_selections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own student selections"
  ON student_selections FOR SELECT
  TO authenticated
  USING (
    public.user_role() = 'student' AND
    student_id = auth.uid()
  );

CREATE POLICY "Students can create own student selections"
  ON student_selections FOR INSERT
  TO authenticated
  WITH CHECK (
    public.user_role() = 'student' AND
    student_id = auth.uid()
  );

CREATE POLICY "Students can update own pending student selections"
  ON student_selections FOR UPDATE
  TO authenticated
  USING (
    public.user_role() = 'student' AND
    student_id = auth.uid() AND
    status = 'pending'
  )
  WITH CHECK (
    public.user_role() = 'student' AND
    student_id = auth.uid()
  );

CREATE POLICY "Students can delete own pending student selections"
  ON student_selections FOR DELETE
  TO authenticated
  USING (
    public.user_role() = 'student' AND
    student_id = auth.uid() AND
    status = 'pending'
  );

CREATE POLICY "Admins and managers can view all student selections"
  ON student_selections FOR SELECT
  TO authenticated
  USING (public.user_role() IN ('admin', 'program_manager'));

CREATE POLICY "Admins and managers can update student selections"
  ON student_selections FOR UPDATE
  TO authenticated
  USING (public.user_role() IN ('admin', 'program_manager'))
  WITH CHECK (public.user_role() IN ('admin', 'program_manager'));

-- SELECTION_COURSES TABLE
ALTER TABLE selection_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own selection courses"
  ON selection_courses FOR SELECT
  TO authenticated
  USING (
    public.user_role() = 'student' AND
    EXISTS (
      SELECT 1 FROM student_selections ss
      WHERE ss.id = selection_courses.selection_id
        AND ss.student_id = auth.uid()
    )
  );

CREATE POLICY "Students can create own selection courses"
  ON selection_courses FOR INSERT
  TO authenticated
  WITH CHECK (
    public.user_role() = 'student' AND
    EXISTS (
      SELECT 1 FROM student_selections ss
      WHERE ss.id = selection_courses.selection_id
        AND ss.student_id = auth.uid()
        AND ss.status = 'pending'
    )
  );

CREATE POLICY "Students can delete own selection courses"
  ON selection_courses FOR DELETE
  TO authenticated
  USING (
    public.user_role() = 'student' AND
    EXISTS (
      SELECT 1 FROM student_selections ss
      WHERE ss.id = selection_courses.selection_id
        AND ss.student_id = auth.uid()
        AND ss.status = 'pending'
    )
  );

CREATE POLICY "Admins and managers can view all selection courses"
  ON selection_courses FOR SELECT
  TO authenticated
  USING (public.user_role() IN ('admin', 'program_manager'));

CREATE POLICY "Admins and managers can manage selection courses"
  ON selection_courses FOR ALL
  TO authenticated
  USING (public.user_role() IN ('admin', 'program_manager'))
  WITH CHECK (public.user_role() IN ('admin', 'program_manager'));

-- SELECTION_UNIVERSITIES TABLE
ALTER TABLE selection_universities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own selection universities"
  ON selection_universities FOR SELECT
  TO authenticated
  USING (
    public.user_role() = 'student' AND
    EXISTS (
      SELECT 1 FROM exchange_selections es
      WHERE es.id = selection_universities.selection_id
        AND es.student_id = auth.uid()
    )
  );

CREATE POLICY "Students can create own selection universities"
  ON selection_universities FOR INSERT
  TO authenticated
  WITH CHECK (
    public.user_role() = 'student' AND
    EXISTS (
      SELECT 1 FROM exchange_selections es
      WHERE es.id = selection_universities.selection_id
        AND es.student_id = auth.uid()
        AND es.status = 'pending'
    )
  );

CREATE POLICY "Students can delete own selection universities"
  ON selection_universities FOR DELETE
  TO authenticated
  USING (
    public.user_role() = 'student' AND
    EXISTS (
      SELECT 1 FROM exchange_selections es
      WHERE es.id = selection_universities.selection_id
        AND es.student_id = auth.uid()
        AND es.status = 'pending'
    )
  );

CREATE POLICY "Admins and managers can view all selection universities"
  ON selection_universities FOR SELECT
  TO authenticated
  USING (public.user_role() IN ('admin', 'program_manager'));

CREATE POLICY "Admins and managers can manage selection universities"
  ON selection_universities FOR ALL
  TO authenticated
  USING (public.user_role() IN ('admin', 'program_manager'))
  WITH CHECK (public.user_role() IN ('admin', 'program_manager'));

-- SETTINGS TABLE
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to settings"
  ON settings FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Allow authenticated users to update settings"
  ON settings FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ====================================================
-- STEP 10: GRANT PERMISSIONS
-- ====================================================

GRANT SELECT ON settings TO authenticated;
GRANT SELECT ON settings TO anon;
GRANT UPDATE ON settings TO authenticated;

COMMIT;

-- Post-migration notes:
-- 1. This migration creates a complete fresh schema for single-tenant ElectivePRO
-- 2. All tables are created WITHOUT institution_id columns
-- 3. RLS policies are enabled for all tables
-- 4. Helper functions are created for role-based access control
-- 5. Create your first admin user directly in Supabase Dashboard
-- 6. Regenerate TypeScript types: npx supabase gen types typescript --local > types/supabase.ts
