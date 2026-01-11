# ElectivePRO: Self-Hosting Setup Guide

## Overview
ElectivePRO is an open-source, self-hosted application for managing elective course and exchange program selections. This guide covers setting up your own instance of ElectivePRO.

## Self-Hosting Strategy

ElectivePRO is designed to be self-hosted. The setup process is simple:
1. **Run the SQL migration** - Creates the complete database schema
2. **Add Supabase environment variables** - Connect to your Supabase project
3. **Deploy** - Deploy the Next.js application

No prior database setup is required - the migration creates everything from scratch.

## Pre-Migration Checklist

### ✅ Code Changes Completed
- [x] Removed all `institution_id` references from application code
- [x] Removed `institution-context` and all `useInstitution()` hooks
- [x] Removed Super Admin role and related functionality
- [x] Removed subdomain-based routing
- [x] Consolidated language contexts
- [x] Updated all queries to remove institution filtering
- [x] Created `settings` table to replace `institutions` table
- [x] Updated branding to use `settings` table

### ⚠️ Remaining Issues to Address

**Before running the migration, verify these:**

1. **TypeScript Types** (`types/supabase.ts`)
   - This file still contains `institution_id` in type definitions
   - **Action Required**: Regenerate types after migration using:
     ```bash
     npx supabase gen types typescript --local > types/supabase.ts
     ```
     Or for production:
     ```bash
     npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/supabase.ts
     ```

2. **Database Migration File**
   - Location: `supabase/migrations/20250101000000_remove_multi_tenancy.sql`
   - **IMPORTANT**: This migration creates a **complete fresh schema** for single-tenant ElectivePRO.
   - **All 21 tables are created** from scratch WITHOUT `institution_id` columns:
     - ✅ profiles, degrees, programs, academic_years, groups
     - ✅ courses, elective_courses, elective_exchange, elective_packs
     - ✅ universities, exchange_universities
     - ✅ course_selections, exchange_selections
     - ✅ manager_profiles, student_profiles
     - ✅ countries, program_electives, student_selections
     - ✅ selection_courses, selection_universities
     - ✅ settings (for branding)
   - **Includes**: Foreign keys, indexes, triggers, RLS policies (68 policies), and helper functions
   - **Ready for**: Fresh database installation - no prior tables needed

## Migration Steps

### Step 1: Backup Your Database

**CRITICAL**: Always backup before running migrations!

```bash
# Using Supabase CLI (if using local development)
supabase db dump -f backup_before_migration.sql

# Or export from Supabase Dashboard:
# 1. Go to Supabase Dashboard > Database > Backups
# 2. Create a manual backup
```

### Step 2: Review Migration File

1. Open `supabase/migrations/20250101000000_remove_multi_tenancy.sql`
2. Review the default settings values (lines 98-105):
   - Update logo and favicon URLs if needed
   - Update default primary color if needed
   - Update default name if needed

### Step 3: Run Migration

## Post-Setup Configuration

### Update Branding Settings

After setup, customize your branding:

1. Log in as admin
2. Go to Settings > Branding
3. Update:
   - Institution name
   - Primary color
   - Logo URL
   - Favicon URL

Or update directly in the database:

```sql
UPDATE settings 
SET 
  name = 'Your Institution Name',
  primary_color = '#YOUR_COLOR',
  logo_url = 'https://your-domain.com/logo.png',
  favicon_url = 'https://your-domain.com/favicon.ico'
WHERE id = '00000000-0000-0000-0000-000000000000';
```

### Regenerate TypeScript Types (Optional)

If you're developing locally and want updated types:

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Generate types
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/supabase.ts
```

## Application Features

Once set up, ElectivePRO provides:

- **Admin Dashboard**: Manage degrees, programs, courses, and users
- **Program Manager Dashboard**: Manage elective courses and exchange programs
- **Student Portal**: Browse and select elective courses and exchange programs
- **Multi-language Support**: English and Russian (extensible)
- **Role-Based Access Control**: Secure access based on user roles

## Troubleshooting

### Migration Errors

If you encounter errors during migration:
1. Check that you're using a fresh Supabase project (or drop all existing tables)
2. Ensure you have the correct permissions
3. Check the SQL Editor console for specific error messages

### Authentication Issues

If users can't log in:
1. Verify the user exists in `auth.users` table
2. Check that the corresponding profile exists in `profiles` table
3. Ensure `role` is set correctly in the profile

### RLS Policy Issues

If you see permission errors:
1. Verify RLS is enabled on the table
2. Check that helper functions (`user_role()`, etc.) are created
3. Ensure the user's role is set correctly in their profile

## Support

For issues, questions, or contributions:
- Check the GitHub repository
- Open an issue on GitHub
- Review the codebase documentation

## Additional Notes

### For Existing Multi-Tenant Installations

If you're migrating from a multi-tenant setup:
1. Export your data first
2. Run this migration on a fresh database
3. Import your data (removing `institution_id` columns)
4. Update application code to remove institution references

### Security Considerations

- Keep your `SUPABASE_SERVICE_ROLE_KEY` secret
- Use environment variables for all sensitive data
- Regularly update dependencies
- Review RLS policies for your specific use case
- Enable Supabase's built-in security features (2FA, etc.)

## Example Setup Script

For automated setup, you can use this script:

```bash
#!/bin/bash
# setup.sh - Quick setup script for ElectivePRO

echo "Setting up ElectivePRO..."

# 1. Check if .env.local exists
if [ ! -f .env.local ]; then
  echo "Creating .env.local template..."
  cat > .env.local << EOF
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
EOF
  echo "Please fill in your Supabase credentials in .env.local"
  exit 1
fi

# 2. Install dependencies
echo "Installing dependencies..."
npm install

# 3. Run migration (requires Supabase CLI)
echo "To run migration:"
echo "1. Go to Supabase Dashboard > SQL Editor"
echo "2. Copy contents of supabase/migrations/20250101000000_remove_multi_tenancy.sql"
echo "3. Paste and run in SQL Editor"

echo "Setup complete! Don't forget to:"
echo "- Run the SQL migration"
echo "- Create your first admin user"
echo "- Update branding settings"
```

## Next Steps

After setup:
1. ✅ Database schema created
2. ✅ First admin user created
3. ⬜ Configure branding
4. ⬜ Add degrees and programs
5. ⬜ Create program manager accounts
6. ⬜ Add student accounts
7. ⬜ Create elective packs and courses
8. ⬜ Deploy to production

---

**Note**: This is a self-hosted, open-source application. You have full control over your data and deployment.
INSERT INTO auth.users (email, encrypted_password, email_confirmed_at)
VALUES ('admin@example.com', crypt('your-secure-password', gen_salt('bf')), NOW())
RETURNING id;

-- Then create profile (use the returned ID)
INSERT INTO profiles (id, full_name, email, role, is_active)
VALUES ('USER_ID_FROM_ABOVE', 'Admin User', 'admin@example.com', 'admin', true);
```

### Step 6: Verify Migration

Run these checks:

```sql
-- Check that institutions table is dropped
SELECT * FROM institutions; -- Should error: relation does not exist

-- Check that settings table exists
SELECT * FROM settings; -- Should return one row

-- Check that institution_id columns are removed
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'institution_id'; 
-- Should return no rows

-- Check that settings table has default values
SELECT * FROM settings WHERE id = '00000000-0000-0000-0000-000000000000';
-- Should return one row with default values
```

## Testing Checklist

### 1. Authentication & Authorization

- [ ] **Admin Login**: `/admin/login`
  - Should redirect to `/admin/dashboard` after login
  - Should NOT redirect to super-admin routes

- [ ] **Manager Login**: `/manager/login`
  - Should redirect to `/manager/dashboard` after login

- [ ] **Student Login**: `/student/login`
  - Should redirect to `/student/dashboard` after login

- [ ] **Admin Signup**: Should NOT exist (404 or redirect)

### 2. Admin Features

- [ ] **Dashboard** (`/admin/dashboard`)
  - Should load without errors
  - Should show counts for all entities
  - Should NOT filter by institution

- [ ] **Users Management** (`/admin/users`)
  - Should list all users (not filtered by institution)
  - Should allow inviting new users (admins, managers, students)
  - Invitation system should work

- [ ] **Courses** (`/admin/courses`)
  - Should list all courses
  - Should allow creating/editing courses
  - Should NOT require institution_id

- [ ] **Groups** (`/admin/groups`)
  - Should list all groups
  - Should allow creating/editing groups
  - Should NOT require institution_id

- [ ] **Universities** (`/admin/universities`)
  - Should list all universities
  - Should allow creating/editing universities
  - Should NOT require institution_id

- [ ] **Degrees** (`/admin/settings?tab=degrees`)
  - Should list all degrees
  - Should allow creating/editing degrees
  - Should NOT require institution_id

- [ ] **Branding Settings** (`/admin/settings?tab=branding`)
  - Should load settings from `settings` table
  - Should allow updating logo, favicon, primary color
  - Changes should persist

### 3. Manager Features

- [ ] **Dashboard** (`/manager/dashboard`)
  - Should load without errors
  - Should show manager's programs

- [ ] **Exchange Programs** (`/manager/electives/exchange`)
  - Should list all exchange programs
  - Should allow creating/editing programs
  - Should NOT require institution_id

- [ ] **Course Electives** (`/manager/electives/course`)
  - Should list all course electives
  - Should allow creating/editing electives
  - Should NOT require institution_id

### 4. Student Features

- [ ] **Dashboard** (`/student/dashboard`)
  - Should load without errors
  - Should show student's selections

- [ ] **Exchange Programs** (`/student/exchange`)
  - Should list exchange programs for student's group
  - Should allow selecting universities
  - Should NOT filter by institution_id

- [ ] **Course Electives** (`/student/courses`)
  - Should list course electives for student's group
  - Should allow selecting courses
  - Should NOT filter by institution_id

### 5. Branding & UI

- [ ] **Logo**: Should display from `settings` table or default
- [ ] **Favicon**: Should display from `settings` table or default
- [ ] **Primary Color**: Should use color from `settings` table
- [ ] **Language Switcher**: Should work (EN/RU)
- [ ] **Translations**: Should display correctly in both languages

### 6. Data Integrity

- [ ] **Existing Data**: All existing data should still be accessible
- [ ] **Relationships**: Foreign keys should still work (except institution_id)
- [ ] **No Orphaned Records**: All records should still be linked properly

## Post-Migration Tasks

### 1. Update Environment Variables

Check `.env.local` or production environment variables:

```bash
# No changes needed - same Supabase credentials
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
```

### 2. Clear Browser Cache

Users should clear browser cache or use incognito mode to avoid cached institution data.

### 3. Update Documentation

- Update README.md to reflect single-tenant architecture
- Update deployment instructions
- Document admin user creation process

### 4. Monitor for Errors

After migration, monitor:
- Application logs for any `institution_id` related errors
- Database query errors
- RLS policy violations

## Rollback Plan

If migration fails, you can rollback:

```sql
-- WARNING: This is a simplified rollback - adjust based on your needs
BEGIN;

-- Recreate institutions table (simplified structure)
CREATE TABLE institutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subdomain TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#027659',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Re-add institution_id columns (simplified - you'll need to restore data)
ALTER TABLE profiles ADD COLUMN institution_id UUID REFERENCES institutions(id);
-- Repeat for other tables...

-- Restore data from backup
-- (Use your backup file to restore data)

COMMIT;
```

**Note**: Full rollback requires restoring from backup. The above is just schema restoration.

## Common Issues & Solutions

### Issue: "Column institution_id does not exist"
**Solution**: Regenerate TypeScript types after migration

### Issue: "Table institutions does not exist"
**Solution**: This is expected - the migration drops this table. Use `settings` table instead.

### Issue: "RLS policy violation"
**Solution**: Review and update RLS policies that referenced `institution_id`. The migration attempts to drop these automatically, but you may need to recreate policies.

### Issue: "Settings table not found"
**Solution**: Check that migration Step 5 completed successfully. Verify with:
```sql
SELECT * FROM settings;
```

### Issue: "Admin user cannot login"
**Solution**: Verify admin user exists in `profiles` table with `role = 'admin'` and `is_active = true`

## Verification Queries

Run these SQL queries to verify migration success:

```sql
-- 1. Verify institutions table is dropped
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'institutions'
); -- Should return false

-- 2. Verify settings table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'settings'
); -- Should return true

-- 3. Verify institution_id columns are removed
SELECT table_name, column_name 
FROM information_schema.columns 
WHERE column_name = 'institution_id' 
AND table_schema = 'public'; 
-- Should return no rows (or only in migration file comments)

-- 4. Verify settings table has data
SELECT COUNT(*) FROM settings; -- Should return 1

-- 5. Check for any remaining foreign keys to institutions
SELECT 
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE constraint_type = 'FOREIGN KEY' 
  AND ccu.table_name = 'institutions';
-- Should return no rows
```

## Next Steps After Migration

1. **Test thoroughly** using the checklist above
2. **Create admin users** for your team
3. **Configure branding** via Admin Settings
4. **Invite users** (managers, students) via Admin panel
5. **Monitor** for any issues
6. **Update documentation** for end users

## Support

If you encounter issues:
1. Check application logs
2. Check Supabase logs (Dashboard > Logs)
3. Verify migration completed successfully
4. Check RLS policies are correct
5. Verify TypeScript types are regenerated

---

**Migration File**: `supabase/migrations/20250101000000_remove_multi_tenancy.sql`
**Last Updated**: After codebase review
**Status**: Ready for testing and migration
