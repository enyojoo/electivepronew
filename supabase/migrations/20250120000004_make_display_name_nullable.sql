-- Migration: Remove display_name column from groups table
-- Since display_name is not used in the UI (only Group Code is needed), remove it completely
-- Date: 2025-01-20

BEGIN;

-- Drop the display_name column
ALTER TABLE groups DROP COLUMN IF EXISTS display_name;

COMMIT;
