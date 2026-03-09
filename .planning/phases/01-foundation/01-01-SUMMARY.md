---
phase: 01-foundation
plan: 01
subsystem: auth, database, ui
tags: [next.js, supabase, prisma, rbac, jwt, shadcn-ui, tailwind-v4, zod-v4, base-ui]

# Dependency graph
requires: []
provides:
  - "Next.js 16 application scaffold with Tailwind CSS v4 and shadcn/ui (Base UI)"
  - "Complete Prisma schema: Item (integer mg/centavos), InventoryTransaction (append-only ledger), Profile"
  - "Supabase Auth integration with SSR cookie-based sessions"
  - "RBAC system: custom JWT claims hook, authorize() SQL function, RLS policies"
  - "Login page with email/password authentication"
  - "Dashboard layout with sidebar navigation and user header menu"
  - "Admin user management (create/list/delete users with role assignment)"
  - "requireRole() server action authorization helper"
  - "Prisma 7 with PrismaPg driver adapter (WASM-based client)"
affects: [01-02, 01-03, 01-04, 02-recipe-engine, 03-sales]

# Tech tracking
tech-stack:
  added: [next.js 16.1, react 19.2, typescript 5.9, supabase-js 2.98, supabase-ssr 0.9, prisma 7.4, prisma-adapter-pg 7.4, pg 8.20, react-hook-form 7.71, hookform-resolvers 5.2, zod 4.3, tanstack-react-table 8.21, date-fns 4.1, jwt-decode 4.0, shadcn-ui 4.0, tailwind-css 4.1, base-ui-react 1.2, lucide-react 0.577]
  patterns: [supabase-ssr-middleware, prisma-pg-adapter-singleton, lazy-proxy-prisma-client, integer-storage-mg-centavos, append-only-ledger, jwt-custom-claims-rbac, requireRole-server-action-guard]

key-files:
  created:
    - prisma/schema.prisma
    - prisma/prisma.config.ts
    - prisma/seed.ts
    - src/middleware.ts
    - src/lib/auth.ts
    - src/lib/prisma.ts
    - src/lib/supabase/client.ts
    - src/lib/supabase/server.ts
    - src/lib/supabase/middleware.ts
    - src/lib/utils.ts
    - src/lib/constants.ts
    - src/types/index.ts
    - src/schemas/user.ts
    - src/actions/users.ts
    - src/app/(auth)/login/page.tsx
    - src/app/(auth)/layout.tsx
    - src/app/(dashboard)/layout.tsx
    - src/app/(dashboard)/page.tsx
    - src/app/(dashboard)/users/page.tsx
    - src/app/(dashboard)/users/users-client.tsx
    - src/components/layout/sidebar.tsx
    - src/components/layout/header.tsx
    - src/components/layout/role-gate.tsx
    - src/components/users/user-form.tsx
    - supabase/migrations/00001_rbac_setup.sql
    - .env.local.example
  modified:
    - package.json
    - tsconfig.json
    - next.config.ts

key-decisions:
  - "Prisma 7 requires driver adapter (PrismaPg) instead of direct datasource URL in schema -- WASM-based client engine"
  - "Used lazy proxy pattern for PrismaClient to avoid build-time initialization errors when DATABASE_URL is not set"
  - "shadcn/ui v4 uses Base UI (not Radix) -- render prop instead of asChild for component composition"
  - "Used standardSchemaResolver instead of zodResolver for zod v4 compatibility with react-hook-form"
  - "Used native HTML select element for role picker instead of Base UI Select for simpler react-hook-form integration"
  - "Integer storage for all weights (milligrams) and costs (centavos) to prevent float accumulation errors"

patterns-established:
  - "Supabase SSR auth: updateSession middleware helper refreshes tokens, getUser() validates JWT"
  - "requireRole(minimumRole) guard: every server action must call this before mutations"
  - "Lazy Prisma proxy: getPrisma() creates client on first access, cached in globalThis for hot reload"
  - "Integer storage: unitWeightMg, costCentavos -- convert to grams/pesos only at display layer"
  - "Append-only ledger: InventoryTransaction records all stock mutations, items.stockQty is denormalized cache"
  - "Route groups: (auth) for login pages (no sidebar), (dashboard) for authenticated pages (with sidebar)"

requirements-completed: [AUTH-01, AUTH-02, AUTH-03]

# Metrics
duration: 18min
completed: 2026-03-09
---

# Phase 1 Plan 01: Foundation Scaffold Summary

**Next.js 16 app with Supabase Auth RBAC (custom JWT claims), Prisma 7 schema (integer mg/centavos), login, dashboard, and admin user management**

## Performance

- **Duration:** 18 min
- **Started:** 2026-03-09T11:12:45Z
- **Completed:** 2026-03-09T11:30:46Z
- **Tasks:** 2
- **Files modified:** 59

## Accomplishments
- Complete Next.js 16 application scaffold with shadcn/ui v4 (Base UI), Tailwind CSS v4, TypeScript 5.9
- Prisma 7 schema with Item (integer milligrams/centavos), InventoryTransaction (append-only ledger), Profile models
- Supabase Auth with SSR cookie-based sessions, JWT custom claims RBAC, and comprehensive RLS policies
- Login page, dashboard layout with sidebar, admin user management (create/list/delete with role assignment)
- RBAC SQL migration file with custom_access_token_hook, authorize(), and RLS policies for all tables

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold Next.js project, install dependencies, define Prisma schema and Supabase clients** - `f76fab4` (feat)
2. **Task 2: Wire Supabase Auth with RBAC, build login page, middleware, user management, and dashboard shell** - `0aacd45` (feat)

## Files Created/Modified
- `prisma/schema.prisma` - Complete data model: Item, InventoryTransaction, Profile with integer storage
- `prisma/prisma.config.ts` - Prisma 7 configuration with datasource URL from env
- `prisma/seed.ts` - Bootstrap initial admin user via Supabase Admin API
- `src/middleware.ts` - Auth redirect, session refresh, admin route protection
- `src/lib/auth.ts` - requireRole() helper with JWT custom claims role checking
- `src/lib/prisma.ts` - Lazy PrismaClient singleton with PrismaPg driver adapter
- `src/lib/supabase/client.ts` - Browser Supabase client factory
- `src/lib/supabase/server.ts` - Server Supabase client with cookie handling
- `src/lib/supabase/middleware.ts` - Session refresh middleware helper
- `src/lib/utils.ts` - cn() helper + mg/grams, centavos/pesos conversion utilities
- `src/lib/constants.ts` - ITEM_TYPES, APP_ROLES, SKU format guide
- `src/types/index.ts` - AppRole, ItemTypeValue, TransactionTypeValue types
- `src/schemas/user.ts` - Zod v4 schema for user creation form
- `src/actions/users.ts` - createUser, listUsers, deleteUser server actions with requireRole guard
- `src/app/(auth)/login/page.tsx` - Email/password login form with Supabase signInWithPassword
- `src/app/(dashboard)/layout.tsx` - Dashboard layout with sidebar + header, reads user session
- `src/app/(dashboard)/page.tsx` - Dashboard home with placeholder cards for future widgets
- `src/app/(dashboard)/users/page.tsx` - Admin user management page (server component)
- `src/app/(dashboard)/users/users-client.tsx` - User list table with create dialog and delete
- `src/components/layout/sidebar.tsx` - Navigation sidebar with role-gated links
- `src/components/layout/header.tsx` - Header with user menu and sign out
- `src/components/layout/role-gate.tsx` - Conditional render component based on user role
- `src/components/users/user-form.tsx` - User creation form with react-hook-form + zod validation
- `supabase/migrations/00001_rbac_setup.sql` - RBAC SQL: app_role enum, user_roles, JWT hook, authorize(), RLS
- `.env.local.example` - All required environment variable placeholders

## Decisions Made
- **Prisma 7 driver adapter:** Prisma 7 no longer supports datasource URL in schema.prisma. Uses PrismaPg adapter with pg Pool for direct PostgreSQL connections.
- **Lazy Prisma client:** Used Proxy-based lazy initialization to avoid build-time failures when DATABASE_URL is not available.
- **shadcn/ui v4 Base UI:** The scaffold uses Base UI (not Radix). Components use `render` prop instead of `asChild` for element composition.
- **Standard Schema resolver:** Used `standardSchemaResolver` from `@hookform/resolvers/standard-schema` for zod v4 compatibility (zodResolver doesn't type-check with zod v4's `zod/v4` import).
- **Native select for role picker:** Used plain HTML select element for role field to avoid Base UI Select + react-hook-form integration complexity.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Prisma 7 schema.prisma no longer supports url/directUrl in datasource block**
- **Found during:** Task 1
- **Issue:** Prisma 7 moved datasource URL config to prisma.config.ts, removed url/directUrl from schema.prisma
- **Fix:** Created prisma/prisma.config.ts with defineConfig({ datasource: { url: env("DATABASE_URL") } })
- **Files modified:** prisma/schema.prisma, prisma/prisma.config.ts
- **Verification:** npx prisma generate succeeds
- **Committed in:** f76fab4

**2. [Rule 3 - Blocking] Prisma 7 PrismaClient requires driver adapter (WASM engine)**
- **Found during:** Task 2
- **Issue:** PrismaClient constructor no longer accepts datasourceUrl; requires adapter or accelerateUrl
- **Fix:** Installed @prisma/adapter-pg and pg, created lazy proxy Prisma singleton with PrismaPg adapter
- **Files modified:** src/lib/prisma.ts, package.json, prisma/seed.ts
- **Verification:** pnpm build succeeds
- **Committed in:** 0aacd45

**3. [Rule 3 - Blocking] shadcn/ui v4 uses Base UI instead of Radix -- no asChild prop**
- **Found during:** Task 2
- **Issue:** DialogTrigger and DropdownMenuTrigger don't support asChild; use render prop instead
- **Fix:** Changed DialogTrigger/DropdownMenuTrigger to use render={<Button />} pattern
- **Files modified:** src/app/(dashboard)/users/users-client.tsx, src/components/layout/header.tsx
- **Verification:** pnpm build succeeds
- **Committed in:** 0aacd45

**4. [Rule 3 - Blocking] @hookform/resolvers/zod incompatible with zod v4 types**
- **Found during:** Task 2
- **Issue:** zodResolver from @hookform/resolvers/zod doesn't accept zod v4 schema types
- **Fix:** Switched to standardSchemaResolver from @hookform/resolvers/standard-schema (zod v4 implements standard-schema)
- **Files modified:** src/components/users/user-form.tsx
- **Verification:** pnpm build succeeds
- **Committed in:** 0aacd45

---

**Total deviations:** 4 auto-fixed (4 blocking issues from library version changes)
**Impact on plan:** All fixes required for Prisma 7 and shadcn/ui v4 compatibility. No scope creep. The research was based on slightly older library versions; the stack has evolved.

## Issues Encountered
- Next.js 16 warns that middleware.ts is deprecated in favor of proxy.ts. The middleware still works but may need migration in a future phase. This is informational only and does not block functionality.

## User Setup Required

**External services require manual configuration:**

1. **Create a Supabase project** at https://supabase.com/dashboard
2. **Copy environment variables** from the Supabase dashboard to a `.env.local` file (see `.env.local.example` for the template)
3. **Run the RBAC SQL migration** in the Supabase SQL Editor: copy and paste the contents of `supabase/migrations/00001_rbac_setup.sql`
4. **Enable the custom access token hook** in Supabase Dashboard: Authentication -> Hooks -> Customize Access Token (JWT) Claims -> Enable Hook -> select `custom_access_token_hook` function
5. **Run Prisma migrations**: `npx prisma migrate dev`
6. **Seed the admin user**: `npx prisma db seed`

## Next Phase Readiness
- Application scaffold complete with auth, RBAC, and database schema
- Ready for 01-02 plan: Item CRUD with all four types, search/filter, SKU legend
- All Supabase client helpers in place for future server actions
- Prisma schema includes Item model ready for CRUD operations
- Layout with sidebar navigation has placeholder links for /items and /stock/receiving

## Self-Check: PASSED

All 25 key files verified present. Both task commits (f76fab4, 0aacd45) verified in git log. SUMMARY.md created.

---
*Phase: 01-foundation*
*Completed: 2026-03-09*
