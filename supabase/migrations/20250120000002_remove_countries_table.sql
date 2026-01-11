-- Migration: Remove countries table
-- This migration removes the countries table as we're now using static data from lib/countries.ts
-- Date: 2025-01-20

BEGIN;

-- Drop RLS policies first
DROP POLICY IF EXISTS "Public read access to countries" ON countries;
DROP POLICY IF EXISTS "Admins can manage countries" ON countries;

-- Drop trigger
DROP TRIGGER IF EXISTS update_countries_updated_at ON countries;

-- Drop the countries table
DROP TABLE IF EXISTS countries;

COMMIT;
