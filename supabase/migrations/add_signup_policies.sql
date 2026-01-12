-- Add RLS policies to allow users to insert their own profiles during signup
-- Run this in Supabase SQL Editor if you're getting "new row violates row-level security policy" errors

-- PROFILES TABLE - Allow users to insert their own profile
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- STUDENT_PROFILES TABLE - Allow students to insert their own student profile
DROP POLICY IF EXISTS "Students can insert own profile" ON student_profiles;
CREATE POLICY "Students can insert own profile"
  ON student_profiles FOR INSERT
  TO authenticated
  WITH CHECK (profile_id = auth.uid());

-- MANAGER_PROFILES TABLE - Allow managers to insert their own manager profile
DROP POLICY IF EXISTS "Managers can insert own profile" ON manager_profiles;
CREATE POLICY "Managers can insert own profile"
  ON manager_profiles FOR INSERT
  TO authenticated
  WITH CHECK (profile_id = auth.uid());
