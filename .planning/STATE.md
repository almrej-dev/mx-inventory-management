# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-09)

**Core value:** Know exactly how much stock is left and when to reorder -- by automatically calculating raw material consumption from sales through multi-level recipes.
**Current focus:** Phase 5: Accuracy and Polish

## Current Position

Phase: 5 of 5 (Accuracy and Polish)
Plan: 1 of 2 in current phase
Status: In Progress
Last activity: 2026-03-10 -- Completed 05-01 plan (Waste recording)

Progress: [##########] 100%

## Performance Metrics

**Velocity:**
- Total plans completed: 11
- Average duration: 5min
- Total execution time: 0.92 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 - Foundation | 4 | 33min | 8min |
| 2 - Recipe Engine | 2 | 6min | 3min |
| 3 - Sales & Deduction | 3 | 12min | 4min |
| 4 - Dashboard & Alerts | 2 | 7min | 3.5min |

**Recent Trend:**
- Last 5 plans: 4min, 4min, 4min, 3min, 4min
- Trend: stable

*Updated after each plan completion*
| Phase 04 P01 | 3min | 2 tasks | 6 files |
| Phase 04 P02 | 4min | 2 tasks | 9 files |

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
- [03-02]: Client-side parsing with PapaParse (CSV) and SheetJS (Excel) for instant preview without server upload
- [03-02]: SheetJS installed from CDN URL (0.20.3) -- npm registry version (0.18.5) is outdated
- [03-02]: Auto-skip column mapper when suggestMapping detects all required fields (product + quantity)
- [03-02]: Simple HTML table for upload preview (not TanStack Table) -- one-time preview, not a reusable data table
- [03-02]: Product matching by case-insensitive SKU first, then name -- no fuzzy matching
- [03-03]: Client-side product loading in manual entry form via useEffect + getFinishedItems -- form is client component
- [03-03]: Separate sales-columns.tsx from sales-history-table.tsx following established item-columns/item-table pattern
- [03-03]: Simple HTML table for upload detail page -- TanStack Table unnecessary for read-only detail view
- [04-01]: Division-by-zero guard on cartonSize/cartonWeightMg in inventory value calculation
- [04-01]: Application-level filtering for low-stock (Prisma cannot compare two columns in WHERE clause)
- [04-01]: Surplus threshold at 3x minStockQty; severity coloring: red for critical (<=0), amber for warning
- [04-02]: Base UI render prop for PopoverTrigger (render={<Button />}) consistent with dialog.tsx pattern
- [04-02]: Native HTML selects for report filters -- consistent with project pattern of simple state management
- [04-02]: Simple HTML table for report results -- TanStack Table unnecessary for read-only filtered data
- [04-02]: Default date range set to last 30 days for immediate usability
- [05-01]: Waste form accepts grams (weight items) or pieces (PACKAGING) -- server converts grams to milligrams via gramsToMg()
- [05-01]: Waste reason codes stored as [CODE] text prefix in notes field -- no separate DB table (fixed small set, no CRUD needed)
- [05-01]: Waste ledger quantity is negative; stockQty uses decrement with positive value -- matches sale deduction sign convention

### Pending Todos

None yet.

### Blockers/Concerns

- [Research]: POS export format unknown -- obtain sample CSV/Excel file from actual POS before Phase 3 planning
- [Research]: Supabase RLS policies for 3 roles across all modules need detailed design during Phase 1 planning (RESOLVED: RLS policies created in 00001_rbac_setup.sql)
- [Research]: Vercel vs Railway hosting decision pending (budget trade-off: $20/month vs $5/month)

## Session Continuity

Last session: 2026-03-10
Stopped at: Completed 05-01-PLAN.md (Waste recording with reason codes and atomic ledger)
Resume file: .planning/phases/05-accuracy-and-polish/05-01-SUMMARY.md
Next: Execute 05-02 (Physical inventory reconciliation).
