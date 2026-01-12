-- Add platform branding fields to settings table
-- These fields extend the existing settings table for platform branding

ALTER TABLE settings
ADD COLUMN IF NOT EXISTS platform_name TEXT,
ADD COLUMN IF NOT EXISTS platform_description TEXT,
ADD COLUMN IF NOT EXISTS contact_email TEXT,
ADD COLUMN IF NOT EXISTS app_url TEXT;
