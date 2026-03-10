---
phase: 02-recipe-engine
plan: 01
subsystem: database
tags: [prisma, postgresql, bom, recipe, zod, rls]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: "Prisma schema with Item model, integer storage patterns (mg/centavos), RLS authorize() function"
provides:
  - "RecipeIngredient Prisma model with parent/child item relations and dual quantity fields"
  - "BOM explosion function (explodeBom) with recursive resolution and circular reference detection"
  - "Recipe cost calculation function (calculateRecipeCost)"
  - "Circular reference checker (checkCircularReference) for pre-save validation"
  - "Recipe Zod schema with user-friendly grams units"
  - "RLS migration for recipe_ingredients table"
affects: [02-recipe-engine, 03-sales-deductions]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Explicit join table (RecipeIngredient) for many-to-many with metadata"
    - "Application-level recursive BOM resolution for shallow recipe trees"
    - "Integer-only arithmetic for cost calculation (centavos, milligrams)"
    - "Dual quantity fields (quantityMg for weight, quantityPieces for packaging)"

key-files:
  created:
    - src/lib/bom.ts
    - src/schemas/recipe.ts
    - supabase/migrations/00002_recipe_ingredients.sql
  modified:
    - prisma/schema.prisma

key-decisions:
  - "Application-level recursion over PostgreSQL CTE for BOM explosion -- simpler, type-safe, sufficient for 2-3 level trees"
  - "Dual quantity fields (quantityMg + quantityPieces) rather than single polymorphic field -- explicit and type-safe"
  - "On-demand cost calculation (never stored) -- ensures costs stay current when ingredient prices change"

patterns-established:
  - "RecipeIngredient join table pattern: parentItemId + childItemId with @@unique constraint"
  - "BOM explosion with visited-set circular reference detection"
  - "Recipe form uses quantityGrams (user-friendly) converted to quantityMg via gramsToMg() in server action"

requirements-completed: [RECP-01, RECP-02, RECP-03, RECP-04]

# Metrics
duration: 2min
completed: 2026-03-10
---

# Phase 2 Plan 1: Recipe Data Model and BOM Logic Summary

**RecipeIngredient Prisma model with recursive BOM explosion, integer cost calculation, and circular reference detection**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-10T00:01:09Z
- **Completed:** 2026-03-10T00:03:46Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- RecipeIngredient model added to Prisma schema with parentItem/childItem relations, dual quantity fields (quantityMg, quantityPieces), and unique constraint preventing duplicate ingredients
- BOM explosion library with recursive multi-level resolution, duplicate ingredient merging, weight-based and piece-based cost calculation using integer arithmetic
- Circular reference detection both during BOM explosion (visited set guard) and for pre-save validation (checkCircularReference)
- Recipe Zod schema with user-friendly grams input matching Phase 1 form pattern
- RLS migration with viewer-read/staff-write policies matching existing RBAC pattern

## Task Commits

Each task was committed atomically:

1. **Task 1: Add RecipeIngredient model to Prisma schema and create RLS migration** - `28b62b5` (feat)
2. **Task 2: Create BOM explosion library and recipe Zod schema** - `101a4d5` (feat)

## Files Created/Modified
- `prisma/schema.prisma` - Added RecipeIngredient model and relation fields on Item
- `supabase/migrations/00002_recipe_ingredients.sql` - RLS policies for recipe_ingredients table
- `src/lib/bom.ts` - BOM explosion, cost calculation, and circular reference detection functions
- `src/schemas/recipe.ts` - Zod validation schema for recipe form with RecipeFormData type

## Decisions Made
- Application-level recursion chosen over PostgreSQL recursive CTE for BOM explosion -- keeps type safety, simpler to maintain, sufficient for 2-3 level recipe trees typical in ice cream/tea shop
- Dual quantity fields (quantityMg + quantityPieces) used instead of a single polymorphic quantity -- explicit about weight vs piece semantics
- Cost calculated on-demand rather than stored -- eliminates stale cost issues when ingredient prices change (per RECP-04)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required. The RLS migration SQL (00002_recipe_ingredients.sql) must be applied via Supabase SQL Editor after running `pnpm db:push` to create the table, but this is a deployment step documented in the migration file itself.

## Next Phase Readiness
- Data model and core logic ready for Plan 02 (Recipe CRUD server actions, UI components, and pages)
- BOM functions are importable from `@/lib/bom` for use in server actions and API routes
- Recipe Zod schema ready for form integration with standardSchemaResolver

## Self-Check: PASSED

All 4 created files verified present. Both task commits (28b62b5, 101a4d5) verified in git log. All required exports confirmed: explodeBom, calculateRecipeCost, checkCircularReference, BomLine, recipeSchema, RecipeFormData. RLS policies present in migration file.

---
*Phase: 02-recipe-engine*
*Completed: 2026-03-10*
