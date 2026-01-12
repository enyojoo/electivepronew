-- Migration: Remove city column from exchange_universities table
-- The city field is no longer needed in the application

BEGIN;

-- First, make the column nullable (in case it has NOT NULL constraint)
ALTER TABLE exchange_universities
  ALTER COLUMN city DROP NOT NULL;

-- Drop the city column
ALTER TABLE exchange_universities
  DROP COLUMN IF EXISTS city;

COMMIT;
