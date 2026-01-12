-- Migration: Remove code and credits columns from courses table
-- These fields are not needed for the application

BEGIN;

-- Drop the code column
ALTER TABLE courses
  DROP COLUMN IF EXISTS code;

-- Drop the credits column
ALTER TABLE courses
  DROP COLUMN IF EXISTS credits;

COMMIT;
