---
phase: 01-foundation
plan: 04
subsystem: verification, database, deployment
tags: [prisma-db-push, dotenv-cli, supabase-setup, e2e-verification, security-definer]

# Dependency graph
requires:
  - phase: 01-foundation/01
    provides: "Prisma schema, Supabase Auth with RBAC, SQL migration, login, dashboard layout, user management"
  - phase: 01-foundation/02
    provides: "Item CRUD with search/filter, unit conversion, SKU legend"
  - phase: 01-foundation/03
    provides: "Stock receiving with atomic ledger, transaction history"
provides:
  - "Verified end-to-end Phase 1 application: auth, RBAC, item CRUD, stock receiving, transaction history"
  - "Convenience scripts: pnpm db:push, db:seed, db:generate, db:studio (dotenv-cli wrapping)"
  - "Fixed SQL migration: SECURITY DEFINER on custom_access_token_hook for RLS bypass"
affects: [02-recipe-engine]

# Tech tracking
tech-stack:
  added: [dotenv-cli]
  patterns: [direct-url-for-migrations, dotenv-cli-env-loading, security-definer-for-auth-hooks]

key-files:
  created: []
  modified:
    - package.json
    - supabase/migrations/00001_rbac_setup.sql
    - prisma/prisma.config.ts

key-decisions:
  - "Prisma 7 CLI requires explicit --config prisma/prisma.config.ts flag -- auto-discovery does not find config inside prisma/ directory"
  - "db:push must use DIRECT_URL (port 5432) not DATABASE_URL (pooler port 6543) -- pooler connection hangs for schema push"
  - "custom_access_token_hook needs SECURITY DEFINER + GRANT SELECT on user_roles to supabase_auth_admin to bypass RLS when injecting role claims into JWT"

patterns-established:
  - "Prisma CLI convenience scripts: dotenv -e .env.local -- sh -c 'pnpm prisma ... --config prisma/prisma.config.ts' for env loading"
  - "Migration commands use DIRECT_URL (direct connection), runtime uses DATABASE_URL (pooler connection)"

requirements-completed: [AUTH-01, AUTH-02, AUTH-03, ITEM-01, ITEM-02, ITEM-03, ITEM-04, ITEM-05, ITEM-06, STCK-01, STCK-05]

# Metrics
duration: 5min
completed: 2026-03-09
---

# Phase 1 Plan 04: End-to-End Verification Summary

**Prisma schema pushed to Supabase, SECURITY DEFINER fix for JWT hook, db convenience scripts, and user-verified full Phase 1 flow (auth/RBAC, item CRUD, stock receiving, transaction history)**

## Performance

- **Duration:** 5 min (automation) + user verification time
- **Started:** 2026-03-09T11:46:26Z
- **Completed:** 2026-03-09
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Prisma schema pushed to Supabase database successfully via direct connection
- Fixed critical RBAC bug: custom_access_token_hook needed SECURITY DEFINER to query user_roles through RLS
- Added dotenv-cli convenience scripts (db:push, db:seed, db:generate, db:studio) for ergonomic Prisma CLI usage
- User verified complete Phase 1 flow: login with RBAC (admin/staff/viewer), item CRUD with unit conversion, stock receiving with atomic ledger, transaction history

## Task Commits

Each task was committed atomically:

1. **Task 1: Run Prisma migration, verify build, and prepare setup instructions** - `b6ba52d` (chore)
2. **Task 2: User verifies complete Phase 1 flow (fix discovered during verification)** - `5b01eea` (fix)

## Files Created/Modified
- `package.json` - Added dotenv-cli dependency and db:push/db:seed/db:generate/db:studio convenience scripts
- `supabase/migrations/00001_rbac_setup.sql` - Added SECURITY DEFINER, SET search_path, and GRANT SELECT to supabase_auth_admin
- `prisma/prisma.config.ts` - Added seed migration config

## Decisions Made
- **Prisma 7 config discovery:** Prisma CLI does not auto-discover `prisma.config.ts` when placed inside `prisma/` directory. All scripts use explicit `--config prisma/prisma.config.ts` flag.
- **Direct URL for migrations:** `pnpm db:push` uses `DIRECT_URL` (port 5432, direct PostgreSQL connection) instead of `DATABASE_URL` (port 6543, Supavisor pooler). The pooler connection hangs indefinitely for schema push operations.
- **SECURITY DEFINER for JWT hook:** The `custom_access_token_hook` function runs as `supabase_auth_admin` but needs to read `user_roles` which has RLS enabled. Adding `SECURITY DEFINER` makes it execute with the function owner's permissions (postgres), bypassing RLS. `SET search_path = 'public'` added as security best practice with DEFINER functions.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Prisma 7 CLI cannot find prisma.config.ts without explicit --config flag**
- **Found during:** Task 1
- **Issue:** `pnpm prisma db push` returned "datasource.url property is required" because the CLI didn't load prisma/prisma.config.ts
- **Fix:** Added `--config prisma/prisma.config.ts` to all Prisma CLI scripts
- **Files modified:** package.json
- **Verification:** `pnpm db:push` completes successfully
- **Committed in:** b6ba52d

**2. [Rule 3 - Blocking] Pooler connection (port 6543) hangs for db push operations**
- **Found during:** Task 1
- **Issue:** DATABASE_URL uses Supavisor pooler (port 6543) which does not support the protocol used by `prisma db push`
- **Fix:** db:push script uses `--url $DIRECT_URL` to override with direct connection (port 5432)
- **Files modified:** package.json
- **Verification:** `pnpm db:push` completes in ~6 seconds
- **Committed in:** b6ba52d

**3. [Rule 1 - Bug] custom_access_token_hook fails to read user_roles due to RLS**
- **Found during:** Task 2 (user verification)
- **Issue:** JWT hook runs as supabase_auth_admin which is blocked by RLS on user_roles table, resulting in no role being injected into JWT claims
- **Fix:** Added SECURITY DEFINER to function definition, SET search_path = 'public', and GRANT SELECT on user_roles to supabase_auth_admin
- **Files modified:** supabase/migrations/00001_rbac_setup.sql
- **Verification:** User confirmed login works with correct role claims in JWT
- **Committed in:** 5b01eea

---

**Total deviations:** 3 auto-fixed (2 blocking from Prisma 7 CLI behavior, 1 bug in SQL migration)
**Impact on plan:** All fixes essential for database operations and authentication to work. No scope creep.

## Issues Encountered
- dotenv-cli was already listed as a dependency in a prior commit but was not actually installed -- pnpm add resolved it.
- The `env()` function from `prisma/config` reads from `process.env` but the Prisma CLI does not load `.env.local` files (only `.env`). The dotenv-cli wrapper bridges this gap.

## User Setup Required

**External services require manual configuration before the app works:**

1. **Supabase project** with credentials in `.env.local` (see `.env.local.example`)
2. **SQL migration** run in Supabase SQL Editor (`supabase/migrations/00001_rbac_setup.sql`)
3. **Custom access token hook** enabled in Supabase Dashboard -> Authentication -> Hooks
4. **Database seed** via `pnpm db:seed` to create initial admin user

## Next Phase Readiness
- Phase 1 is fully verified and complete
- All authentication, item management, and stock receiving features working end-to-end
- Database schema stable and pushed to Supabase
- Ready for Phase 2: Recipe Engine (multi-level recipes linking finished products to ingredients)
- Atomic ledger pattern established for all future stock mutations

## Self-Check: PASSED

All 3 modified files verified present. Both task commits (b6ba52d, 5b01eea) verified in git log. SUMMARY.md created.

---
*Phase: 01-foundation*
*Completed: 2026-03-09*
