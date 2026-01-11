# Vercel Deployment Guide for ElectivePRO

## Required Environment Variables

Add these environment variables in your Vercel project settings:

### 1. Supabase Configuration (Required)

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**Where to find these:**
1. Go to your Supabase Dashboard
2. Navigate to **Settings > API**
3. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` ⚠️ **Keep this secret!**

### 2. Site URL (Required for Password Reset)

```env
NEXT_PUBLIC_SITE_URL=https://your-domain.vercel.app
```

**For production:**
- Use your custom domain: `https://electivepro.yourinstitution.edu`
- Or your Vercel domain: `https://your-project.vercel.app`

**For preview deployments:**
- Vercel automatically provides this, but you can set it manually if needed

## Step-by-Step Vercel Deployment

### Step 1: Prepare Your Repository

1. Push your code to GitHub (or GitLab/Bitbucket)
2. Make sure all your code is committed and pushed

### Step 2: Create Vercel Project

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Add New Project"**
3. Import your repository
4. Vercel will auto-detect Next.js

### Step 3: Configure Environment Variables

1. In the project setup, go to **"Environment Variables"** section
2. Add each variable one by one:

   **Variable 1:**
   - Name: `NEXT_PUBLIC_SUPABASE_URL`
   - Value: `https://your-project-ref.supabase.co`
   - Environment: Select **Production**, **Preview**, and **Development**

   **Variable 2:**
   - Name: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Value: `your-anon-key-here`
   - Environment: Select **Production**, **Preview**, and **Development**

   **Variable 3:**
   - Name: `SUPABASE_SERVICE_ROLE_KEY`
   - Value: `your-service-role-key-here`
   - Environment: Select **Production**, **Preview**, and **Development**
   - ⚠️ **Important**: This is sensitive - don't expose it publicly

   **Variable 4:**
   - Name: `NEXT_PUBLIC_SITE_URL`
   - Value: `https://your-domain.vercel.app` (or your custom domain)
   - Environment: Select **Production**, **Preview**, and **Development**

### Step 4: Configure Build Settings

Vercel should auto-detect Next.js, but verify:

- **Framework Preset**: Next.js
- **Build Command**: `npm run build` (or `pnpm build` / `yarn build`)
- **Output Directory**: `.next` (default)
- **Install Command**: `npm install` (or `pnpm install` / `yarn install`)

### Step 5: Deploy

1. Click **"Deploy"**
2. Wait for the build to complete
3. Your app will be live at `https://your-project.vercel.app`

### Step 6: Update Site URL (After First Deployment)

After deployment, update `NEXT_PUBLIC_SITE_URL` with your actual Vercel URL:

1. Go to **Settings > Environment Variables**
2. Update `NEXT_PUBLIC_SITE_URL` to your Vercel deployment URL
3. Redeploy (or it will update on next push)

## Environment Variable Summary

| Variable | Required | Description | Where Used |
|----------|----------|-------------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Yes | Supabase project URL | All Supabase client initializations |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ Yes | Supabase anon/public key | Client-side Supabase operations |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Yes | Supabase service role key | Server-side admin operations |
| `NEXT_PUBLIC_SITE_URL` | ✅ Yes | Your app's public URL | Password reset redirects |

## Post-Deployment Checklist

- [ ] All environment variables are set in Vercel
- [ ] Database migration has been run in Supabase
- [ ] First admin user has been created
- [ ] Test login functionality
- [ ] Test password reset (verify redirect URL)
- [ ] Configure custom domain (optional)
- [ ] Set up SSL certificate (automatic with Vercel)

## Troubleshooting

### Build Fails

**Error: Missing environment variables**
- Ensure all 4 variables are set in Vercel
- Check that variable names match exactly (case-sensitive)

**Error: Supabase connection failed**
- Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
- Verify `NEXT_PUBLIC_SUPABASE_ANON_KEY` is correct
- Check Supabase project is active

### Runtime Errors

**Error: Service role key not found**
- Ensure `SUPABASE_SERVICE_ROLE_KEY` is set
- Check it's available in the environment you're deploying to

**Password reset not working**
- Verify `NEXT_PUBLIC_SITE_URL` matches your deployment URL
- Check Supabase Auth settings for allowed redirect URLs

### Custom Domain Setup

1. Go to Vercel project **Settings > Domains**
2. Add your custom domain
3. Follow DNS configuration instructions
4. Update `NEXT_PUBLIC_SITE_URL` to your custom domain
5. Redeploy

## Security Best Practices

1. **Never commit** `.env.local` or environment variables to Git
2. **Use Vercel's environment variables** for all secrets
3. **Rotate keys** if accidentally exposed
4. **Use different Supabase projects** for staging and production
5. **Enable Vercel's security features** (2FA, etc.)

## Example .env.local (Local Development Only)

For local development, create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

**⚠️ Important**: Add `.env.local` to `.gitignore` to prevent committing secrets.

## Additional Vercel Settings

### Enable Preview Deployments

Preview deployments automatically use the same environment variables. You can also set different values for preview environments if needed.

### Automatic Deployments

- **Production**: Deploys from `main` or `master` branch
- **Preview**: Deploys from pull requests and other branches

### Build Optimization

Vercel automatically optimizes Next.js builds. No additional configuration needed.

---

**Need Help?** Check the [Vercel Documentation](https://vercel.com/docs) or [Supabase Documentation](https://supabase.com/docs).
