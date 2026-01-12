-- Add email notification settings to settings and profiles tables

-- Add email notification settings to settings table
ALTER TABLE settings
ADD COLUMN IF NOT EXISTS selection_notifications BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS status_update_notifications BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS platform_announcements BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS user_email_notifications BOOLEAN DEFAULT true;

-- Add email notification preference to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT true;
