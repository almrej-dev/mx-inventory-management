---
phase: 05-accuracy-and-polish
plan: "02"
subsystem: ui
tags: [prisma, react, next.js, server-actions, reconciliation, inventory]

requires:
  - phase: 05-01
    provides: waste recording pattern, gramsToMg/mgToGrams utils, atomic ledger pattern

provides:
  - Physical inventory reconciliation page at /stock/reconciliation
  - ReconciliationForm client component with live variance preview
  - getItemsForReconciliation server action
  - submitReconciliation server action with atomic ADJUSTMENT ledger writes
  - reconciliationSchema and reconciliationCountSchema in stock.ts
  - Sidebar nav entry: Stock > Receiving > Waste > Reconciliation > History

affects: []

tech-stack:
  added: []
  patterns:
    - "Dynamic table of inputs uses controlled useState (Record<id, string>) rather than react-hook-form useFieldArray -- better for 50-200 item tables"
    - "Typed ops array with union ReturnType for prisma.$transaction batching"
    - "submitReconciliation uses absolute SET for stockQty (not increment/decrement) -- physical count is truth; ledger records delta for audit"

key-files:
  created:
    - src/schemas/stock.ts (reconciliationCountSchema, reconciliationSchema added)
    - src/actions/stock.ts (getItemsForReconciliation, submitReconciliation added)
    - src/components/stock/reconciliation-form.tsx
    - src/app/(dashboard)/stock/reconciliation/page.tsx
  modified:
    - src/components/layout/sidebar.tsx

key-decisions:
  - "Reconciliation ops array typed as TxOp union (ReturnType of create | update) to satisfy Prisma $transaction array overload without needing Prisma.PrismaPromise import"
  - "Variance display computed in display units (grams/pieces) -- user thinks in display units, only server converts back to storage"
  - "Items with zero variance are skipped silently -- only discrepant items get ADJUSTMENT entries"

patterns-established:
  - "Absolute SET for stockQty in reconciliation: physical count IS the truth"
  - "Batch reference ID pattern: RECON-{Date.now()} groups all adjustments from one session"
  - "Client filter dropdown reduces cognitive load for large item lists"

requirements-completed:
  - STCK-04

duration: 3min
completed: 2026-03-10
---

# Phase 5 Plan 02: Physical Inventory Reconciliation Summary

**Reconciliation page with live variance preview table and atomic ADJUSTMENT ledger writes -- physical count sets stockQty absolutely via prisma.$transaction batch**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-10T03:43:13Z
- **Completed:** 2026-03-10T03:46:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Reconciliation schemas added (reconciliationCountSchema, reconciliationSchema) with Zod v4 validation
- Two server actions: getItemsForReconciliation (active items with stockQty) and submitReconciliation (atomic batch ADJUSTMENT writes)
- ReconciliationForm client component: table with system stock, physical count inputs, live color-coded variance (green=surplus, red=shortage), type filter, pre-submit discrepancy summary
- Server page at /stock/reconciliation loads items and renders form
- Sidebar updated: Stock section now shows Receiving > Waste > Reconciliation > History

## Task Commits

1. **Task 1: Add reconciliation schemas and server actions** - `5c9054a` (feat)
2. **Task 2: Build reconciliation form, page, and sidebar nav** - `c46fa01` (feat)

## Files Created/Modified

- `src/schemas/stock.ts` - Added reconciliationCountSchema and reconciliationSchema exports
- `src/actions/stock.ts` - Added getItemsForReconciliation and submitReconciliation server actions
- `src/components/stock/reconciliation-form.tsx` - Client form with live variance table and type filter
- `src/app/(dashboard)/stock/reconciliation/page.tsx` - Server component page, loads items and renders form
- `src/components/layout/sidebar.tsx` - Added ClipboardCheck icon and Reconciliation nav item

## Decisions Made

- **ops array typing**: Used `type TxOp = ReturnType<typeof prisma.inventoryTransaction.create> | ReturnType<typeof prisma.item.update>` to satisfy the `$transaction` array overload. `Parameters<typeof prisma.$transaction>[0]` resolved to the callback overload instead, causing TS errors.
- **Absolute SET for stockQty**: submitReconciliation uses `stockQty: physicalStorageQty` (not increment/decrement). Physical count is the authoritative truth. The ADJUSTMENT ledger entry records the variance (delta) for the audit trail.
- **Variance in display units**: UI computes and shows variance in grams/pieces -- user thinks in display units. Only the server action converts back to mg/pieces for storage.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- TypeScript error on ops array: `Parameters<typeof prisma.$transaction>[0]` resolved to the callback overload (not array overload), causing `push` to be unavailable. Fixed by using explicit union type `TxOp` for the array elements.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 5 complete: waste recording (05-01) and physical reconciliation (05-02) both shipped
- All stock accuracy features delivered: receiving, waste, reconciliation, transaction history
- System ready for production; no blockers identified

---
*Phase: 05-accuracy-and-polish*
*Completed: 2026-03-10*
