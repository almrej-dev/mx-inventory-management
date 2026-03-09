# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-09)

**Core value:** Know exactly how much stock is left and when to reorder -- by automatically calculating raw material consumption from sales through multi-level recipes.
**Current focus:** Phase 1: Foundation

## Current Position

Phase: 1 of 5 (Foundation)
Plan: 3 of 4 in current phase
Status: Executing
Last activity: 2026-03-09 -- Completed 01-03 plan

Progress: [####░░░░░░] 27%

## Performance Metrics

**Velocity:**
- Total plans completed: 3
- Average duration: 9min
- Total execution time: 0.5 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 - Foundation | 3 | 28min | 9min |

**Recent Trend:**
- Last 5 plans: 18min, 5min, 5min
- Trend: accelerating

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

### Pending Todos

None yet.

### Blockers/Concerns

- [Research]: POS export format unknown -- obtain sample CSV/Excel file from actual POS before Phase 3 planning
- [Research]: Supabase RLS policies for 3 roles across all modules need detailed design during Phase 1 planning (RESOLVED: RLS policies created in 00001_rbac_setup.sql)
- [Research]: Vercel vs Railway hosting decision pending (budget trade-off: $20/month vs $5/month)

## Session Continuity

Last session: 2026-03-09
Stopped at: Completed 01-02-PLAN.md (item CRUD, search/filter, SKU legend)
Resume file: .planning/phases/01-foundation/01-02-SUMMARY.md
