-- Migration: Add INSERT policy for settings table to allow upsert operations
-- The UPDATE policy exists, but INSERT is needed for upsert to work

BEGIN;

-- Add INSERT policy for authenticated users
-- This allows upsert operations (INSERT with on_conflict) to work
-- The trigger will still prevent multiple rows from being created
DROP POLICY IF EXISTS "Allow authenticated users to insert settings" ON settings;
CREATE POLICY "Allow authenticated users to insert settings"
  ON settings FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Also ensure INSERT permission is granted at the table level
GRANT INSERT ON settings TO authenticated;

COMMIT;
