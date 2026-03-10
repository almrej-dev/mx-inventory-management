---
phase: 03-sales-and-auto-deduction
plan: 01
subsystem: database
tags: [prisma, postgresql, sales, bom, zod, rls, server-actions]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: "Prisma schema with Item model, InventoryTransaction ledger, integer storage (mg/centavos), RLS authorize() function"
  - phase: 02-recipe-engine
    provides: "RecipeIngredient model, explodeBom() function for recursive BOM resolution"
provides:
  - "SalesUpload and SalesLine Prisma models with Item relation"
  - "RLS policies for sales_uploads and sales_lines (viewer+ read, staff+ write)"
  - "processSalesLines server action with atomic BOM-based inventory deduction"
  - "getSalesUploads and getSalesUploadDetail history query actions"
  - "getFinishedItems action returning sellable products with recipes"
  - "Zod schemas for sales line input and batch processing validation"
  - "Column mapping utility (normalizeRow, suggestMapping) for CSV/Excel parsing"
affects: [03-sales-and-auto-deduction]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Two-phase transaction: BOM explosion outside transaction, all writes inside single prisma.$transaction"
    - "Aggregated deduction map: merge BOM quantities across all sold products before writing ledger entries"
    - "Negative stock allowed: no guard against stock going below 0 -- system records reality"

key-files:
  created:
    - src/actions/sales.ts
    - src/schemas/sales.ts
    - src/lib/sales-parser.ts
    - supabase/migrations/00003_sales_tables.sql
  modified:
    - prisma/schema.prisma

key-decisions:
  - "Two-phase transaction pattern: explodeBom() calls outside transaction to avoid holding it open during recursive DB reads, only writes inside transaction"
  - "Aggregated deduction map across all sold products before any writes -- reduces ledger entries and stock updates to one per unique ingredient"
  - "Direct SQL table creation instead of db:push due to Prisma cross-schema introspection error with user_roles FK to auth.users"
  - "Negative stock allowed by design -- no validation guard prevents stock from going below zero"

patterns-established:
  - "SALE_DEDUCTION ledger entries reference SALE-{uploadId} for traceability"
  - "getFinishedItems filters for FINISHED type with at least one recipe ingredient (sellable products only)"
  - "Column mapping + suggestMapping pattern for flexible CSV import without fixed column names"

requirements-completed: [SALE-03]

# Metrics
duration: 4min
completed: 2026-03-10
---

# Phase 3 Plan 1: Sales Data Layer and BOM Deduction Logic Summary

**Sales recording server actions with atomic BOM-based inventory deduction, aggregated deduction map, and CSV column mapping utility**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-10T01:14:54Z
- **Completed:** 2026-03-10T01:19:07Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- SalesUpload and SalesLine Prisma models added with full field spec, RLS migration following established authorize() pattern
- processSalesLines server action atomically creates upload record, sales lines, SALE_DEDUCTION ledger entries, and stock decrements using two-phase approach (BOM explosion outside, writes inside transaction)
- Aggregated deduction map merges BOM quantities across all sold products, scaling per-unit BOM amounts by units sold
- Column mapping utility (normalizeRow, suggestMapping) provides flexible CSV/Excel parsing with fuzzy header matching for common patterns (product/item/name, qty/quantity/count, etc.)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add SalesUpload and SalesLine Prisma models, RLS migration, and Zod schemas** - `475239c` (feat)
2. **Task 2: Create processSalesLines server action with BOM deduction and history queries** - `52b5fc9` (feat)

## Files Created/Modified
- `prisma/schema.prisma` - Added SalesUpload and SalesLine models, salesLines relation on Item
- `supabase/migrations/00003_sales_tables.sql` - RLS policies for sales_uploads and sales_lines tables (viewer+ read, staff+ write, no delete)
- `src/schemas/sales.ts` - Zod schemas for salesLineInputSchema and processSalesSchema with validation
- `src/lib/sales-parser.ts` - ColumnMapping/NormalizedSalesRow interfaces, normalizeRow and suggestMapping utilities
- `src/actions/sales.ts` - processSalesLines, getSalesUploads, getSalesUploadDetail, getFinishedItems server actions

## Decisions Made
- **Two-phase transaction pattern:** BOM explosion (recursive DB reads) happens outside the transaction to avoid holding it open. Only the atomic writes (upload + lines + ledger + stock updates) go inside prisma.$transaction. This follows the research spec recommendation.
- **Aggregated deduction map:** Instead of creating ledger entries per-sold-item, deductions are aggregated across all sold products first. If two products both use flour, the flour deduction is a single summed entry rather than two separate ones.
- **Direct SQL for table creation:** Prisma 7 db:push fails with P4002 error because user_roles table has a FK to auth.users (cross-schema reference). Tables created directly via SQL instead. Prisma client generation works fine since it only reads the schema file.
- **Negative stock by design:** No validation prevents stockQty from going below 0. The system records actual sales regardless of stock levels, allowing negative stock to flag discrepancies.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Prisma db:push fails with cross-schema reference error**
- **Found during:** Task 1
- **Issue:** Prisma 7 db:push introspection fails with P4002 error because public.user_roles has a FK to auth.users. Adding `schemas = ["public"]` to datasource requires `@@schema` on every model/enum, which is too invasive.
- **Fix:** Created tables directly via SQL using psql and DIRECT_URL, then generated Prisma client separately with `pnpm run db:generate`
- **Files modified:** None (runtime fix, no code change needed)
- **Verification:** Tables created successfully, Prisma client generates, TypeScript compiles
- **Committed in:** 475239c (part of Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Schema tables created via SQL instead of db:push. No functional difference -- tables match Prisma schema exactly. Future db:push calls may face the same issue until Prisma 7 fixes cross-schema introspection.

## Issues Encountered
- Prisma 7 P4002 cross-schema introspection error is a known limitation when user_roles references auth.users. This affects db:push but not client generation. Workaround: create tables via direct SQL.

## User Setup Required
The RLS migration SQL (00003_sales_tables.sql) must be applied via Supabase SQL Editor after tables exist. This is a deployment step documented in the migration file.

## Next Phase Readiness
- Server actions ready for Plan 02 (Sales upload UI with file parsing and column mapping) and Plan 03 (Manual entry form and sales history pages)
- processSalesLines is the core action that Plans 02 and 03 will call after parsing/mapping user input
- getFinishedItems provides the sellable product list for dropdowns
- Column mapping utility (suggestMapping) ready for the file upload preview UI

## Self-Check: PASSED

All 5 files verified present (schema.prisma, 00003_sales_tables.sql, sales.ts schema, sales-parser.ts, sales.ts actions). Both task commits (475239c, 52b5fc9) verified in git log. All required exports confirmed: processSalesLines, getSalesUploads, getSalesUploadDetail, getFinishedItems, salesLineInputSchema, processSalesSchema, normalizeRow, suggestMapping, ColumnMapping, NormalizedSalesRow. TypeScript compiles cleanly.

---
*Phase: 03-sales-and-auto-deduction*
*Completed: 2026-03-10*
