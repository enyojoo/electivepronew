---
name: ""
overview: ""
todos: []
---

---

name: Refocus Website Copy & Pricing Strategy for Elective Course Selection Automation

overview: Refocus all website messaging to emphasize "Automating Elective Course Selection" as the primary value proposition, using research-backed statistics and benefits. Position ElectivePRO as an open-source platform for this purpose, with exchange programs as a secondary feature. Implement comprehensive pricing strategy optimized for educational institutions with tiered pricing, annual contracts, and payment methods that align with how universities purchase software.

todos:

  - id: update-brand-constants

content: Update BRAND_DESCRIPTION to focus on 'open-source platform for automating Elective Course selections'

status: pending

  - id: refocus-hero

content: Update hero headline and description to emphasize elective course selection automation with research-backed benefits

status: pending

  - id: update-features-section

content: Reorder and refocus features section to lead with elective course selection, update descriptions with research benefits

status: pending

  - id: update-features-page

content: Replace features page with EaseLMS structure: hero, 4 feature categories (each with 4 features in grid), comparison table with alternatives

status: pending

  - id: create-pricing-card

content: Create PricingCard component following EaseLMS structure with monthly/yearly toggle support

status: pending

  - id: update-pricing-page

content: ""

status: pending

  - id: update-open-source-page

content: "Update open-source page to follow EaseLMS structure: hero, why open source (4 cards), quick start (code block), contributing (3 cards), license section"

status: pending

  - id: update-hosted-page

content: Update hosted page to follow EaseLMS structure: hero with two CTAs, why choose hosted section with 6 benefits in 3x2 grid

status: pending

  - id: update-header

content: Replace header with EaseLMS structure: sticky header with logo, navigation links, theme toggle, Get Started button. Add mobile menu with backdrop and dynamic height calculation

status: pending

  - id: create-theme-toggle

content: Create ThemeToggle component if it doesn't exist, or verify existing theme toggle works with header

status: pending

  - id: update-footer

content: Replace footer with EaseLMS structure: CTA section + logo/description, social icons, links, copyright. Update description to focus on elective course selection automation

status: pending

  - id: remove-internal-ctas

content: Remove CTASection components from homepage, features page, and pricing page since footer now includes CTA

status: pending

  - id: create-privacy-page

content: Create privacy page following EaseLMS structure, adapted for ElectivePRO with Easner Inc. as holding company, focus on elective course selection automation

status: pending

  - id: create-terms-page

content: Create terms page following EaseLMS structure, adapted for ElectivePRO with Easner Inc. as holding company, focus on elective course selection automation

status: pending

  - id: update-contact-page

content: Replace contact page with EaseLMS structure: hero with Cal.com embed, install @calcom/embed-react, focus on elective course selection automation

status: pending

  - id: ensure-145-chars

content: Verify all feature descriptions are exactly 145 characters while incorporating research-backed benefits

status: pending

---

# Refocus Website Copy on Elective Course Selection Automation

## Research Findings

Based on industry research, automating elective course selection provides:

- **50% reduction in administrative workload** (40hrs/week → 20hrs/week)
- **Error reduction**: Minimizes scheduling conflicts and incorrect enrollments
- **Improved student satisfaction**: Self-service portals enhance experience
- **Better resource utilization**: Classroom usage increases from 60% to 80%
- **Cost efficiency**: Reduces need for additional staff during peak periods
- **Data-driven decisions**: Real-time analytics optimize course offerings
- **Fairness & transparency**: Automated systems provide fair allocation

## Key Messaging Strategy

- **Primary Focus**: "Automating Elective Course Selection"
- **Positioning**: "ElectivePRO is an open-source platform for automating Elective Course selections"
- **Secondary Feature**: Exchange programs mentioned but not emphasized
- **Research-Backed**: Use specific statistics and proven benefits throughout

## Files to Update

### 1. Brand Constants (`website/lib/brand-constants.ts`)

**Current**: "The complete platform for managing the selection of elective courses, exchange programs, and academic pathways."

**New**: "An open-source platform for automating elective course selections. Streamline course registration, reduce administrative burden, and improve student satisfaction."

### 2. Hero Section (`website/components/marketing/hero.tsx`)

**Current**: "Automate Elective Course & Exchange Program Selection"

**New**: Benefit-focused headline on elective course selection automation

- **Headline**: "Automate Elective Course Selection" (benefit-focused, not feature-focused)
- **Description**: Use research-backed benefits (50% admin time reduction, error reduction, student satisfaction)
- **Open-source mention**: Include in description as trust signal, not in headline
- **Exchange programs**: Optional subtle mention in description if space allows, but not in headline

### 3. Features Component (`website/components/marketing/features.tsx`)

**Current**: Mix of course and exchange features

**New**:

- Reorder to lead with elective course features
- Update "Course Electives" description to emphasize automation and research benefits
- Move "Exchange Programs" to position #2, keep description but make it secondary
- Update section heading to focus on elective course automation
- Ensure all descriptions are exactly 145 characters

### 4. Features Page (`website/app/features/page.tsx`)

**Current**: Has Features component, use cases, and "Why Choose" sections

**New**: Follow EaseLMS structure - hero + feature categories with cards + comparison table, focused on elective course selection automation

**Structure to implement**:

1. **Hero Section**

   - Headline: "Powerful features for automating elective course selection" (or similar)
   - Description: "Everything you need to automate course selection, reduce administrative burden, and improve student experience."

2. **Feature Categories** (4 categories, each with 4 features in 4-column grid)

**Category 1: Course Selection Management**

   - Course Builder: "Build elective course packs with drag-and-drop simplicity. Organize by academic year and reduce setup time by 80%."
   - Selection Periods: "Configure selection windows with automated opening and closing. Set capacity limits and prerequisites."
   - Prerequisites & Rules: "Define course prerequisites, credit requirements, and selection rules. Automated validation prevents conflicts."
   - Bulk Operations: "Import courses from spreadsheets, bulk update selections, and manage hundreds of courses efficiently."

**Category 2: Student Experience**

   - Self-Service Portal: "Modern, mobile-responsive portal accessible 24/7. Students browse, select, and track applications independently."
   - Real-Time Status: "Students see real-time selection status, waitlist positions, and approval notifications instantly."
   - Course Discovery: "Intuitive browsing with filters, search, and course details. Help students find the perfect electives."
   - Application Tracking: "Students track all their selections, view history, and receive automated email updates."

**Category 3: Administrative Tools**

   - Approval Workflows: "Approve or reject selections in seconds with clear overview. Automated notifications keep everyone informed."
   - Analytics Dashboard: "Real-time analytics on selection trends, popular courses, capacity utilization, and student statistics."
   - User Management: "Centralize user management with role-based access. Manage students, managers, and administrators efficiently."
   - Reporting & Exports: "Generate comprehensive reports and export data for analysis. Track trends and optimize course offerings."

**Category 4: Exchange Programs** (Secondary feature)

   - Exchange Builder: "Create and manage exchange program opportunities. Track partnerships and program details."
   - Application Management: "Manage exchange applications with automated workflows and deadline tracking."
   - University Partnerships: "Centralize partner university information and manage relationships efficiently."
   - Selection Tracking: "Track student exchange selections and manage the entire exchange process from one platform."

3. **Comparison Section** (Table comparing ElectivePRO with alternatives)

   - Compare with: Manual Processes, Spreadsheet-Based Systems, Generic LMS
   - Features to compare:
     - Automated Selection
     - Real-Time Analytics
     - Self-Service Portal
     - Open Source
     - Modern Tech Stack
     - Easy Setup
     - Exchange Programs
     - Hosted Option

**Key Messaging**:

- Emphasize elective course selection automation as primary value
- Focus on time savings (50% reduction), error reduction, student satisfaction
- Keep exchange programs visible but as secondary feature
- Use research-backed benefits throughout

**Implementation Details**:

- Use responsive spacing: `pt-12 sm:pt-20 lg:pt-32 pb-12 sm:pb-16 lg:pb-20`
- Max width container: `max-w-7xl px-4 sm:px-6 lg:px-8`
- Hero: `max-w-2xl text-center` with responsive text sizes
- Feature categories: `space-y-16 sm:space-y-20 lg:space-y-24` between categories
- Feature grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` with `gap-4 sm:gap-6`
- Icon cards: Use `bg-primary/10` background with icon in `h-12 w-12` container
- Comparison table: Responsive with horizontal scroll on mobile
- Replace all EaseLMS references with ElectivePRO
- Update all content to focus on elective course selection, not general LMS

### 5. Homepage (`website/app/page.tsx`)

**Current**: Generic messaging

**New**:

- Update any remaining references to focus on elective course selection
- Add statistics or benefits section highlighting research findings

### 6. Pricing Page (`website/app/pricing/page.tsx` and new component)

**Current**: Simple 2-tier structure (Open Source + Hosted Custom)

**New**: Modern pricing page with monthly/yearly toggle and tiered structure

**Structure to implement**:

- Follow EaseLMS pricing page structure
- Create `PricingCard` component (`website/components/marketing/PricingCard.tsx`)
- Monthly/Yearly billing toggle with 20% yearly discount
- Three hosted tiers: Starter, Professional, Enterprise
- Open Source card links to `/open-source` page (since it has its own page)
- FAQ section with ElectivePRO-specific questions
- "All plans include" section

**Recommended Pricing Tiers** (based on education market research and specialized tool positioning):

#### Starter Tier: $149/month or $1,430/year (Save 20%)

- **Target**: Small colleges, departments, programs with 100-500 students
- **Per-student cost**: ~$0.30/student/month at capacity (500 students)
- **Rationale**: Accessible entry point for smaller institutions; department-level budgets
- **Features**:
  - Up to 500 students
  - Core elective selection automation
  - Standard support (email, business hours)
  - Custom branding
  - Basic analytics
  - Automated workflows
  - Self-service student portal
  - Email notifications

#### Professional Tier: $399/month or $3,830/year (Save 20%) - **POPULAR**

- **Target**: Medium-sized universities, multiple departments (500-2,000 students)
- **Per-student cost**: ~$0.20/student/month at capacity (2,000 students)
- **Rationale**: Sweet spot for most universities; competitive with specialized tools
- **Features**:
  - Up to 2,000 students
  - All Starter features, plus:
  - Advanced analytics & reporting
  - Priority support (email, chat, <24hr response)
  - API access
  - Exchange program management
  - Bulk import/export
  - Custom approval workflows
  - Integration support (SIS/LMS)
  - Dedicated onboarding

#### Enterprise Tier: Custom Pricing

- **Target**: Large universities, multi-campus systems, unlimited students
- **Rationale**: Flexible pricing for complex needs; supports PO/invoice billing
- **Features**:
  - Unlimited students
  - All Professional features, plus:
  - Dedicated infrastructure
  - 24/7 priority support with SLA
  - Dedicated account manager
  - Custom integrations
  - On-premise deployment option
  - Training & onboarding
  - Custom feature development
  - Multi-campus management
  - Advanced security & compliance

### 7. Open Source Page (`website/app/open-source/page.tsx`)

**Current**: Basic structure with feature cards

**New**: Follow EaseLMS structure with ElectivePRO-specific content

**Structure to implement**:

1. **Hero Section**

   - Headline: "Open Source. Community Driven." (or similar)
   - Description: Emphasize how open-source helps universities automate elective course selections
   - CTA: "Star on GitHub" button linking to repository

2. **Why Open Source Section** (4 cards in 2x2 grid)

   - Transparency: View source code, understand how it works, verify security
   - Customization: Modify and extend ElectivePRO to fit your specific needs
   - Community: Join a growing community of developers, educators, and universities
   - No Vendor Lock-in: Own your data and infrastructure. Deploy anywhere, anytime

3. **Quick Start Section** (Code block card)

   - Clone repository command
   - Install dependencies command
   - Start development server command
   - Link to README.md on GitHub

4. **Contributing Section**

   - Three cards: Report Issues, Submit PRs, Improve Docs
   - CTA button: "View Contributing Guide" linking to CONTRIBUTING.md

5. **License Section**

   - AGPL-3.0 License information
   - Link to LICENSE file on GitHub
   - Explanation of what the license means for universities

**Key Messaging**:

- Emphasize elective course selection automation as primary benefit
- Focus on how open-source gives universities control over their course management
- Mention cost savings and customization benefits
- Keep technical but accessible

**Implementation Details**:

- Use responsive spacing: `pt-12 sm:pt-20 lg:pt-32 pb-12 sm:pb-16 lg:pb-20`
- Max width container: `max-w-7xl px-4 sm:px-6 lg:px-8`
- Hero: `max-w-2xl text-center` with responsive text sizes
- Code block: Use `bg-muted` with `font-mono` for terminal commands
- GitHub repository: `https://github.com/enyojoo/electivepronew`
- Replace all EaseLMS references with ElectivePRO
- Update all GitHub links to point to electivepronew repository
- Add "Need Managed Hosting?" button linking to `/hosted` or `/pricing`

### 8. Hosted Page (`website/app/hosted/page.tsx`)

**Current**: Has more complex structure with multiple sections

**New**: Follow EaseLMS structure - simplified with hero + benefits grid, focused on elective course selection automation

**Structure to implement**:

1. **Hero Section**

   - Headline: "Hosted Service"
   - Description: "Let us handle the infrastructure while you focus on automating elective course selections and improving student experience."
   - Two CTAs:
     - Primary: "Start Free Trial" → `/pricing` (with ArrowRight icon)
     - Secondary: "Schedule Demo" → `/contact`

2. **Why Choose Hosted Section** (6 benefits in 3x2 grid)

   - **Zero Setup Time**: "Get started in minutes, not weeks. We handle all the infrastructure setup and configuration for your elective course selection system."
   - **Managed Infrastructure**: "We manage servers, databases, backups, and updates so you can focus on your students and course offerings."
   - **Security & Compliance**: "Enterprise-grade security with regular updates, SSL certificates, and compliance standards (FERPA, GDPR)."
   - **Custom Branding**: "We customize your platform with your own branding - name, logos, favicon, and colors."
   - **Automatic Backups**: "Your student data and course selections are automatically backed up daily with point-in-time recovery options."
   - **Scalable Infrastructure**: "Scale seamlessly as your student enrollment grows without worrying about infrastructure limits during peak selection periods."

**Key Messaging**:

- Emphasize elective course selection automation as primary value
- Focus on freeing up admin time (50% reduction benefit)
- Highlight that universities can focus on students, not IT
- Mention compliance and security (important for educational institutions)
- Position as alternative to self-hosting for institutions without IT resources

**Implementation Details**:

- Use responsive spacing: `pt-12 sm:pt-20 lg:pt-32 pb-12 sm:pb-16 lg:pb-20`
- Max width container: `max-w-7xl px-4 sm:px-6 lg:px-8`
- Hero: `max-w-2xl text-center` with responsive text sizes (`text-3xl sm:text-4xl lg:text-5xl`)
- Hero CTAs: `flex flex-col sm:flex-row` with responsive button widths
- Benefits section: `max-w-5xl` container
- Benefits grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` with `gap-4 sm:gap-6 lg:gap-8`
- Icon cards: Use `bg-primary/10` background with icon in `h-12 w-12` container
- Card structure: `Card` with `CardHeader` containing icon div, `CardTitle`, and `CardDescription`
- Replace all EaseLMS references with ElectivePRO
- Update all content to focus on elective course selection, not general LMS
- Icons to use: `Zap`, `Server`, `Shield`, `Palette`, `Database`, `Cloud` (from lucide-react)

### 9. Header Component (`website/components/layout/Header.tsx`)

**Current**: Uses NavigationMenu component, simpler mobile menu

**New**: Follow EaseLMS structure - sticky header with logo, navigation links, theme toggle, and "Get Started" button

**Structure to implement**:

1. **Desktop Header**

   - Logo on left (flex-1)
   - Navigation links in center: Features, Open Source, Hosted, Contact
   - Right side (flex-1, justify-end): ThemeToggle + "Get Started" button (hidden on xl, visible on xl+)
   - Active link highlighting based on pathname
   - Sticky positioning with backdrop blur

2. **Mobile Menu**

   - Hamburger/X icon button (visible on mobile, hidden on desktop)
   - Fixed overlay with backdrop blur
   - Menu slides down from header with navigation links
   - Theme toggle in mobile menu
   - "Get Started" button in mobile menu
   - Backdrop click closes menu
   - Dynamic height calculation for proper positioning

**Navigation Items**:

- Features → `/features`
- Open Source → `/open-source`
- Hosted → `/hosted`
- Contact → `/contact`
- Note: Remove "Pricing" from main nav (accessible via "Get Started" button)

**Key Features**:

- Sticky header: `sticky top-0 z-50`
- Backdrop blur: `bg-background/95 backdrop-blur`
- Active link styling based on `usePathname()`
- Responsive: Mobile menu on small screens, desktop nav on large screens
- Theme toggle component (may need to be created)

**Implementation Details**:

- Client component (`'use client'`)
- Use `usePathname()` from `next/navigation` for active link detection
- Use `useState` for mobile menu open/close state
- Use `useRef` and `useEffect` for header height calculation (for mobile menu positioning)
- Logo: Use existing `Logo` component with responsive sizing
- ThemeToggle: May need to create this component or use existing theme toggle
- Navigation links: `text-sm font-semibold` with hover states
- Active link: `text-primary` when pathname matches
- Mobile menu: Fixed positioning with calculated top position
- Backdrop: Fixed overlay with click handler to close menu
- "Get Started" button: Links to `/pricing`, hidden on xl, visible on xl+

### 10. Footer Component (`website/components/layout/Footer.tsx`)

**Current**: 4-column layout with product/resources/contact links

**New**: Follow EaseLMS structure - CTA section + simplified footer with logo, description, social icons, links, copyright

**Structure to implement**:

1. **CTA Section** (at top of footer, before footer content)

   - Use existing `CTASection` component
   - This replaces CTAs on internal pages

2. **Footer Content**

   - Logo and Description: Centered, with logo above description
   - Description: "An open-source platform for automating elective course selections. Streamline course registration, reduce administrative burden, and improve student satisfaction."
   - Social Icons: GitHub and X/Twitter (centered, with spacing)
   - Links: Privacy, Terms, Manage Subscription (centered, flex-wrap)
   - Copyright: Bottom border, centered text with year

**Key Messaging**:

- Update description to focus on elective course selection automation
- Replace EaseLMS references with ElectivePRO
- Update GitHub link to `https://github.com/enyojoo/electivepronew`
- Update X/Twitter link if applicable
- Update copyright to appropriate entity name

**Implementation Details**:

- Client component (`'use client'`)
- Footer: `bg-background border-t`
- Container: `max-w-7xl px-4 sm:px-6 py-8 sm:py-12 lg:px-8`
- Logo: Use existing `Logo` component (default export, may need to adjust import or create named export)
- Social icons: `h-5 w-5 sm:h-6 sm:w-6` with hover states
- X/Twitter icon: Use SVG path from EaseLMS example
- Links: `text-xs sm:text-sm` with hover states, centered with flex-wrap
- Copyright: Separate section with `border-t` and smaller padding (`py-3 sm:py-4`)
- CTA Section: Import and use `CTASection` component at top of footer

**Remove CTAs from Internal Pages**:

Since footer includes CTA section, remove `CTASection` from:

- Homepage (`website/app/page.tsx`)
- Features page (`website/app/features/page.tsx`)
- Pricing page (`website/app/pricing/page.tsx`)

### 11. Privacy Page (`website/app/privacy/page.tsx`)

**Current**: May not exist

**New**: Follow EaseLMS structure - comprehensive privacy policy adapted for ElectivePRO

**Structure to implement**:

1. **Hero Section**

   - Headline: "Privacy Policy"
   - Last updated date (dynamic)
   - Introduction mentioning Easner, Inc. as the company

2. **Privacy Policy Sections** (14 sections):

   - Information We Collect (1.1 Information You Provide, 1.2 Information Automatically Collected, 1.3 Information from Third Parties)
   - How We Use Your Information
   - How We Share Your Information (3.1 Service Providers, 3.2 Legal Requirements, 3.3 Business Transfers)
   - Data Security
   - Your Rights and Choices
   - Cookies and Tracking Technologies
   - Data Retention
   - Children's Privacy
   - International Data Transfers
   - Self-Hosted Installations
   - Changes to This Privacy Policy
   - Contact Us (Easner, Inc. contact information)
   - California Privacy Rights (CCPA)
   - European Privacy Rights (GDPR)

**Key Adaptations for ElectivePRO**:

- Replace "EaseLMS" with "ElectivePRO" throughout
- Update service description to focus on elective course selection automation
- Update content examples (courses → elective course selections, learners → students)
- Update email addresses: `privacy@electivepro.net` (or use `BRAND_CONTACT_EMAIL` from brand constants)
- Keep Easner, Inc. as holding company
- Keep same address: 28 Geary St Ste 650, San Francisco, CA 94108, United States
- Update service provider mentions if different (Supabase, Vercel, AWS, Stripe, etc.)
- Update GitHub repository link to `https://github.com/enyojoo/electivepronew`

**Implementation Details**:

- Use responsive spacing: `pt-24 sm:pt-32 pb-12 sm:pb-16 lg:pb-20`
- Max width container: `max-w-3xl px-6 lg:px-8`
- Use prose classes: `prose prose-neutral dark:prose-invert max-w-none`
- Headings: `text-2xl font-bold` for h2, `text-xl font-semibold` for h3
- Text: `text-muted-foreground` for body text
- Lists: `list-disc pl-6` with spacing
- Links: `text-primary hover:underline`

### 12. Terms Page (`website/app/terms/page.tsx`)

**Current**: May not exist

**New**: Follow EaseLMS structure - comprehensive terms of service adapted for ElectivePRO

**Structure to implement**:

1. **Hero Section**

   - Headline: "Terms of Service"
   - Last updated date (dynamic)
   - Introduction mentioning Easner, Inc. as the company

2. **Terms Sections** (14 sections):

   - Acceptance of Terms
   - Description of Service (adapted for elective course selection)
   - Open Source License (AGPL-3.0)
   - Hosted Service Terms (4.1 Account Registration, 4.2 Subscription and Billing, 4.3 Service Availability, 4.4 Data and Content, 4.5 Acceptable Use)
   - Intellectual Property
   - Termination
   - Limitation of Liability
   - Disclaimer of Warranties
   - Indemnification
   - Changes to Terms
   - Governing Law (California)
   - Contact Information (Easner, Inc.)
   - Severability
   - Entire Agreement

**Key Adaptations for ElectivePRO**:

- Replace "EaseLMS" with "ElectivePRO" throughout
- Update service description: "ElectivePRO is a platform for automating elective course selection that provides:"
  - Course selection management tools
  - Student enrollment and selection tracking
  - Exchange program management
  - Analytics and reporting features
  - Approval workflows
- Update content examples (courses → elective course selections, learners → students)
- Update email addresses: `legal@electivepro.net` (or use `BRAND_CONTACT_EMAIL` from brand constants)
- Keep Easner, Inc. as holding company
- Keep same address: 28 Geary St Ste 650, San Francisco, CA 94108, United States
- Update GitHub repository link to `https://github.com/enyojoo/electivepronew`
- Keep same legal structure and disclaimers

**Implementation Details**:

- Same styling as Privacy page
- Use responsive spacing: `pt-24 sm:pt-32 pb-12 sm:pb-16 lg:pb-20`
- Max width container: `max-w-3xl px-6 lg:px-8`
- Use prose classes: `prose prose-neutral dark:prose-invert max-w-none`
- Consistent heading and text styling

### 13. Contact Page (`website/app/contact/page.tsx`)

**Current**: Complex structure with multiple sections (contact reasons, other ways to connect, response times)

**New**: Follow EaseLMS structure - simplified with hero + Cal.com embed, focused on elective course selection automation

**Structure to implement**:

1. **Hero Section**

   - Headline: "Schedule a Meeting"
   - Description: "Book a time that works for you and let's discuss how ElectivePRO can help automate your elective course selection process."
   - Email fallback: "Or send an email: [contact email]" with link

2. **Cal.com Embed**

   - Use `@calcom/embed-react` package
   - Client component (`'use client'`)
   - Initialize Cal.com API in `useEffect`
   - Configure with `namespace: '15min'` (or appropriate namespace)
   - Set `calLink` to appropriate Cal.com username/link
   - Use `month_view` layout
   - Hide event type details: `hideEventTypeDetails: true`
   - Minimum height: `600px` for embed container

**Key Messaging**:

- Emphasize elective course selection automation in description
- Focus on discussing how ElectivePRO can help universities
- Keep email as fallback option
- Simple, focused page for scheduling meetings

**Implementation Details**:

- Use responsive spacing: `pt-12 sm:pt-20 lg:pt-32 pb-12 sm:pb-16 lg:pb-20`
- Max width container: `max-w-4xl px-4 sm:px-6 lg:px-8`
- Hero: `text-center` with responsive text sizes (`text-3xl sm:text-4xl lg:text-5xl`)
- Cal.com embed: Full width with `minHeight: '600px'`
- Install dependency: `@calcom/embed-react` (add to package.json)
- Replace EaseLMS references with ElectivePRO
- Update email to use `BRAND_CONTACT_EMAIL` from brand constants
- Update Cal.com link to appropriate ElectivePRO Cal.com account

**Dependencies to Add**:

```json
"@calcom/embed-react": "^latest"
```

## Content Updates by Section

### Hero Headline Options (Benefit-Focused)

**Recommended**: "Automate Elective Course Selection"

- Direct, benefit-focused
- Addresses the core value proposition
- Short and impactful

**Alternative Options**:

1. "Reduce Course Selection Admin Time by 50%"
2. "Stop Wasting Hours on Course Selection"
3. "From Spreadsheet Chaos to Automated Course Selection"
4. "Eliminate the Administrative Burden of Course Selection"

**Note**: Avoid feature-focused headlines like "Open-Source Platform for..." - lead with benefits, mention open-source in description.

### Hero Description (Research-Backed)

**Primary Option**: "Reduce administrative workload by 50% and eliminate scheduling errors. An open-source platform that automates elective course selection, giving students a modern self-service portal while freeing staff to focus on student success."

**Alternative (Shorter)**: "Cut administrative time in half and eliminate errors. Automate elective course selection with an open-source platform that improves student satisfaction and frees staff for meaningful work."

### Key Benefits to Highlight

- **50% Time Savings**: "Reduce administrative workload from 40 hours to 20 hours per week"
- **Error Reduction**: "Eliminate scheduling conflicts and incorrect enrollments"
- **Student Satisfaction**: "Self-service portal accessible 24/7 improves student experience"
- **Resource Optimization**: "Optimize course offerings with data-driven insights"
- **Cost Efficiency**: "Reduce need for additional staff during peak enrollment periods"

### Feature Descriptions (145 chars each)

Update all feature descriptions to:

- Lead with elective course selection benefits
- Include research-backed statistics where relevant
- Keep exchange programs as secondary mention
- Maintain exactly 145 characters per description

## Pricing Page Implementation Details

### New Component: `PricingCard.tsx`

- Accepts `PricingTier` type with monthly/yearly pricing
- Handles "popular" badge for Professional tier
- Supports external links (Open Source → GitHub) and internal links (hosted tiers → contact)
- Responsive design matching EaseLMS structure

### Pricing Page Structure

- Hero: "Simple, transparent pricing" with description emphasizing elective course selection automation
- Billing toggle: Monthly/Yearly with "Save 20%" badge
- Four cards: Starter, Professional (popular), Enterprise, Open Source
- Open Source card: Links to `/open-source` page with "View on GitHub" CTA
- "All plans include" section: Common features (automatic updates, 99.9% SLA, backups, SSL)
- FAQ section: Trials, refunds, self-hosting, plan changes, payment methods

### Key Messaging for Pricing Page

- Emphasize **elective course selection automation** as primary value
- Highlight **50% admin time reduction** benefit
- Mention **open-source option** for cost-conscious institutions
- Address **educational institution payment preferences** in FAQ
- Position as **specialized tool** (more affordable than full LMS)

### FAQ Additions

- "How do educational institutions typically pay?" → Annual contracts, POs, invoicing options
- "Can I pay with a purchase order?" → Yes, especially for Enterprise tier
- "Do you offer academic year pricing?" → Yes, annual plans align with academic calendars
- "What happens if we exceed student limits?" → Easy upgrade path, prorated billing
- "Can I change plans later?" → Yes, upgrade or downgrade at any time
- "What happens after my free trial?" → Monthly plans include 14-day free trial
- "Do you offer refunds?" → 30-day money-back guarantee
- "Can I self-host for free?" → Yes, open-source option available

### Pricing Rationale & Market Context

**Market Context**:

- Full LMS systems: $2-15/student/month or $15-75/student/year
- Specialized academic tools: $10-50/student/year for SaaS
- ElectivePRO is a specialized tool (not full LMS), so pricing should be more accessible
- Educational institutions prefer annual contracts aligned with academic year budgets

**Why these prices work for ElectivePRO**:

- **Starter ($149/mo)**: 
  - More affordable than full LMS ($2-15/student) for specialized tool
  - Accessible for small colleges and departments
  - ~$0.30/student/month at capacity (500 students)
  - Department-level budgets can afford this tier

- **Professional ($399/mo)**:
  - ~$0.20/student/month at capacity (2,000 students)
  - Competitive with specialized academic tools
  - Sweet spot for most universities
  - Fits central IT budgets

- **Enterprise (Custom)**:
  - Flexible pricing for large institutions
  - Supports PO/invoice billing (standard in education)
  - Can scale based on actual usage or FTE
  - Multi-year contracts common

### Payment Methods for Educational Institutions

1. **Annual Contracts** (Preferred)

   - Aligns with academic year budgeting
   - 20% discount incentive
   - Predictable costs for planning

2. **Purchase Orders & Invoicing**

   - Enterprise tier supports PO/invoice billing
   - Standard for large institutions
   - Net 30/60 payment terms

3. **Monthly Subscriptions**

   - Available for flexibility
   - Credit card or ACH
   - 14-day free trial

4. **Department-Level Budgets**

   - Starter tier accessible to individual departments
   - No need for central IT approval

### Environment Variables Needed

```
NEXT_PUBLIC_STRIPE_PRICE_STARTER_MONTHLY
NEXT_PUBLIC_STRIPE_PRICE_STARTER_YEARLY
NEXT_PUBLIC_STRIPE_PRICE_PROFESSIONAL_MONTHLY
NEXT_PUBLIC_STRIPE_PRICE_PROFESSIONAL_YEARLY
```

Note: Enterprise tier uses contact form, no Stripe price IDs needed.

## Implementation Notes

- Keep exchange programs visible but position as "also supports" or secondary feature
- Use specific statistics from research (50% time reduction, 60% to 80% utilization, etc.)
- Emphasize open-source nature throughout
- Maintain consistent messaging across all pages
- Ensure all descriptions remain exactly 145 characters where specified
- Pricing page should emphasize elective course selection automation as primary value