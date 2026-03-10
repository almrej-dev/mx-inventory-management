---
phase: 05-accuracy-and-polish
plan: 01
subsystem: ui
tags: [prisma, react-hook-form, zod, next-js, server-actions, lucide-react]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: atomic ledger pattern (prisma.$transaction), gramsToMg/mgToGrams utils, sidebar NavSection pattern
  - phase: 03-sales-and-deduction
    provides: signed quantity convention (positive=add, negative=remove) used in WASTE ledger entries

provides:
  - WASTE_REASON_CODES constant array in src/lib/constants.ts
  - wasteSchema Zod validation in src/schemas/stock.ts
  - recordWaste server action with atomic ledger write in src/actions/stock.ts
  - WasteForm client component in src/components/stock/waste-form.tsx
  - Waste recording page at /stock/waste
  - Waste nav item in sidebar Stock section

affects: [05-02-reconciliation, any phase adding stock movements]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Waste ledger entries use negative quantity to decrement stockQty (same sign convention as sale deductions)"
    - "User enters grams for weight items; server converts to milligrams via gramsToMg() before writing ledger"
    - "Reason codes stored as [CODE] prefix in notes field -- no separate DB table needed for fixed enum"

key-files:
  created:
    - src/components/stock/waste-form.tsx
    - src/app/(dashboard)/stock/waste/page.tsx
  modified:
    - src/lib/constants.ts
    - src/schemas/stock.ts
    - src/actions/stock.ts
    - src/components/layout/sidebar.tsx

key-decisions:
  - "Waste quantities enter form in grams (weight items) or pieces (PACKAGING) -- matches display units used elsewhere"
  - "Reason code stored as [CODE] text prefix in notes field, not a foreign key -- fixed small set, no CRUD needed"
  - "Negative ledger quantity for waste (matches sale deduction pattern); positive decrement value for stockQty"

patterns-established:
  - "Waste form pattern: standardSchemaResolver(wasteSchema), dynamic unit label via useMemo on selected item type"

requirements-completed: [STCK-03]

# Metrics
duration: 3min
completed: 2026-03-10
---

# Phase 5 Plan 01: Waste Recording Summary

**Waste/spoilage recording with 6 reason codes, atomic WASTE ledger entry (negative quantity), and sidebar navigation -- no schema migration needed as WASTE type already existed in Prisma enum.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-10T03:38:38Z
- **Completed:** 2026-03-10T03:41:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Added `WASTE_REASON_CODES` (6 entries) constant, `wasteSchema` Zod schema, and `recordWaste` server action following exact `receiveStock` atomic ledger pattern
- Created `WasteForm` client component with item selector, dynamic unit label (grams vs pieces by item type), reason code dropdown, notes textarea, and success/error banner
- Added `/stock/waste` server page and Waste nav item (Trash2 icon) to sidebar Stock section between Receiving and History

## Task Commits

Each task was committed atomically:

1. **Task 1: Add waste reason codes, Zod schema, and recordWaste server action** - `8ef627c` (feat)
2. **Task 2: Build waste recording form, page, and sidebar navigation** - `8f805ef` (feat)

**Plan metadata:** (to be recorded in final commit)

## Files Created/Modified

- `src/lib/constants.ts` - Added WASTE_REASON_CODES constant array (6 reason codes)
- `src/schemas/stock.ts` - Added wasteSchema and WasteFormData type
- `src/actions/stock.ts` - Added recordWaste server action with atomic WASTE ledger write
- `src/components/stock/waste-form.tsx` - New client form component for waste recording
- `src/app/(dashboard)/stock/waste/page.tsx` - New server page loading items for waste form
- `src/components/layout/sidebar.tsx` - Added Trash2 import and Waste nav item in Stock section

## Decisions Made

None - followed plan as specified. All patterns (atomic ledger, standardSchemaResolver, server component + client form, native HTML selects) followed established project conventions exactly.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. TypeScript compiled cleanly after each task. Next.js build succeeded with `/stock/waste` route appearing in route manifest.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Waste recording fully functional: form validates, submits, creates WASTE ledger entry with negative quantity, decrements stockQty, revalidates affected pages
- Sidebar correctly shows Stock > Receiving, Waste, History ordering
- WASTE transaction type badge styling already existed in history page (orange badge)
- Phase 5 Plan 02 (Reconciliation/STCK-04) can begin immediately -- same patterns apply

## Self-Check: PASSED

- src/components/stock/waste-form.tsx: FOUND
- src/app/(dashboard)/stock/waste/page.tsx: FOUND
- .planning/phases/05-accuracy-and-polish/05-01-SUMMARY.md: FOUND
- Commit 8ef627c: FOUND
- Commit 8f805ef: FOUND

---
*Phase: 05-accuracy-and-polish*
*Completed: 2026-03-10*
