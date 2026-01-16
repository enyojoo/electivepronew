<div align="center">

**Automate Elective Course Selection**

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](https://opensource.org/licenses/AGPL-3.0)
[![Next.js](https://img.shields.io/badge/Next.js-16.0-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Enabled-green?logo=supabase)](https://supabase.com)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

[Features](#-features) • [Quick Start](#-quick-start) • [Hosted Service](#-hosted-service) • [Contributing](CONTRIBUTING.md)

</div>

---

## 🎯 Overview

ElectivePRO is an open-source platform that automates elective course selection, reducing administrative workload by 50% and eliminating scheduling errors. Built with Next.js, TypeScript, and Supabase, it provides a modern portal for students while freeing staff to focus on student success.

### Why ElectivePRO?

- ⏰ **50% Time Savings** - Reduce administrative workload from 40 hours to 20 hours per week
- 🚫 **Zero Scheduling Errors** - Eliminate course conflicts and registration mistakes
- 🎓 **Modern Student Portal** - Self-service interface for seamless course selection
- 👨‍🏫 **Staff Empowerment** - Free educators to focus on teaching and student success
- 🚀 **Modern Stack** - Built with Next.js 16, React 19, and TypeScript
- 🎨 **Beautiful UI** - Modern, responsive design with bilingual support (English/Russian)
- 🔒 **Secure** - Built-in authentication, role-based access control, and data encryption
- 📱 **Mobile First** - Fully responsive design that works on all devices
- 🔧 **Self-Hostable** - Complete control over your data and infrastructure
- 🌍 **Open Source** - Free to use, modify, and distribute under AGPL-3.0

---

## ✨ Features

### Course Selection Management
- 🎨 **Course Builder** - Drag-and-drop interface to build elective course packs
- 📅 **Selection Periods** - Configure selection windows with automated opening/closing and capacity limits
- 📋 **Selection Rules** - Set maximum course selections per student with group/program-based access
- 📚 **Course Management** - Create and manage courses with multilingual descriptions and instructor details

### Exchange Programs
- 🌍 **Exchange Builder** - Create and manage international exchange opportunities
- 🏛️ **Application Management** - Handle exchange applications with automated workflows
- 🗺️ **University Partnerships** - Centralize partner university information and relationships
- 📊 **Selection Tracking** - Track student exchange selections and manage the entire process

### Student Experience
- 📱 **Self-Service Portal** - Modern, mobile-responsive interface accessible 24/7
- 👁️ **Real-Time Status** - Live status updates for selections (pending, approved, rejected)
- 🔍 **Course Discovery** - Intuitive browsing with search, filters, and course details
- 📋 **Application Tracking** - Track all selections with automated email notifications

### Administrative Tools
- ✅ **Approval Workflows** - Approve/reject selections with clear overviews and notifications
- 📊 **Analytics Dashboard** - Real-time analytics on trends, capacity, and student statistics
- 👥 **User Management** - Role-based access control (Admin, Manager, Student roles)
- 📈 **Data Exports** - Export selections and enrollment data to CSV for analysis

### System Features
- 🎨 **Custom Branding** - Platform name, logos, colors, and SEO metadata customization
- 📧 **Email Notifications** - Comprehensive email system with SendGrid integration
- 🌐 **Bilingual Support** - Full English and Russian language support
- 🔐 **Enterprise Security** - Role-based access control and data encryption
- 📱 **Mobile Responsive** - Optimized for all devices and screen sizes

### Developer Experience
- 🔧 TypeScript for type safety
- 📦 Well-structured, maintainable codebase
- 🎨 shadcn/ui component library
- ⚡ Optimized performance with caching
- 🔄 Real-time data synchronization
- 🧪 Clean architecture and patterns

---

## 🛠️ Tech Stack

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **UI Library:** [React 19](https://react.dev/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Components:** [Radix UI](https://www.radix-ui.com/) + [shadcn/ui](https://ui.shadcn.com/)
- **Database:** [Supabase](https://supabase.com/) (PostgreSQL)
- **Authentication:** Supabase Auth
- **State Management:** React Hooks + Context API
- **Forms:** [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/)
- **Email Service:** [SendGrid](https://sendgrid.com/)
- **Internationalization:** Custom i18n implementation
- **Icons:** [Lucide React](https://lucide.dev/)
- **Country Flags:** [flag-icons](https://flagicons.lipis.dev/)

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18.0 or higher
- npm 10.0 or higher (or pnpm)
- A Supabase account (free tier works)
- SendGrid account (for email notifications, optional)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/enyojoo/electivepronew.git
   cd electivepronew
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file in the root directory:
   ```env
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

   # Email Notifications (SendGrid)
   SENDGRID_API_KEY=your_sendgrid_api_key
   SENDGRID_FROM_EMAIL=noreply@yourdomain.com
   SENDGRID_FROM_NAME=ElectivePRO
   SENDGRID_REPLY_TO=support@yourdomain.com

   # App URL
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

4. **Set up Supabase Database**
   
   a. **Create a Supabase Project**
      - Go to [supabase.com](https://supabase.com) and sign up/login
      - Click "New Project"
      - Choose your organization, enter project name, database password, and region
      - Wait for the project to be created (takes ~2 minutes)
   
   b. **Get your Supabase credentials**
      - Go to Project Settings → API
      - Copy your `Project URL` (this is your `NEXT_PUBLIC_SUPABASE_URL`)
      - Copy your `anon` `public` key (this is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
      - Copy your `service_role` `secret` key (this is your `SUPABASE_SERVICE_ROLE_KEY`)
      - Update your `.env.local` file with these values
   
   c. **Run the database migration**
      - In your Supabase project, go to SQL Editor
      - Click "New Query"
      - Open the file `supabase/migrations/database_setup.sql` from this repository
      - Copy the entire contents of the file
      - Paste it into the SQL Editor
      - Click "Run" (or press Cmd/Ctrl + Enter)
      - Wait for the migration to complete (you should see "Success. No rows returned")
   
   d. **Verify the migration**
      - Go to Table Editor in Supabase
      - You should see all the tables created: `profiles`, `degrees`, `programs`, `academic_years`, `groups`, `courses`, `elective_courses`, `elective_exchange`, `universities`, `student_profiles`, `manager_profiles`, `course_selections`, `exchange_selections`, and `settings`

5. **Start the development server**
   ```bash
   npm run dev
   # or
   pnpm dev
   ```
   
   This will start the application at [http://localhost:3000](http://localhost:3000)

6. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

### First Admin User

After setting up the database, create your first admin user through the Supabase dashboard or by using the signup API endpoint.

### Customize Branding

Once logged in as an admin, navigate to **Settings → Branding** to customize your platform:
- Set your platform name and description (English and Russian)
- Upload custom logos for light and dark modes
- Set a custom favicon
- Configure primary color
- Configure contact email and app URL (used in email templates)
- Configure SEO metadata (title, description, keywords, and image)

These settings will automatically update across your entire platform, including the logo in the sidebar, favicon in browser tabs, email templates, and SEO tags for better search engine visibility.

### System Setup Steps

After customizing your branding, follow these setup steps to get your platform ready for use:

1. **Create Academic Degrees** (Settings → Degrees)
   - Add your institution's degree programs (Bachelor's, Master's, etc.)
   - Include both English and Russian names
   - Set degree codes and status

2. **Create Student Groups** (Settings → Groups)
   - Set up student groups/classes for each academic year
   - Configure group capacity and academic year associations

3. **Add Partner Universities** (Admin → Universities)
   - Add universities for exchange programs
   - Include university details, locations, and contact information
   - Upload university logos and flags

4. **Create Course Catalog** (Admin → Courses)
   - Build your complete course catalog
   - Add course details, descriptions, and instructor information
   - Support for both English and Russian content

5. **Import/Create Users** (Settings → Users)
   - Import users via CSV with name and email
   - Or create users manually
   - Set appropriate roles (Admin, Program Manager, Student)
   - Assign degrees, groups, and academic years
   - Users receive welcome emails with login credentials

6. **Create Elective Course Packs** (Manager → Electives → Course Builder)
   - Program managers can now create elective course packs
   - Set selection periods, capacity limits, and eligibility rules
   - Configure course selection workflows

7. **Set Up Exchange Programs** (Manager → Electives → Exchange Builder)
   - Create international exchange opportunities
   - Configure application periods and requirements
   - Manage partner university relationships

### Email Notifications

ElectivePRO includes a comprehensive email notification system powered by SendGrid. The following emails are automatically sent:

**User Emails:**
- **Welcome Email** - Sent when a new user signs up
- **Selection Confirmation** - Sent when a student submits a selection
- **Selection Approved** - Sent when a selection is approved
- **Selection Rejected** - Sent when a selection is rejected
- **Deadline Reminder** - Sent before selection deadlines

**Admin Emails:**
- **New Selection Notification** - Sent to admins when a new selection is submitted

All emails use your platform's branding (name, logo, contact email, and app URL) configured in Settings → Branding. Emails support both English and Russian languages based on user preferences.

**Setup:**
1. Create a SendGrid account at [sendgrid.com](https://sendgrid.com)
2. Generate an API key in SendGrid dashboard
3. Add `SENDGRID_API_KEY` to your `.env.local` file
4. Optionally configure `SENDGRID_FROM_EMAIL`, `SENDGRID_FROM_NAME`, and `SENDGRID_REPLY_TO`

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details on how to get started, development setup, and contribution guidelines.

---

## 🏗️ Project Structure

```
electivepronew/
├── app/                    # Next.js app router pages
│   ├── admin/              # Admin dashboard pages
│   │   ├── courses/        # Course management
│   │   ├── dashboard/      # Admin dashboard
│   │   ├── electives/      # Elective management
│   │   ├── groups/         # Group management
│   │   ├── settings/       # System settings
│   │   ├── universities/   # University management
│   │   └── users/          # User management
│   ├── manager/            # Program manager pages
│   │   ├── dashboard/      # Manager dashboard
│   │   └── electives/      # Elective builder
│   ├── student/            # Student-facing pages
│   │   ├── courses/        # Course selection
│   │   ├── dashboard/      # Student dashboard
│   │   ├── electives/      # Elective browsing
│   │   └── exchange/       # Exchange program selection
│   ├── api/                # API routes
│   └── actions/            # Server actions
├── components/             # React components
│   ├── layout/            # Layout components
│   ├── settings/          # Settings components
│   └── ui/                # UI components (shadcn/ui)
├── hooks/                  # Custom React hooks
│   └── use-cached-*.ts    # Data caching hooks
├── lib/                    # Utilities and helpers
│   ├── email/             # Email service and templates
│   ├── supabase/          # Supabase utilities
│   └── *.ts               # Utility functions
├── actions/                # Server actions
├── supabase/               # Database migrations
│   └── migrations/        # SQL migration files
├── public/                 # Static assets
│   └── flags/             # Country flag SVGs
└── scripts/                # Build scripts
    └── copy-flags.js      # Flag asset copy script
```

---

## 🌐 Hosted Service

Don't want to manage infrastructure? We offer a fully managed hosted service with:

- ✅ **Zero Setup** - Get started in minutes, not weeks. We handle all the infrastructure setup and configuration
- ✅ **Managed Infrastructure** - We manage servers, databases, backups, and updates so you can focus on your content
- ✅ **Security & Compliance** - Enterprise-grade security with regular updates, SSL certificates, and compliance standards
- ✅ **Professional Support** - Get help when you need it with priority support and dedicated account management
- ✅ **Automatic Backups** - Your data is automatically backed up daily with point-in-time recovery options
- ✅ **Scalable Infrastructure** - Scale seamlessly as your student base grows without worrying about infrastructure limits

**Learn more about our hosted service, including pricing plans and features:** [https://electivepro.net/hosted](https://electivepro.net/hosted)

---

## 📝 License

This project is licensed under the **AGPL-3.0 License** - see the [LICENSE](LICENSE) file for details.

### Using ElectivePRO

**For Your Own Use (Self-Hosting):**
- ✅ You can freely download, install, and use ElectivePRO for your own organization
- ✅ You can modify the code to fit your needs
- ✅ No restrictions on internal use - use it privately within your organization

**Commercial Use & Distribution:**
- ✅ You can use ElectivePRO commercially (e.g., offer it as a service to universities)
- ✅ You can modify and distribute ElectivePRO
- ⚠️ **Important:** If you modify ElectivePRO and provide it as a hosted service (SaaS), you must make your modifications available under AGPL-3.0
- ⚠️ If you want to create a proprietary hosted service without sharing modifications, you'll need a commercial license

**Commercial License:**
If you need to use ElectivePRO in a proprietary application or provide a hosted service without open-sourcing your modifications, commercial licenses are available. <a href="https://electivepro.net/contact" target="_blank" rel="noopener noreferrer">Contact us</a> for more information.

---

## 🆘 Support

- 📧 [Email Support](mailto:support@electivepro.net)
- 💬 [Contact Us](https://electivepro.net/contact) - Schedule a meeting or send us a message
- 🐦 [Twitter (X)](https://x.com/enyosaam) - Follow us for updates

---

<div align="center">

**Made with ❤️ to power education**

<a href="https://electivepro.net" target="_blank" rel="noopener noreferrer">Website</a> • <a href="https://x.com/enyosaam" target="_blank" rel="noopener noreferrer">Twitter (X)</a>

</div>
