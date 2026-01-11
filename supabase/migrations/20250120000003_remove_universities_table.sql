-- Migration: Remove universities table
-- This migration removes the universities table as we're consolidating to use exchange_universities only
-- Date: 2025-01-20

BEGIN;

-- Drop RLS policies first
DROP POLICY IF EXISTS "Authenticated users can read universities" ON universities;
DROP POLICY IF EXISTS "Admins and managers can manage universities" ON universities;

-- Drop trigger
DROP TRIGGER IF EXISTS update_universities_updated_at ON universities;

-- Drop the universities table
DROP TABLE IF EXISTS universities;

COMMIT;
