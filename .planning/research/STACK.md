# Technology Stack

**Project:** Ice Cream & Tea Inventory Management System
**Researched:** 2026-03-09
**Overall Confidence:** HIGH

## Decision Context

The owner has no coding background. The stack must be:
1. Simple enough to navigate after handoff (readable code, clear file structure)
2. Low-maintenance (minimal dependencies, managed services, no DevOps)
3. Cost-effective for a single-store operation (free or under $30/month total)
4. Well-documented with large communities (easy to find help via AI or Google)

---

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **Next.js** | 16.1 | Full-stack React framework (UI + API routes) | Single codebase for frontend and backend. Largest React ecosystem, most tutorials, most AI-assistant support. File-based routing means the owner can find pages by folder name. Server Components reduce client-side complexity. | HIGH |
| **React** | 19.2 | UI library (bundled with Next.js 16) | Industry standard. Every tutorial, component library, and AI coding tool supports React first. | HIGH |
| **TypeScript** | 5.x | Type safety | Catches errors before they ship. Next.js 16 has first-class TypeScript support with zero config. Prevents the class of bugs a non-coder would struggle to debug. | HIGH |

**Rationale:** Next.js is the dominant full-stack React framework in 2026. It ships with Turbopack (fast builds), file-based routing (intuitive file structure), API Routes (no separate backend server), and React Server Components. The alternative ecosystem players -- Remix, Nuxt, SvelteKit -- all have smaller communities, fewer tutorials, and less AI-assistant coverage. For someone with no coding background who will rely on AI tools and community help, Next.js has the widest safety net.

### Database & Backend Services

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **Supabase** | Current (managed SaaS) | Database (PostgreSQL), Authentication, Storage, Row-Level Security | All-in-one backend-as-a-service. PostgreSQL is relational -- perfect for inventory with recipes, BOMs, and multi-level relationships. Built-in Auth eliminates a separate auth library. Dashboard UI lets the owner inspect data without SQL knowledge. RLS handles role-based access at the database level. | HIGH |
| **Prisma ORM** | 7.4.x | Database access layer | Type-safe database queries with auto-generated TypeScript types from the schema. Schema file is human-readable (`model Item { name String }`). Prisma Studio provides a visual database editor. Beginner-friendly compared to raw SQL or Drizzle. | HIGH |

**Rationale:** Supabase over Firebase because this app has relational data (items -> recipes -> sub-recipes -> raw materials). Firebase's document model would require denormalization and manual consistency -- a maintenance nightmare for a non-coder. Supabase gives PostgreSQL (proper relations, JOINs, foreign keys) with a managed dashboard.

Prisma over Drizzle because Prisma has a more intuitive schema language, better documentation, Prisma Studio for visual data inspection, and a larger beginner community. Drizzle is gaining popularity among experienced developers but has a steeper learning curve.

**Supabase handles three things that would otherwise need separate services:**
- **Auth** -- Built-in email/password + social login. Simpler than NextAuth/Auth.js (which merged with Better Auth in 2025 and is in transition). Supabase Auth is officially maintained, has MFA, and requires no adapter configuration.
- **Storage** -- For CSV/Excel file uploads (POS sales data). No need for a separate S3 bucket.
- **Row-Level Security** -- Role-based access (Admin/Staff/Viewer) enforced at the database level using `auth.uid()` and custom claims. No middleware auth logic needed.

### Hosting & Deployment

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **Vercel** | Pro ($20/mo) | Next.js hosting | Built by the Next.js team. Zero-config deployment via GitHub push. Automatic preview deployments for testing. Best DX for Next.js (edge functions, ISR, image optimization all work out of the box). | MEDIUM |

**Important cost note:** Vercel's free Hobby tier prohibits commercial use per their ToS. For a business application, the Pro plan at $20/month is required. This is the simplest deployment path for Next.js.

**Alternative (budget-conscious):** If $20/month for hosting is too much on top of Supabase Pro ($25/month), consider **Railway** ($5/month Hobby plan with $5 usage credit) for the Next.js app while keeping Supabase for the database. Railway supports Next.js deployment and allows commercial use on Hobby. Total infrastructure cost would be approximately $30/month (Railway $5 + Supabase Pro $25) instead of $45/month (Vercel $20 + Supabase $25).

**Supabase tier recommendation:** Start on the Free tier during development. Upgrade to Pro ($25/month) before going to production -- the free tier pauses projects after 7 days of inactivity (unacceptable for a business tool) and has no backups.

| Service | Development | Production | Notes |
|---------|-------------|------------|-------|
| Supabase | Free ($0) | Pro ($25/mo) | 8 GB database, 100K MAUs, daily backups |
| Vercel | Free/Hobby ($0) | Pro ($20/mo) | OK for dev on Hobby; must upgrade for commercial |
| **Total** | **$0** | **$45/mo** | Or ~$30/mo with Railway instead of Vercel |

### UI Components & Styling

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **shadcn/ui** | CLI v4 (March 2026) | Pre-built UI components | Not a dependency -- components are copied into your project as source code. Full control, no version lock-in. Built on Radix UI (accessible) + Tailwind CSS. Beautiful defaults that look professional without design effort. CLI scaffolds Next.js projects with dark mode included. | HIGH |
| **Tailwind CSS** | 4.2.x | Utility-first CSS | No separate CSS files to manage. Styles live inline with components. v4 is 5x faster than v3 and configured via CSS (no JS config file). shadcn/ui requires it. | HIGH |

**Rationale:** shadcn/ui over Ant Design or Material UI because:
- **Ant Design** has a larger component library but imposes its own design system, requires understanding its theming API, and is heavier (larger bundle).
- **Material UI** has a steep learning curve with its `sx` prop, styled-components approach, and Material Design opinions.
- **shadcn/ui** gives you the source code directly. When something needs changing, the owner (or an AI assistant) edits a file in `components/ui/` rather than fighting an opaque library API. This ownership model is crucial for long-term maintainability by a non-coder relying on AI help.

Note: shadcn/ui is not beginner-friendly to build from scratch, but with the CLI scaffolding (`shadcn init`) it generates a full project template. For this project, the initial setup is done once by the developer, and the owner benefits from clean, readable component code afterward.

### Supporting Libraries

| Library | Version | Purpose | When to Use | Confidence |
|---------|---------|---------|-------------|------------|
| **React Hook Form** | 7.x | Form management | Every data entry form (items, recipes, stock receiving, waste recording). Lightweight, performant, minimal re-renders. | HIGH |
| **Zod** | 4.x | Schema validation | Validate all form inputs and API payloads. Integrates with React Hook Form via `@hookform/resolvers`. Validates on both client and server with the same schema. | HIGH |
| **Recharts** | 2.x | Dashboard charts | Sales reports, bestseller charts, stock level visualizations. Built for React, declarative API, simpler than D3. | HIGH |
| **TanStack Table** | 8.x | Data tables | Inventory lists, recipe tables, sales history. Sorting, filtering, pagination built-in. Headless (works with shadcn/ui styling). | MEDIUM |
| **SheetJS (xlsx)** | 0.20.x | Excel/CSV parsing | Parsing POS export files (CSV and Excel). Handles both `.csv` and `.xlsx` formats. | MEDIUM |
| **PapaParse** | 5.x | CSV parsing (alternative) | Lighter-weight CSV-only parsing if Excel support is not needed. Consider using alongside xlsx for robust handling. | MEDIUM |
| **date-fns** | 3.x | Date manipulation | Stock receiving dates, expiry tracking, report date ranges. Tree-shakeable (small bundle). | HIGH |
| **nuqs** | 2.x | URL state management | Persisting filter/sort state in the URL for inventory tables. Lightweight Next.js-specific library. | LOW |

### Dev Tooling

| Tool | Purpose | Why | Confidence |
|------|---------|-----|------------|
| **ESLint** | Code linting | Bundled with Next.js. Catches errors early. | HIGH |
| **Prettier** | Code formatting | Consistent code style. One less thing to think about. | HIGH |
| **Prisma Studio** | Visual database editor | Lets the owner inspect and edit data without SQL. Launches with `npx prisma studio`. | HIGH |

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Framework | Next.js 16 | **Remix** | Smaller community, fewer tutorials, less AI-assistant coverage. Merged with React Router v7 in late 2024 which caused ecosystem confusion. |
| Framework | Next.js 16 | **Nuxt (Vue)** | Vue ecosystem is smaller than React. Fewer component libraries, fewer hiring options if the owner needs help later. |
| Framework | Next.js 16 | **SvelteKit** | Smallest ecosystem of the three. Svelte 5 (runes) introduced breaking changes that fragmented tutorials. |
| Framework | Next.js 16 | **Laravel/Django** | Different language (PHP/Python). Would require learning two languages (JS for frontend + PHP/Python for backend). Next.js keeps everything in one language. |
| Database | Supabase (PostgreSQL) | **Firebase (Firestore)** | Document database is wrong for relational inventory data (recipes referencing sub-recipes referencing raw materials). JOINs and foreign keys are essential. |
| Database | Supabase (PostgreSQL) | **PlanetScale (MySQL)** | Removed free tier in 2024. MySQL is fine technically but PostgreSQL has better JSON support, better extension ecosystem, and Supabase bundles auth + storage. |
| Database | Supabase (PostgreSQL) | **MongoDB** | Document DB, same problems as Firebase. Inventory management is inherently relational. |
| ORM | Prisma 7 | **Drizzle ORM** | More "SQL-like" which is powerful for experienced devs but harder for beginners. Less documentation, smaller community. Schema is defined in TypeScript (less readable than Prisma's schema language). |
| Auth | Supabase Auth (built-in) | **Auth.js / NextAuth** | Auth.js team joined Better Auth in Sept 2025. The library is in maintenance mode (security patches only). Supabase Auth is actively maintained, officially supported, and requires no adapter wiring. |
| Auth | Supabase Auth (built-in) | **Clerk** | Excellent DX but adds another paid service ($25+/month). Supabase Auth is included in the Supabase subscription at no extra cost. |
| UI | shadcn/ui | **Ant Design** | Heavier bundle, opinionated design system, harder to customize. Components are black-box dependencies. |
| UI | shadcn/ui | **Material UI (MUI)** | Steep learning curve (`sx` prop, theme system). Heavily opinionated Material Design look. |
| Charts | Recharts | **Chart.js (react-chartjs-2)** | Chart.js is slightly more performant with large datasets but this app has small datasets. Recharts has more React-native API (composable components vs. config objects). |
| Forms | React Hook Form | **Formik** | Formik is no longer actively maintained (no commits for over a year). React Hook Form is lighter, faster, and actively developed. |
| Hosting | Vercel | **Netlify** | Good alternative but Next.js features (ISR, middleware, edge functions) work best on Vercel. Netlify's Next.js support lags behind. |
| Hosting | Vercel | **Railway** | Valid budget alternative (see hosting section). Less polished DX for Next.js specifically but significantly cheaper. |

---

## What NOT to Use

| Technology | Why Not |
|------------|---------|
| **Redux / Zustand** | Overkill for this app. React Server Components + Supabase client-side cache + React Hook Form handle all state needs. Adding a state management library adds complexity with no benefit for a single-store inventory app. |
| **tRPC** | Adds type-safe API layer but is unnecessary when Prisma already provides type-safe database access and Next.js API routes are straightforward. Extra abstraction layer to understand and maintain. |
| **Docker / Kubernetes** | The entire point is managed services. Supabase and Vercel handle infrastructure. Docker adds operational complexity a non-coder cannot maintain. |
| **GraphQL** | REST-style API routes in Next.js are simpler to understand and debug. GraphQL adds schema complexity, resolver boilerplate, and tooling overhead for no benefit at this scale. |
| **Tailwind UI (paid)** | shadcn/ui provides free, high-quality components. No need to pay for Tailwind UI templates. |
| **Supabase Edge Functions** | Next.js API routes handle server-side logic. Using Supabase Edge Functions would split logic across two runtimes, making debugging harder. Keep all server logic in Next.js. |
| **Barcode scanning libraries** | Explicitly out of scope per PROJECT.md. Do not add zxing or quagga. |

---

## Installation

```bash
# Create Next.js project with shadcn/ui scaffold
npx shadcn@latest init

# Core dependencies
npm install @supabase/supabase-js @supabase/ssr
npm install @prisma/client
npm install react-hook-form @hookform/resolvers zod
npm install recharts
npm install @tanstack/react-table
npm install xlsx
npm install date-fns

# Dev dependencies
npm install -D prisma
npm install -D @types/node @types/react
```

---

## Architecture Summary

```
Browser (Next.js App Router)
  |
  +-- React Server Components (data fetching)
  |     |
  |     +-- Prisma ORM (type-safe queries)
  |           |
  |           +-- Supabase PostgreSQL (data storage)
  |
  +-- Client Components (interactivity)
  |     |
  |     +-- React Hook Form + Zod (forms)
  |     +-- Recharts (charts)
  |     +-- TanStack Table (data tables)
  |     +-- shadcn/ui (UI components)
  |
  +-- Next.js API Routes (file uploads, complex operations)
  |     |
  |     +-- xlsx / PapaParse (CSV/Excel parsing)
  |     +-- Prisma ORM (database writes)
  |
  +-- Supabase Auth (authentication, RLS)
  +-- Supabase Storage (file uploads)
```

**Key simplicity decisions:**
- One language (TypeScript) for everything
- One framework (Next.js) for frontend + backend
- One managed service (Supabase) for database + auth + storage
- One hosting platform (Vercel) for deployment
- No separate backend server, no Docker, no DevOps

---

## Monthly Cost Projection

| Phase | Supabase | Hosting | Total |
|-------|----------|---------|-------|
| Development | Free | Free (Vercel Hobby) | $0/mo |
| Production (budget) | Pro $25 | Railway $5 | $30/mo |
| Production (recommended) | Pro $25 | Vercel Pro $20 | $45/mo |

These costs are well within small business operational expenses and significantly cheaper than any SaaS inventory management subscription (Marketman starts at $239/month).

---

## Sources

- Next.js 16.1 release: https://nextjs.org/blog/next-16-1 (HIGH confidence - official source)
- Next.js 16 release: https://nextjs.org/blog/next-16 (HIGH confidence - official source)
- Supabase Pricing: https://supabase.com/pricing (HIGH confidence - official source)
- Supabase Auth Docs: https://supabase.com/docs/guides/auth (HIGH confidence - official source)
- Supabase RLS Docs: https://supabase.com/docs/guides/database/postgres/row-level-security (HIGH confidence - official source)
- Supabase RBAC Docs: https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac (HIGH confidence - official source)
- Prisma 7 Release: https://www.prisma.io/blog/announcing-prisma-orm-7-0-0 (HIGH confidence - official source)
- Prisma 7.4.0 Release: https://www.gitclear.com/open_repos/prisma/prisma/release/7.4.0 (MEDIUM confidence - third-party tracker)
- Tailwind CSS v4.0: https://tailwindcss.com/blog/tailwindcss-v4 (HIGH confidence - official source)
- shadcn/ui CLI v4: https://ui.shadcn.com/docs/changelog/2026-03-cli-v4 (HIGH confidence - official source)
- shadcn/ui Next.js Installation: https://ui.shadcn.com/docs/installation/next (HIGH confidence - official source)
- Zod 4 Release: https://zod.dev/v4 (HIGH confidence - official source)
- Vercel Pricing: https://vercel.com/pricing (HIGH confidence - official source)
- Vercel Hobby Plan commercial restriction: https://flexprice.io/blog/vercel-pricing-breakdown (MEDIUM confidence - third-party analysis)
- Railway Pricing: https://docs.railway.com/pricing/plans (HIGH confidence - official source)
- React Hook Form: https://react-hook-form.com/ (HIGH confidence - official source)
- TanStack Table: https://tanstack.com/table/latest (HIGH confidence - official source)
- Auth.js/Better Auth merger: https://dev.to/pipipi-dev/nextauthjs-to-better-auth-why-i-switched-auth-libraries-31h3 (LOW confidence - community source, verify)
- Framework comparison 2026: https://www.nucamp.co/blog/top-10-full-stack-frameworks-in-2026-next.js-remix-nuxt-sveltekit-and-more (MEDIUM confidence - educational source)
- Supabase 2026 Review: https://hackceleration.com/supabase-review/ (MEDIUM confidence - third-party review)
- Chart library comparison: https://blog.logrocket.com/best-react-chart-libraries-2025/ (MEDIUM confidence - respected tech blog)
