-- Migration: Add instructor and degree fields to courses table
-- Adds instructor_en, instructor_ru, and degree_id columns to support course management

BEGIN;

-- Add new columns to courses table
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS instructor_en TEXT,
  ADD COLUMN IF NOT EXISTS instructor_ru TEXT,
  ADD COLUMN IF NOT EXISTS degree_id UUID REFERENCES degrees(id) ON DELETE SET NULL;

-- Create index on degree_id for better query performance
CREATE INDEX IF NOT EXISTS idx_courses_degree_id ON courses(degree_id);

COMMIT;
