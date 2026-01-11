-- Migration: Remove duration_years from degrees table
-- This migration removes the unused duration_years column from the degrees table
-- Date: 2025-01-20

BEGIN;

-- Drop the duration_years column from degrees table
ALTER TABLE degrees 
DROP COLUMN IF EXISTS duration_years;

COMMIT;
