---
phase: 02-recipe-engine
verified: 2026-03-10T08:30:00Z
status: passed
score: 8/8 must-haves verified
re_verification: false
---

# Phase 2: Recipe Engine Verification Report

**Phase Goal:** Users can define multi-level recipes that link finished products to their ingredients (including sub-recipes and packaging) and see full cost breakdowns
**Verified:** 2026-03-10T08:30:00Z
**Status:** passed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can create a recipe by selecting a finished/semi-finished product and adding ingredient rows with quantities | VERIFIED | `recipe-form.tsx` (206 lines): useForm with standardSchemaResolver, useFieldArray for dynamic rows. `createRecipe` server action validates parent type, checks circular refs, creates via `prisma.$transaction`. `recipes/new/page.tsx` loads parent + ingredient selectors. |
| 2 | User can see a list of all recipes with ingredient count and computed total cost | VERIFIED | `recipes/page.tsx` calls `getRecipes()` which queries items with `recipeIngredients: { some: {} }`, computes cost in-memory per recipe. `recipe-table.tsx` renders TanStack Table with search, type filter, sorting, pagination. `recipe-columns.tsx` displays name, SKU, type badge, ingredient count, cost in PHP. |
| 3 | User can edit an existing recipe's ingredients and quantities | VERIFIED | `recipes/[id]/edit/page.tsx` loads recipe data via `getRecipe()`, passes to `EditRecipeClient` which maps to `RecipeFormData` defaultValues. `RecipeForm mode="edit"` disables parent selector, calls `updateRecipe` server action (delete+recreate transaction pattern). `getRecipe` converts `quantityMg` to grams for display. |
| 4 | User can delete a recipe | VERIFIED | `recipe-table.tsx` `handleDelete` calls `deleteRecipe(id)` with `window.confirm()`. `deleteRecipe` server action: `requireRole("staff")`, `prisma.recipeIngredient.deleteMany({ where: { parentItemId } })`, `revalidatePath("/recipes")`. |
| 5 | User can view a recipe's full BOM breakdown showing every raw material and packaging item across all levels | VERIFIED | `recipes/[id]/page.tsx` calls `getRecipeBom(itemId)` which calls `explodeBom()` from `bom.ts`. `BomPreview` component (100 lines) renders table with item name, SKU, type badge, quantity, unit cost, line cost, and footer with total cost. `explodeBom` recursively resolves SEMI_FINISHED sub-recipes, merges duplicates, computes line costs. |
| 6 | Packaging ingredients show piece quantities, weight ingredients show gram quantities | VERIFIED | `ingredient-row.tsx`: `useWatch` on `childItemId`, checks `selectedItem.type === "PACKAGING"` to toggle between `quantityPieces` (int, "pcs" label) and `quantityGrams` (decimal, "g" label) inputs. `bom-preview.tsx` line 74: conditional `PACKAGING ? quantityPieces pcs : mgToGrams(quantityMg)g`. Detail page ingredient table also switches display (line 117). |
| 7 | Recipe cost displays in pesos, computed on-demand from ingredient costs | VERIFIED | `getRecipes()` computes cost in-memory using PACKAGING pieces * costCentavos vs weight-proportional cost, returns `centavosToPesos()` formatted string. `getRecipeBom()` calls `calculateRecipeCost()` which sums `explodeBom()` line costs. BomPreview footer shows `PHP centavosToPesos(totalCostCentavos)`. Cost is never stored -- always computed from current ingredient costs. |
| 8 | Recipes navigation link appears in sidebar for all roles | VERIFIED | `sidebar.tsx` line 55-65: "Recipes" section with `roles: ["admin", "staff", "viewer"]` containing "All Recipes" nav item with `href: "/recipes"` and `BookOpen` icon. |

**Score:** 8/8 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `prisma/schema.prisma` | RecipeIngredient model with parentItem/childItem relations | VERIFIED | Model at lines 67-79: dual quantity fields (quantityMg, quantityPieces), @@unique([parentItemId, childItemId]), @@map("recipe_ingredients"). Item model has both RecipeParent and RecipeChild relations (lines 44-45). |
| `supabase/migrations/00002_recipe_ingredients.sql` | RLS policies for recipe_ingredients table | VERIFIED | 38 lines: ENABLE RLS, SELECT for viewer+, INSERT/UPDATE/DELETE for staff+, using authorize() function. |
| `src/lib/bom.ts` | explodeBom, calculateRecipeCost, checkCircularReference functions | VERIFIED | 193 lines: BomLine interface, recursive explodeBom with visited-set guard, duplicate merging, weight-based and piece-based cost calculation, calculateRecipeCost sums lines, checkCircularReference with hasAncestor helper. Integer arithmetic throughout. |
| `src/schemas/recipe.ts` | Zod validation schema for recipe form | VERIFIED | 16 lines: ingredientLineSchema (childItemId, quantityGrams, quantityPieces), recipeSchema (parentItemId, ingredients array min 1), RecipeFormData type exported. Uses `zod/v4`. |
| `src/actions/recipes.ts` | Recipe CRUD server actions | VERIFIED | 453 lines: 8 exported functions -- createRecipe, updateRecipe, deleteRecipe, getRecipes, getRecipe, getRecipeBom, getItemsForIngredientSelect, getItemsForParentSelect. All use requireRole guard. createRecipe/updateRecipe validate parent type, check circular refs, use $transaction. |
| `src/components/recipes/recipe-form.tsx` | Recipe form with dynamic ingredient rows (min 80 lines) | VERIFIED | 206 lines: useForm + useFieldArray, standardSchemaResolver, create/edit modes, parent selector, dynamic IngredientRow components, formError display, useTransition for pending state. |
| `src/components/recipes/bom-preview.tsx` | BOM breakdown table component (min 30 lines) | VERIFIED | 100 lines: Table with header/body/footer, type badges, conditional quantity display (grams vs pieces), unit cost and line cost in PHP, total cost footer. Handles empty BOM case. |
| `src/components/recipes/ingredient-row.tsx` | Type-aware ingredient row component | VERIFIED | 133 lines: useWatch on childItemId to detect PACKAGING, conditional quantity input (pieces vs grams), unit label ("pcs" vs "g"), error display, remove button. |
| `src/components/recipes/recipe-columns.tsx` | TanStack Table column definitions | VERIFIED | 137 lines: Product Name, SKU (mono), Type (badge), Ingredients (count), Cost (PHP), Actions (view/edit/delete). Sortable columns. |
| `src/components/recipes/recipe-table.tsx` | Recipe list table component | VERIFIED | 215 lines: TanStack Table with global filter (name/SKU), type filter (ALL/FINISHED/SEMI_FINISHED), sorting, pagination (10/25/50), delete with window.confirm. |
| `src/app/(dashboard)/recipes/page.tsx` | Recipe list page | VERIFIED | 63 lines: Server component, calls getRecipes(), role-gated "New Recipe" button, renders RecipeTable. |
| `src/app/(dashboard)/recipes/new/page.tsx` | New recipe page | VERIFIED | 28 lines: Server component, loads parent + ingredient selectors via Promise.all, renders RecipeForm mode="create". |
| `src/app/(dashboard)/recipes/[id]/page.tsx` | Recipe detail page with BOM preview | VERIFIED | 153 lines: Server component, loads recipe + BOM via Promise.all, shows header with badge, direct ingredients table, BomPreview component, role-gated edit button, notFound() guard. |
| `src/app/(dashboard)/recipes/[id]/edit/page.tsx` | Edit recipe page | VERIFIED | 48 lines: Server component, loads recipe + selectors, notFound() guard, renders EditRecipeClient. |
| `src/app/(dashboard)/recipes/[id]/edit/edit-client.tsx` | Edit recipe client wrapper | VERIFIED | 48 lines: Client component, maps RecipeDetail to RecipeFormData defaultValues, renders RecipeForm mode="edit" with parentItemId locked. |
| `src/components/layout/sidebar.tsx` | Sidebar with Recipes navigation | VERIFIED | Updated: "Recipes" section added after "Items" with BookOpen icon, visible to all roles (admin, staff, viewer). |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/lib/bom.ts` | `prisma.recipeIngredient` | Prisma queries with childItem include | WIRED | `recipeIngredient.findMany` at lines 42 and 176, with childItem select. |
| `src/lib/bom.ts` | `src/types/index.ts` | ItemTypeValue for type checking | WIRED | Import at line 2, used in BomLine interface and type cast at line 81. |
| `prisma/schema.prisma` | Item model | RecipeIngredient relations | WIRED | Item has RecipeParent (line 44) and RecipeChild (line 45) relations. RecipeIngredient has parentItem (line 74) and childItem (line 75) back-relations. |
| `src/actions/recipes.ts` | `src/lib/bom.ts` | explodeBom and calculateRecipeCost calls | WIRED | Import at line 6. explodeBom called at line 374, calculateRecipeCost at line 375. |
| `src/actions/recipes.ts` | `src/schemas/recipe.ts` | recipeSchema validation | WIRED | Import at line 5. recipeSchema.safeParse at lines 18 and 116. |
| `src/components/recipes/recipe-form.tsx` | `src/actions/recipes.ts` | createRecipe/updateRecipe server action calls | WIRED | Import at line 8. Conditional call at lines 75-76 based on mode. |
| `src/app/(dashboard)/recipes/[id]/page.tsx` | `src/actions/recipes.ts` | getRecipeBom for BOM display | WIRED | Import at line 3. Called at line 39. Result passed to BomPreview at lines 138-141. |
| `src/components/layout/sidebar.tsx` | `/recipes` | Navigation link | WIRED | href: "/recipes" at line 60, BookOpen icon, visible to all roles. |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| RECP-01 | 02-01, 02-02 | User can create recipes linking finished products to their ingredients | SATISFIED | RecipeIngredient model in Prisma schema links parentItem (FINISHED/SEMI_FINISHED) to childItem (RAW_MATERIAL/SEMI_FINISHED/PACKAGING). createRecipe server action with validation. RecipeForm UI with dynamic ingredient rows. |
| RECP-02 | 02-01, 02-02 | User can define multi-level recipes (finished -> semi-finished -> raw materials) | SATISFIED | explodeBom() recursively resolves SEMI_FINISHED items that have their own recipes (bom.ts lines 64-73). Circular reference detection prevents infinite loops. Detail page shows both direct ingredients and full BOM breakdown. |
| RECP-03 | 02-01, 02-02 | User can include packaging materials (cups) as recipe ingredients with quantity | SATISFIED | Dual quantity fields: quantityMg for weight-based, quantityPieces for PACKAGING. IngredientRow switches input field based on item type. BomPreview displays "pcs" for packaging, "g" for weight items. |
| RECP-04 | 02-01, 02-02 | System auto-calculates recipe cost from ingredient costs through all levels | SATISFIED | calculateRecipeCost sums explodeBom line costs. Cost computed on-demand (never stored) so it updates when ingredient costs change. Weight-based: proportional to weight used vs unit weight. Packaging: pieces * unit cost. All integer arithmetic (centavos). |
| RECP-05 | 02-02 | User can preview full BOM breakdown showing all raw materials across levels | SATISFIED | getRecipeBom calls explodeBom for full recursive resolution. BomPreview component displays all leaf-level items with quantities, costs, and total. Duplicates merged across sub-recipes. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none) | - | - | - | No anti-patterns detected. All "placeholder" matches are HTML input placeholder attributes, not code stubs. No TODO/FIXME/HACK comments. No empty implementations. No console.log-only handlers. |

### Human Verification Required

### 1. Recipe Create Flow

**Test:** Navigate to /recipes/new, select a FINISHED product, add 2-3 ingredients (mix of RAW_MATERIAL and PACKAGING), set quantities, submit.
**Expected:** Recipe saves, redirects to /recipes, new recipe appears in list with correct ingredient count and computed cost in PHP.
**Why human:** Requires live database with seeded items, Supabase auth session, and visual confirmation of form behavior.

### 2. Multi-Level BOM Resolution

**Test:** Create a SEMI_FINISHED product with a recipe (raw materials), then create a FINISHED product recipe that uses that SEMI_FINISHED product. View the FINISHED product's detail page.
**Expected:** "Direct Ingredients" shows the SEMI_FINISHED product. "Full BOM Breakdown" shows the resolved raw materials from the sub-recipe (not the SEMI_FINISHED product itself), with correct costs.
**Why human:** Requires multi-step data setup and visual verification of recursive BOM display.

### 3. Type-Aware Quantity Fields

**Test:** On the recipe form, select a PACKAGING item as ingredient, then switch to a RAW_MATERIAL item.
**Expected:** Input field switches from integer "pcs" to decimal "g" and back. Labels update accordingly.
**Why human:** Dynamic UI behavior based on dropdown selection requires visual confirmation.

### 4. Recipe Edit and Delete

**Test:** Edit an existing recipe (change quantities, add/remove ingredients). Then delete a recipe from the list.
**Expected:** Edit: parent selector is disabled, existing values pre-populated, save updates the recipe. Delete: confirmation dialog appears, recipe removed from list.
**Why human:** Pre-population of edit form values and confirmation dialog behavior need visual verification.

### 5. Sidebar Navigation Visibility

**Test:** Log in as each role (admin, staff, viewer) and check sidebar.
**Expected:** "Recipes" section with "All Recipes" link and BookOpen icon visible for all three roles.
**Why human:** Role-based visibility requires testing with different authenticated sessions.

### Gaps Summary

No gaps found. All 8 observable truths verified against actual codebase artifacts. All 5 RECP requirements (RECP-01 through RECP-05) have supporting implementations that are substantive (not stubs) and fully wired together. Key links confirmed:

- Data model (RecipeIngredient) is properly related to Item model with both parent/child directions.
- BOM engine (explodeBom, calculateRecipeCost, checkCircularReference) is imported and called by server actions.
- Server actions are imported and called by UI components.
- UI components are rendered in proper page routes.
- Sidebar navigation links to /recipes for all roles.
- TypeScript compiles cleanly with zero errors.
- All 5 task commits verified in git history.

---

_Verified: 2026-03-10T08:30:00Z_
_Verifier: Claude (gsd-verifier)_
