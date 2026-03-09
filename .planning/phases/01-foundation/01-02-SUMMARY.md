---
phase: 01-foundation
plan: 02
subsystem: items, ui, database
tags: [zod, tanstack-table, react-hook-form, prisma, server-actions, soft-delete, unit-conversion]

# Dependency graph
requires:
  - phase: 01-01
    provides: "Next.js scaffold, Prisma schema (Item model), Supabase Auth, requireRole helper, shadcn/ui components, constants"
provides:
  - "Item Zod schema with user-friendly units (grams, pesos)"
  - "Server actions for full item CRUD: create, update, soft-delete, list with search/filter, get by ID"
  - "Shared ItemForm component for create and edit with unit conversion"
  - "TanStack Table item list with sorting, pagination, search, type/category filters"
  - "SKU format legend reference page"
  - "Item column definitions with mg-to-grams and centavos-to-pesos display conversion"
affects: [01-03, 01-04, 02-recipe-engine]

# Tech tracking
tech-stack:
  added: []
  patterns: [item-form-unit-conversion, tanstack-table-with-filter-dropdowns, soft-delete-confirmation-dialog, role-gated-ui-buttons]

key-files:
  created:
    - src/schemas/item.ts
    - src/actions/items.ts
    - src/components/items/item-form.tsx
    - src/components/items/item-columns.tsx
    - src/components/items/item-table.tsx
    - src/app/(dashboard)/items/page.tsx
    - src/app/(dashboard)/items/new/page.tsx
    - src/app/(dashboard)/items/[id]/edit/page.tsx
    - src/app/(dashboard)/items/[id]/edit/edit-client.tsx
    - src/app/(dashboard)/items/sku-legend/page.tsx
  modified:
    - src/schemas/stock.ts

key-decisions:
  - "Form schema uses user-friendly units (grams, pesos) -- server actions convert to storage units (mg, centavos) before Prisma write"
  - "Used native HTML select for type picker instead of Base UI Select for simpler react-hook-form integration (consistent with 01-01 pattern)"
  - "Client-side filtering via TanStack Table globalFilterFn rather than server-side refetch for simplicity with small dataset"
  - "Edit page splits into server component (data loading) and client component (form interactivity) via edit-client.tsx wrapper"

patterns-established:
  - "Item form unit conversion: form collects grams/pesos, action converts with gramsToMg/pesosToCentavos, display converts back with mgToGrams/centavosToPesos"
  - "TanStack Table with filter dropdowns: type and category selects drive columnFilters state, globalFilter handles search"
  - "Soft-delete confirmation: Dialog component with cancel/confirm before calling deleteItem server action"
  - "Role-gated action buttons: RoleGate wraps Add Item button to show only for staff+ roles"

requirements-completed: [ITEM-01, ITEM-02, ITEM-03, ITEM-04, ITEM-05, ITEM-06]

# Metrics
duration: 7min
completed: 2026-03-09
---

# Phase 1 Plan 02: Item CRUD Summary

**Full item CRUD with Zod validation, TanStack Table (sort/filter/search/paginate), unit conversion (grams<->mg, pesos<->centavos), and SKU legend**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-09T11:34:50Z
- **Completed:** 2026-03-09T11:42:07Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments
- Complete item CRUD: create, read (list with search/filter), update, soft-delete with confirmation dialog
- All four item types supported with type badge display (Raw Material, Semi-Finished, Finished, Packaging)
- Unit conversion pipeline: forms accept grams/pesos, server actions convert to mg/centavos for storage, columns convert back for display
- TanStack Table with sortable columns, search by name/SKU, type and category filter dropdowns, pagination (10/25/50)
- SKU format legend page with type prefixes, category codes, and example SKUs
- Role-gated UI: Add Item button visible only to staff+ roles

## Task Commits

Each task was committed atomically:

1. **Task 1: Create item Zod schema, server actions for CRUD, and shared item form component** - `4ccf156` (feat)
2. **Task 2: Build item list with TanStack Table, search/filter, and SKU legend page** - `43b8903` (feat)

## Files Created/Modified
- `src/schemas/item.ts` - Zod schema for item form data with grams/pesos user-friendly units
- `src/actions/items.ts` - Server actions: createItem, updateItem, deleteItem (soft), getItems (with search/filter), getItem
- `src/components/items/item-form.tsx` - Shared create/edit form with carton weight preview and unit conversion
- `src/components/items/item-columns.tsx` - TanStack Table column definitions with mg->grams and centavos->pesos display
- `src/components/items/item-table.tsx` - Data table with sorting, pagination, search, type/category filters, delete confirmation
- `src/app/(dashboard)/items/page.tsx` - Item list page with role-gated Add Item button
- `src/app/(dashboard)/items/new/page.tsx` - Create new item page (client component wrapper)
- `src/app/(dashboard)/items/[id]/edit/page.tsx` - Edit item page (server component loads item)
- `src/app/(dashboard)/items/[id]/edit/edit-client.tsx` - Edit form client component with update action
- `src/app/(dashboard)/items/sku-legend/page.tsx` - SKU format reference with type prefixes, category codes, examples
- `src/schemas/stock.ts` - Fixed receivedDate type for standardSchemaResolver compatibility

## Decisions Made
- **Form schema design:** The Zod schema uses `unitWeightGrams` and `costPesos` (user-friendly units) rather than `unitWeightMg` and `costCentavos`. The server action handles conversion before database write. This keeps the form schema aligned with what users actually enter.
- **Client-side filtering:** Used TanStack Table's built-in filtering (globalFilterFn + columnFilters) rather than server-side refetching. For the expected item count (<1000), client-side filtering is simpler and faster.
- **Edit page architecture:** Split into server component (page.tsx loads item via getItem) and client component (edit-client.tsx renders form). This follows Next.js patterns for mixing server data loading with client interactivity.
- **Native HTML select:** Continued the pattern from 01-01 of using native `<select>` elements for dropdowns instead of Base UI Select, keeping react-hook-form integration simple.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed stock schema receivedDate type incompatibility with standardSchemaResolver**
- **Found during:** Task 1 (build verification)
- **Issue:** `z.string().pipe(z.coerce.date())` in stock schema produced `Date` output type but form uses string default values, causing type mismatch with standardSchemaResolver
- **Fix:** Changed to `z.string().min(1, "Date is required")` -- date string is passed through to server action as-is
- **Files modified:** src/schemas/stock.ts
- **Verification:** pnpm build succeeds
- **Committed in:** 4ccf156 (part of Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking type incompatibility from plan 01 code)
**Impact on plan:** Pre-existing type error in stock schema blocked build. Fix is minimal and correct -- the date string doesn't need runtime coercion since it passes through to the server action.

## Issues Encountered
- Task 1 files were found already committed from a prior session (commit 4ccf156 labeled as feat(01-03)). The files were verified correct and no changes needed. Task 2 files were new and committed as 43b8903.

## User Setup Required
None - no external service configuration required. All item CRUD routes use the existing Supabase Auth and Prisma setup from plan 01.

## Next Phase Readiness
- Item management complete: all CRUD operations working with proper authorization
- Ready for 01-03 plan: Stock receiving can now select from items created via this plan
- Ready for 01-04 plan: Full verification checkpoint with seed data
- TanStack Table pattern established for reuse in future list views

## Self-Check: PASSED
