-- Migration: Add language-specific branding fields to settings table
-- Adds support for Russian institution name and language-specific logos

BEGIN;

-- Add new columns to settings table
ALTER TABLE settings 
  ADD COLUMN IF NOT EXISTS name_ru TEXT,
  ADD COLUMN IF NOT EXISTS logo_url_en TEXT,
  ADD COLUMN IF NOT EXISTS logo_url_ru TEXT;

-- Drop the existing function first (required when changing return type)
DROP FUNCTION IF EXISTS get_settings();

-- Recreate the get_settings() function with new fields
CREATE FUNCTION get_settings()
RETURNS TABLE (
  name TEXT,
  name_ru TEXT,
  primary_color TEXT,
  logo_url TEXT,
  logo_url_en TEXT,
  logo_url_ru TEXT,
  favicon_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.name,
    s.name_ru,
    s.primary_color,
    s.logo_url,
    s.logo_url_en,
    s.logo_url_ru,
    s.favicon_url
  FROM settings s
  ORDER BY s.created_at ASC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
