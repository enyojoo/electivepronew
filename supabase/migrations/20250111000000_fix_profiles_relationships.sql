-- Migration: Fix Profiles Relationships
-- Description: Verifies and ensures proper foreign key relationships exist for profiles queries
-- This migration ensures all relationships are properly set up for Supabase PostgREST to work correctly

BEGIN;

-- Verify that student_profiles has proper foreign key to groups (if not already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'student_profiles_group_id_fkey'
  ) THEN
    ALTER TABLE student_profiles
    ADD CONSTRAINT student_profiles_group_id_fkey
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Verify that manager_profiles has proper foreign key to degrees (if not already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'manager_profiles_degree_id_fkey'
  ) THEN
    ALTER TABLE manager_profiles
    ADD CONSTRAINT manager_profiles_degree_id_fkey
    FOREIGN KEY (degree_id) REFERENCES degrees(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Verify that manager_profiles has proper foreign key to programs (if not already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'manager_profiles_program_id_fkey'
  ) THEN
    ALTER TABLE manager_profiles
    ADD CONSTRAINT manager_profiles_program_id_fkey
    FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create/verify indexes to improve query performance for relationship lookups
CREATE INDEX IF NOT EXISTS idx_student_profiles_profile_id ON student_profiles(profile_id);
CREATE INDEX IF NOT EXISTS idx_manager_profiles_profile_id ON manager_profiles(profile_id);

COMMIT;
