---
phase: 02-recipe-engine
plan: 02
subsystem: ui
tags: [react, next.js, tanstack-table, react-hook-form, zod, server-actions, bom]

# Dependency graph
requires:
  - phase: 02-recipe-engine
    plan: 01
    provides: "RecipeIngredient model, BOM explosion, cost calculation, circular reference detection, recipe Zod schema"
  - phase: 01-foundation
    provides: "Item CRUD pattern (server actions, form, table, columns), sidebar structure, RoleGate, utility functions"
provides:
  - "Recipe CRUD server actions (createRecipe, updateRecipe, deleteRecipe, getRecipes, getRecipe, getRecipeBom)"
  - "Recipe form with dynamic ingredient rows and type-aware quantity fields"
  - "Recipe list page with TanStack Table (search, filter, sort, pagination, cost display)"
  - "Recipe detail page with direct ingredients and full BOM breakdown preview"
  - "Sidebar navigation with Recipes section visible to all roles"
  - "Ingredient and parent item selector server actions for form dropdowns"
affects: [03-sales-deductions, 04-dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Recipe form with useFieldArray for dynamic ingredient rows"
    - "Type-aware ingredient quantity fields (grams for weight items, pieces for packaging)"
    - "In-memory single-level cost calculation in getRecipes to avoid N+1 queries"
    - "Server component + client component split for recipe edit pages"
    - "BOM preview component for full multi-level cost breakdown display"

key-files:
  created:
    - src/actions/recipes.ts
    - src/components/recipes/recipe-form.tsx
    - src/components/recipes/ingredient-row.tsx
    - src/components/recipes/recipe-columns.tsx
    - src/components/recipes/recipe-table.tsx
    - src/components/recipes/bom-preview.tsx
    - src/app/(dashboard)/recipes/page.tsx
    - src/app/(dashboard)/recipes/new/page.tsx
    - src/app/(dashboard)/recipes/[id]/page.tsx
    - src/app/(dashboard)/recipes/[id]/edit/page.tsx
    - src/app/(dashboard)/recipes/[id]/edit/edit-client.tsx
  modified:
    - src/components/layout/sidebar.tsx

key-decisions:
  - "In-memory single-level cost calculation for recipe list to avoid N+1 explodeBom calls per recipe"
  - "Type-aware quantity fields in ingredient rows: packaging shows pieces input, weight items show grams input"
  - "useTransition for form submit pending state instead of useForm isSubmitting (matches server action pattern)"

patterns-established:
  - "Recipe form pattern: useFieldArray + type-aware IngredientRow components"
  - "Dual-page BOM display: direct ingredients table + full BOM breakdown via explodeBom"
  - "Server action error handling: _form key for form-level errors, field paths for field-level errors"

requirements-completed: [RECP-01, RECP-02, RECP-03, RECP-04, RECP-05]

# Metrics
duration: 4min
completed: 2026-03-10
---

# Phase 2 Plan 2: Recipe CRUD UI with Dynamic Ingredient Form and BOM Preview Summary

**Full recipe management UI with server actions, dynamic ingredient form (type-aware grams/pieces), TanStack Table list, BOM breakdown detail page, and sidebar navigation**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-10T00:07:19Z
- **Completed:** 2026-03-10T00:12:06Z
- **Tasks:** 3
- **Files modified:** 12

## Accomplishments
- Eight recipe server actions covering full CRUD lifecycle plus BOM retrieval and item selection for dropdowns
- Dynamic ingredient form with useFieldArray that switches between grams and pieces input based on selected item type
- Recipe list page with TanStack Table showing product name, SKU, type, ingredient count, and computed cost in pesos
- Recipe detail page showing both direct ingredients and full multi-level BOM breakdown with per-line and total costs
- Sidebar navigation updated with "Recipes" section using BookOpen icon, visible to all roles

## Task Commits

Each task was committed atomically:

1. **Task 1: Create recipe server actions for CRUD and BOM retrieval** - `af13c53` (feat)
2. **Task 2: Build recipe form with dynamic ingredient rows** - `3d1185a` (feat)
3. **Task 3: Build recipe list, detail/BOM preview pages, and sidebar navigation** - `5a5bebc` (feat)

## Files Created/Modified
- `src/actions/recipes.ts` - Recipe CRUD server actions with validation, circular reference checks, and unit conversion
- `src/components/recipes/recipe-form.tsx` - Client form with useFieldArray for dynamic ingredient management
- `src/components/recipes/ingredient-row.tsx` - Type-aware ingredient row (grams for weight, pieces for packaging)
- `src/components/recipes/recipe-columns.tsx` - TanStack Table column definitions for recipe list
- `src/components/recipes/recipe-table.tsx` - Recipe list table with search, type filter, sorting, pagination
- `src/components/recipes/bom-preview.tsx` - BOM breakdown table with line costs and total
- `src/app/(dashboard)/recipes/page.tsx` - Recipe list page with role-gated "New Recipe" button
- `src/app/(dashboard)/recipes/new/page.tsx` - New recipe page loading parent and ingredient selectors
- `src/app/(dashboard)/recipes/[id]/page.tsx` - Recipe detail page with direct ingredients and BOM preview
- `src/app/(dashboard)/recipes/[id]/edit/page.tsx` - Edit recipe server component loading recipe data
- `src/app/(dashboard)/recipes/[id]/edit/edit-client.tsx` - Edit recipe client wrapper passing defaultValues to form
- `src/components/layout/sidebar.tsx` - Added "Recipes" section with BookOpen icon after "Items"

## Decisions Made
- In-memory single-level cost calculation for recipe list (`getRecipes`) to avoid N+1 `explodeBom` calls per recipe -- full multi-level cost shown only on detail page via `getRecipeBom`
- Type-aware quantity fields in ingredient rows: `useWatch` on `childItemId` determines if PACKAGING (pieces input) or weight item (grams input)
- `useTransition` for form submit pending state instead of `useForm` `isSubmitting` -- better matches server action call pattern and avoids double-submit
- Sidebar uses section header pattern for Recipes (matching existing "Stock" section) rather than standalone nav item

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required. All recipe UI builds on existing database model and BOM logic from Plan 01.

## Next Phase Readiness
- Complete recipe management feature ready: create, view, edit, delete recipes with cost calculation
- BOM explosion working end-to-end from recipe creation through detail page display
- Recipe server actions (`getRecipes`, `getRecipeBom`) available for Phase 3 sales deduction calculations
- Phase 2 (Recipe Engine) fully complete -- all RECP requirements fulfilled

## Self-Check: PASSED

All 12 created/modified files verified present. All 3 task commits (af13c53, 3d1185a, 5a5bebc) verified in git log. TypeScript compiles cleanly. Next.js build succeeds with all recipe routes present. All recipe server action exports confirmed: createRecipe, updateRecipe, deleteRecipe, getRecipes, getRecipe, getRecipeBom, getItemsForIngredientSelect, getItemsForParentSelect.

---
*Phase: 02-recipe-engine*
*Completed: 2026-03-10*
