# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-09)

**Core value:** Know exactly how much stock is left and when to reorder -- by automatically calculating raw material consumption from sales through multi-level recipes.
**Current focus:** Phase 3: Sales & Auto-Deduction

## Current Position

Phase: 3 of 5 (Sales & Auto-Deduction)
Plan: 1 of 3 in current phase
Status: Executing
Last activity: 2026-03-10 -- Completed 03-01 plan (Sales data layer and BOM deduction logic)

Progress: [#######░░░] 64%

## Performance Metrics

**Velocity:**
- Total plans completed: 7
- Average duration: 7min
- Total execution time: 0.7 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 - Foundation | 4 | 33min | 8min |
| 2 - Recipe Engine | 2 | 6min | 3min |
| 3 - Sales & Deduction | 1 | 4min | 4min |

**Recent Trend:**
- Last 5 plans: 5min, 5min, 2min, 4min, 4min
- Trend: stable

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: 5 phases following dependency chain -- items before recipes, recipes before deductions, deductions before dashboards
- [Roadmap]: STCK-01 (receiving) in Phase 1 with items; STCK-02 (alerts) in Phase 4 with dashboard; STCK-03/04 (waste/reconciliation) in Phase 5
- [01-01]: Prisma 7 requires driver adapter (PrismaPg) -- WASM-based client engine replaces binary engine
- [01-01]: shadcn/ui v4 uses Base UI (not Radix) -- render prop instead of asChild
- [01-01]: zod v4 requires standardSchemaResolver for react-hook-form (zodResolver incompatible)
- [01-01]: Integer storage for weights (milligrams) and costs (centavos) throughout schema
- [01-02]: Form schema uses user-friendly units (grams, pesos) -- server actions convert to storage units (mg, centavos)
- [01-02]: Client-side TanStack Table filtering (globalFilterFn + columnFilters) for item list -- simpler than server-side refetch for small datasets
- [01-02]: Edit page splits into server component (data load) + client component (form interactivity) via edit-client.tsx
- [01-03]: receivedDate kept as z.string() in schema (not pipe to date) to avoid standardSchemaResolver type mismatch
- [01-03]: Atomic ledger pattern: prisma.$transaction wraps ledger insert + stock_qty increment -- all future stock mutations must follow this
- [01-03]: Sidebar restructured with section headers (NavItem | NavSection union type) for grouped navigation
- [01-04]: Prisma 7 CLI requires explicit --config prisma/prisma.config.ts -- auto-discovery fails for config inside prisma/ directory
- [01-04]: db:push must use DIRECT_URL (port 5432) not pooler DATABASE_URL (port 6543) -- pooler hangs for schema operations
- [01-04]: custom_access_token_hook needs SECURITY DEFINER + GRANT SELECT on user_roles to supabase_auth_admin to bypass RLS
- [02-01]: Application-level recursion over PostgreSQL CTE for BOM explosion -- simpler, type-safe, sufficient for 2-3 level trees
- [02-01]: Dual quantity fields (quantityMg + quantityPieces) rather than single polymorphic field
- [02-01]: On-demand cost calculation (never stored) -- ensures costs stay current when ingredient prices change
- [02-02]: In-memory single-level cost for recipe list to avoid N+1 explodeBom calls; full multi-level cost on detail page only
- [02-02]: Type-aware ingredient quantity fields: useWatch on childItemId switches between grams (weight) and pieces (packaging) inputs
- [02-02]: useTransition for recipe form submit pending state -- better matches server action pattern than useForm isSubmitting
- [03-01]: Two-phase transaction: BOM explosion outside transaction, all writes inside single prisma.$transaction
- [03-01]: Aggregated deduction map: merge BOM quantities across all sold products before writing ledger entries
- [03-01]: Prisma 7 db:push P4002 error with cross-schema references -- create tables via direct SQL instead
- [03-01]: Negative stock allowed by design -- no guard prevents stockQty from going below 0

### Pending Todos

None yet.

### Blockers/Concerns

- [Research]: POS export format unknown -- obtain sample CSV/Excel file from actual POS before Phase 3 planning
- [Research]: Supabase RLS policies for 3 roles across all modules need detailed design during Phase 1 planning (RESOLVED: RLS policies created in 00001_rbac_setup.sql)
- [Research]: Vercel vs Railway hosting decision pending (budget trade-off: $20/month vs $5/month)

## Session Continuity

Last session: 2026-03-10
Stopped at: Completed 03-01-PLAN.md (Sales data layer and BOM deduction logic)
Resume file: .planning/phases/03-sales-and-auto-deduction/03-01-SUMMARY.md
Next: Continue Phase 3 with 03-02 (Sales upload UI) and 03-03 (Manual entry and history).
