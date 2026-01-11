# Environment Variables Setup

## Where to Create .env Files

**Important**: Environment variable files should be created in the **project root directory** (same level as `package.json`), **NOT** in the `/app` folder.

### Project Structure
```
electivepronew/
├── .env.local          ← Create here (root directory)
├── .env.local.example  ← Example file (already created)
├── package.json
├── next.config.mjs
├── app/
│   └── ... (your app code)
└── ...
```

## Environment Files

### `.env.local` (Local Development)
Create this file in the **root directory** for local development:

```bash
# In the project root: /Users/a1/electivepronew/.env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### `.env.local.example` (Template)
This file is already created in the root directory as a template. Copy it to `.env.local` and fill in your values.

## Why Root Directory?

1. **Next.js Convention**: Next.js automatically loads `.env*` files from the project root
2. **Security**: `.env.local` is in `.gitignore` (already configured)
3. **Accessibility**: All parts of your app can access these variables
4. **Build Process**: Next.js reads env vars from root during build

## For Vercel Deployment

Add these same variables in **Vercel Dashboard > Settings > Environment Variables**:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL`

Vercel will automatically use these during build and runtime.

## Quick Setup

```bash
# From project root
cd /Users/a1/electivepronew

# Copy the example file
cp .env.local.example .env.local

# Edit with your Supabase credentials
# (Use your preferred editor: nano, vim, code, etc.)
```

## Verification

After creating `.env.local`, verify it's in the right place:

```bash
# Should show .env.local in root
ls -la | grep .env

# Should NOT be in app folder
ls app/ | grep .env  # Should return nothing
```
