-- Migration: Update settings table to use dynamic UUIDs instead of hardcoded UUID
-- This removes the singleton constraint and allows dynamic UUID generation

BEGIN;

-- Step 1: Drop the singleton constraint that enforces hardcoded UUID
ALTER TABLE settings DROP CONSTRAINT IF EXISTS settings_single_row;

-- Step 2: Remove the hardcoded UUID default and use gen_random_uuid() instead
-- First, update any existing row with the hardcoded UUID to have a new UUID
DO $$
DECLARE
  old_id UUID := '00000000-0000-0000-0000-000000000000'::uuid;
  new_id UUID;
BEGIN
  -- Check if a row with the old UUID exists
  IF EXISTS (SELECT 1 FROM settings WHERE id = old_id) THEN
    -- Generate a new UUID
    new_id := gen_random_uuid();
    
    -- Update the existing row with the new UUID
    UPDATE settings SET id = new_id WHERE id = old_id;
    
    RAISE NOTICE 'Updated settings row from % to %', old_id, new_id;
  END IF;
END $$;

-- Step 3: Change the default to use gen_random_uuid()
ALTER TABLE settings 
  ALTER COLUMN id DROP DEFAULT,
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Step 4: Add NOT NULL constraints with defaults for name and primary_color if they don't exist
-- Check if NOT NULL constraint exists before adding
DO $$
BEGIN
  -- Add NOT NULL constraint to name if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'settings_name_not_null' 
    AND conrelid = 'settings'::regclass
  ) THEN
    -- First, set default values for any NULL values
    UPDATE settings SET name = 'ElectivePRO' WHERE name IS NULL;
    UPDATE settings SET primary_color = '#027659' WHERE primary_color IS NULL;
    
    -- Then add NOT NULL constraints
    ALTER TABLE settings 
      ALTER COLUMN name SET NOT NULL,
      ALTER COLUMN name SET DEFAULT 'ElectivePRO';
    
    ALTER TABLE settings 
      ALTER COLUMN primary_color SET NOT NULL,
      ALTER COLUMN primary_color SET DEFAULT '#027659';
    
    -- Add a named constraint for documentation
    ALTER TABLE settings 
      ADD CONSTRAINT settings_name_not_null CHECK (name IS NOT NULL),
      ADD CONSTRAINT settings_primary_color_not_null CHECK (primary_color IS NOT NULL);
  END IF;
END $$;

-- Step 5: Update the get_settings() function to work with any UUID (just get the first row)
CREATE OR REPLACE FUNCTION get_settings()
RETURNS TABLE (
  name TEXT,
  primary_color TEXT,
  logo_url TEXT,
  favicon_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.name,
    s.primary_color,
    s.logo_url,
    s.favicon_url
  FROM settings s
  ORDER BY s.created_at ASC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Add a trigger to ensure only one settings row exists (singleton pattern)
-- This is better than a CHECK constraint because it allows dynamic UUIDs
CREATE OR REPLACE FUNCTION ensure_single_settings_row()
RETURNS TRIGGER AS $$
BEGIN
  -- If this is an INSERT and there's already a row, prevent the insert
  IF TG_OP = 'INSERT' THEN
    IF EXISTS (SELECT 1 FROM settings) THEN
      RAISE EXCEPTION 'Only one settings row is allowed. Use UPDATE instead of INSERT.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it exists and recreate it
DROP TRIGGER IF EXISTS trigger_ensure_single_settings_row ON settings;
CREATE TRIGGER trigger_ensure_single_settings_row
  BEFORE INSERT ON settings
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_settings_row();

COMMIT;
