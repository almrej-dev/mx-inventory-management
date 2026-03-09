# Phase 2: Recipe Engine - Research

**Researched:** 2026-03-09
**Domain:** Multi-level Recipe/BOM management with recursive cost calculation (Prisma 7 + PostgreSQL + Next.js 16)
**Confidence:** HIGH

## Summary

The Recipe Engine phase requires a classic Bill of Materials (BOM) data model: a recipe links a parent item (FINISHED or SEMI_FINISHED) to its child ingredients (RAW_MATERIAL, SEMI_FINISHED, PACKAGING) with quantities. The key challenge is multi-level resolution -- a finished product can use a semi-finished product that itself has a recipe, requiring recursive traversal to produce a flat BOM and compute rolled-up costs.

The project already has a well-established Prisma 7 + Supabase stack with clear patterns: server actions for mutations, `zod/v4` schemas with `standardSchemaResolver`, react-hook-form for client forms, integer storage for costs (centavos) and weights (milligrams), and role-based access via `requireRole()`. Phase 2 must follow all these patterns exactly.

The recommended approach is an **explicit join table** (`RecipeIngredient`) linking a parent item to its child items with a `quantityMg` field (or `quantityPieces` for packaging), plus **application-level recursion** for BOM explosion and cost rollup. PostgreSQL recursive CTEs are an option for BOM explosion but Prisma's `$queryRaw` approach adds complexity and loses type safety. Since recipe trees in an ice cream/tea shop are shallow (typically 2-3 levels max), application-level recursion is simpler, testable, and sufficient.

**Primary recommendation:** Use an explicit `RecipeIngredient` join table with Prisma relations, application-level recursive BOM resolution functions in server actions, and integer-only storage (milligrams for weight, centavos for cost) consistent with Phase 1 patterns.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| RECP-01 | User can create recipes linking finished products to their ingredients | Prisma explicit many-to-many join table (`RecipeIngredient` model), recipe form with dynamic ingredient rows, server action for create/update |
| RECP-02 | User can define multi-level recipes (finished -> semi-finished -> raw materials) | Same `RecipeIngredient` model supports any item type as ingredient; semi-finished items can themselves have recipes; recursive BOM resolution function handles traversal |
| RECP-03 | User can include packaging materials (cups) as recipe ingredients with quantity | `RecipeIngredient` stores quantity in pieces for PACKAGING type items (using `quantityPieces` field or unified approach with unit type awareness) |
| RECP-04 | System auto-calculates recipe cost from ingredient costs through all levels | Recursive cost rollup function that traverses recipe tree, sums `item.costCentavos * quantity` at leaf nodes, computed on-demand (not stored) |
| RECP-05 | User can preview full BOM breakdown showing all raw materials across levels | BOM explosion function that recursively flattens recipe tree to leaf-level items, grouping duplicates and summing quantities |
</phase_requirements>

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prisma | ^7.4.2 | ORM with explicit join table for recipe-ingredient relation | Already in project; driver adapter pattern with PrismaPg |
| Next.js | 16.1.6 | Server actions for recipe CRUD, server components for data loading | Already in project |
| zod | ^4.3.6 | Recipe form validation schemas (import from `zod/v4`) | Already in project; uses standardSchemaResolver |
| react-hook-form | ^7.71.2 | Recipe creation form with dynamic ingredient rows | Already in project |
| @hookform/resolvers | ^5.2.2 | standardSchemaResolver for zod v4 integration | Already in project |
| @tanstack/react-table | ^8.21.3 | Recipe list table with sorting/filtering | Already in project |

### Supporting (already in project)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | ^0.577.0 | Icons for recipe UI (BookOpen, Plus, Trash2, ChevronRight) | Navigation, action buttons |
| shadcn/ui v4 | ^4.0.2 | UI components (Card, Table, Button, Input, Badge) | All recipe UI surfaces |
| date-fns | ^4.1.0 | Date formatting if needed | Recipe timestamps display |

### No New Dependencies Required

Phase 2 requires **zero new npm packages**. All functionality is achievable with the existing stack. The BOM explosion and cost rollup are pure application logic implemented as TypeScript utility functions.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| App-level recursion for BOM | PostgreSQL recursive CTE via `$queryRaw` | CTE is faster for very deep trees but loses Prisma type safety, adds SQL maintenance burden, and is overkill for 2-3 level recipe trees |
| Prisma TypedSQL for raw queries | `$queryRaw` tagged templates | TypedSQL has known issues on Prisma 7 with driver adapters; not worth the risk |
| Storing computed cost in recipe | Computing on-demand | Stored cost gets stale when ingredient prices change; on-demand ensures RECP-04 requirement that "cost updates when ingredient costs change" |

## Architecture Patterns

### Recommended Project Structure
```
src/
├── schemas/
│   └── recipe.ts              # Zod schema for recipe form validation
├── actions/
│   └── recipes.ts             # Server actions: createRecipe, updateRecipe, deleteRecipe, getRecipes, getRecipe
├── lib/
│   └── bom.ts                 # BOM explosion + cost rollup pure functions
├── components/
│   └── recipes/
│       ├── recipe-form.tsx     # Client form with dynamic ingredient rows
│       ├── recipe-table.tsx    # Recipe list with TanStack Table
│       ├── recipe-columns.tsx  # Column definitions
│       ├── bom-preview.tsx     # BOM breakdown display component
│       └── ingredient-row.tsx  # Single ingredient row in recipe form
├── app/(dashboard)/
│   └── recipes/
│       ├── page.tsx            # Recipe list page (server component)
│       ├── new/
│       │   └── page.tsx        # Create recipe page
│       └── [id]/
│           ├── page.tsx        # Recipe detail with BOM preview
│           └── edit/
│               ├── page.tsx    # Edit recipe page (server component)
│               └── edit-client.tsx  # Edit form wrapper (client component)
```

### Pattern 1: Explicit Join Table for Recipe Ingredients
**What:** A `RecipeIngredient` model that connects a parent item to its ingredient items with quantity metadata.
**When to use:** Always for recipe-ingredient relationships. This is the only correct pattern for storing quantity-per-ingredient.
**Prisma Schema:**
```prisma
model RecipeIngredient {
  id             Int   @id @default(autoincrement())
  parentItemId   Int   @map("parent_item_id")
  childItemId    Int   @map("child_item_id")
  quantityMg     Int   @map("quantity_mg")      // Weight in mg for RM/SF, 0 for packaging
  quantityPieces Int   @default(0) @map("quantity_pieces")  // Piece count for PACKAGING, 0 for others

  parentItem Item @relation("RecipeParent", fields: [parentItemId], references: [id])
  childItem  Item @relation("RecipeChild", fields: [childItemId], references: [id])

  @@unique([parentItemId, childItemId])
  @@map("recipe_ingredients")
}
```
The Item model gets two new relation fields:
```prisma
model Item {
  // ... existing fields ...
  recipeIngredients  RecipeIngredient[] @relation("RecipeParent")  // This item's recipe (ingredients list)
  usedInRecipes      RecipeIngredient[] @relation("RecipeChild")   // Recipes that use this item
}
```

### Pattern 2: Application-Level BOM Explosion
**What:** A recursive TypeScript function that resolves a recipe tree into a flat list of leaf-level raw materials and packaging.
**When to use:** For RECP-05 (BOM preview) and RECP-04 (cost calculation).
**Example:**
```typescript
// Source: Application pattern for shallow recipe trees
interface BomLine {
  itemId: number;
  itemName: string;
  itemSku: string;
  itemType: ItemTypeValue;
  quantityMg: number;        // Total mg needed (0 for packaging)
  quantityPieces: number;    // Total pieces needed (0 for weight items)
  unitCostCentavos: number;  // Per-unit cost from item
  lineCostCentavos: number;  // Computed: unitCost * quantity
}

async function explodeBom(
  parentItemId: number,
  multiplier: number = 1,
  visited: Set<number> = new Set()
): Promise<BomLine[]> {
  // Circular reference guard
  if (visited.has(parentItemId)) {
    throw new Error(`Circular recipe detected for item ${parentItemId}`);
  }
  visited.add(parentItemId);

  const ingredients = await prisma.recipeIngredient.findMany({
    where: { parentItemId },
    include: {
      childItem: {
        select: { id: true, name: true, sku: true, type: true, costCentavos: true }
      }
    }
  });

  const lines: BomLine[] = [];

  for (const ing of ingredients) {
    const child = ing.childItem;

    // If child has its own recipe (SEMI_FINISHED), recurse
    if (child.type === 'SEMI_FINISHED') {
      const hasRecipe = await prisma.recipeIngredient.count({
        where: { parentItemId: child.id }
      });
      if (hasRecipe > 0) {
        // For weight-based items, multiply through the recipe tree
        const childMultiplier = ing.quantityMg; // mg of semi-finished needed
        // Need to compute ratio: quantityMg of SF needed / SF recipe yield
        const subLines = await explodeBom(child.id, multiplier, new Set(visited));
        // Scale sub-lines by how much of the SF we need
        lines.push(...subLines.map(line => ({
          ...line,
          quantityMg: Math.round(line.quantityMg * (ing.quantityMg / 1000)), // scale by parent's need
          lineCostCentavos: 0 // recalculated after
        })));
        continue;
      }
    }

    // Leaf node: raw material or packaging (or SF without recipe)
    lines.push({
      itemId: child.id,
      itemName: child.name,
      itemSku: child.sku,
      itemType: child.type as ItemTypeValue,
      quantityMg: ing.quantityMg * multiplier,
      quantityPieces: ing.quantityPieces * multiplier,
      unitCostCentavos: child.costCentavos,
      lineCostCentavos: 0 // calculated separately
    });
  }

  return lines;
}
```

### Pattern 3: Dynamic Ingredient Rows in Form
**What:** The recipe form allows adding/removing ingredient rows dynamically using `useFieldArray` from react-hook-form.
**When to use:** Recipe create and edit forms.
**Example:**
```typescript
// Source: react-hook-form useFieldArray pattern
import { useFieldArray, useForm } from "react-hook-form";

const { control, register, handleSubmit } = useForm<RecipeFormData>({
  resolver: standardSchemaResolver(recipeSchema),
  defaultValues: {
    parentItemId: 0,
    ingredients: [{ childItemId: 0, quantityMg: 0, quantityPieces: 0 }]
  }
});

const { fields, append, remove } = useFieldArray({
  control,
  name: "ingredients"
});
```

### Pattern 4: On-Demand Cost Calculation
**What:** Recipe cost is never stored -- it is computed by summing ingredient costs through the BOM tree whenever displayed.
**When to use:** Every time recipe cost is shown (list page, detail page, BOM preview).
**Why:** RECP-04 requires "cost updates when ingredient costs change." Storing computed cost would require invalidation logic when any ingredient's `costCentavos` changes.

### Anti-Patterns to Avoid
- **Storing computed recipe cost in the database:** Creates stale data when ingredient prices change. Violates RECP-04.
- **Using Prisma implicit many-to-many:** Cannot store quantity metadata on the relation. Must use explicit join table.
- **Deep Prisma `include` nesting for recursion:** Prisma does not support recursive includes. Each level must be a separate query or use `$queryRaw`.
- **Allowing FINISHED items as ingredients:** Only RAW_MATERIAL, SEMI_FINISHED, and PACKAGING should be valid ingredient types. A FINISHED product should never be an ingredient in another recipe.
- **Circular recipes:** A -> B -> A must be detected and prevented at creation time.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Form field arrays | Custom state management for dynamic rows | `useFieldArray` from react-hook-form | Handles add/remove/reorder, integrates with validation, avoids re-render bugs |
| Number formatting for cost display | Custom toFixed/parseFloat | Existing `centavosToPesos` / `mgToGrams` from `@/lib/utils` | Already established pattern, consistent with Phase 1 |
| Data table for recipe list | Custom table component | `@tanstack/react-table` with existing `item-table.tsx` pattern | Already in project, handles sorting/filtering |
| Form validation | Manual validation logic | `zod/v4` schema + `standardSchemaResolver` | Already established pattern from Phase 1 |

**Key insight:** Phase 2 introduces no new libraries. Every UI pattern has a Phase 1 precedent. The novel work is the data model (join table), the BOM resolution logic (pure functions), and the circular reference detection.

## Common Pitfalls

### Pitfall 1: Circular Recipe References
**What goes wrong:** User creates Recipe A using B, then edits B to use A. System enters infinite recursion on BOM explosion.
**Why it happens:** No validation prevents circular dependencies at create/update time.
**How to avoid:** Before saving a recipe, run a cycle detection check. Walk the ingredient tree of each child item to verify the parent item does not appear. Use a visited set.
**Warning signs:** Stack overflow errors, browser hanging on recipe detail page.

### Pitfall 2: Dual Quantity Units (Weight vs Pieces)
**What goes wrong:** Mixing up milligram quantities with piece quantities for packaging items, leading to nonsensical BOM outputs like "500mg of 16oz Cup."
**Why it happens:** The project uses milligrams for weight-based items but pieces for packaging. The recipe ingredient table must handle both.
**How to avoid:** Use two quantity fields: `quantityMg` (for RAW_MATERIAL and SEMI_FINISHED) and `quantityPieces` (for PACKAGING). Validate in schema that exactly one is non-zero based on child item type. Display the correct unit in the UI.
**Warning signs:** BOM preview showing milligram values for packaging items.

### Pitfall 3: Stale Cost Display
**What goes wrong:** Recipe cost shown in list doesn't match ingredient costs because it was cached or stored.
**Why it happens:** Temptation to store computed cost for performance.
**How to avoid:** Always compute cost on-demand by traversing the recipe tree. For list pages where computing every recipe's cost is expensive, compute costs in a single batch query.
**Warning signs:** Recipe cost not matching manual calculation of ingredient costs.

### Pitfall 4: N+1 Queries in Recipe List
**What goes wrong:** Loading a recipe list page triggers hundreds of database queries -- one per recipe to compute its cost.
**Why it happens:** Naive implementation computes cost per recipe in a loop.
**How to avoid:** For the recipe list, fetch all recipe ingredients with their item costs in a single query using Prisma includes, then compute costs in memory. Use `prisma.recipeIngredient.findMany({ include: { childItem: true } })` to batch-load all ingredient costs.
**Warning signs:** Slow page loads, many SQL queries in dev logs.

### Pitfall 5: Forgetting to Filter Deleted Items from Ingredient Selection
**What goes wrong:** Soft-deleted items appear as ingredient options in recipe form.
**Why it happens:** The ingredient selector query doesn't filter `deletedAt: null`.
**How to avoid:** Always include `where: { deletedAt: null }` when fetching items for the ingredient dropdown, same as `getActiveItems()` in stock actions.
**Warning signs:** Deleted items appearing in ingredient dropdowns.

### Pitfall 6: Recipe Orphaning on Item Deletion
**What goes wrong:** User soft-deletes an item that is used as an ingredient in recipes. BOM explosion fails or shows deleted ingredient.
**Why it happens:** No validation check before item deletion.
**How to avoid:** Either prevent deletion of items used in recipes (show error), or handle gracefully in BOM display (show warning badge). Recommend: prevent deletion, show a message listing which recipes use the item.
**Warning signs:** Broken recipe detail pages after item deletion.

### Pitfall 7: Prisma `$queryRaw` Type Safety Loss
**What goes wrong:** Using raw SQL for BOM explosion but getting runtime type errors from untyped results.
**Why it happens:** `$queryRaw` returns `unknown[]` by default. Prisma TypedSQL has known issues on v7.
**How to avoid:** Use application-level recursion with typed Prisma queries instead of raw SQL. If raw SQL is absolutely needed, define explicit TypeScript interfaces for the result shape and validate with zod.
**Warning signs:** Type assertion (`as`) scattered throughout BOM code.

## Code Examples

Verified patterns from the existing codebase:

### Server Action Pattern (from Phase 1)
```typescript
// Source: src/actions/items.ts
"use server";

import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recipeSchema } from "@/schemas/recipe";
import { revalidatePath } from "next/cache";

export async function createRecipe(rawData: unknown) {
  try {
    await requireRole("staff");
  } catch {
    return { error: { _form: ["Unauthorized"] } };
  }

  const parsed = recipeSchema.safeParse(rawData);
  if (!parsed.success) {
    // ... field error extraction pattern from items.ts
  }

  // Circular reference check before saving
  // ... cycle detection logic

  // Create recipe ingredients in a transaction
  await prisma.$transaction(async (tx) => {
    // Delete existing ingredients (for upsert behavior)
    await tx.recipeIngredient.deleteMany({
      where: { parentItemId: parsed.data.parentItemId }
    });

    // Create new ingredients
    await tx.recipeIngredient.createMany({
      data: parsed.data.ingredients.map(ing => ({
        parentItemId: parsed.data.parentItemId,
        childItemId: ing.childItemId,
        quantityMg: ing.quantityMg,
        quantityPieces: ing.quantityPieces,
      }))
    });
  });

  revalidatePath("/recipes");
  return { success: true };
}
```

### Zod Schema Pattern (from Phase 1)
```typescript
// Source: Pattern from src/schemas/item.ts adapted for recipes
import { z } from "zod/v4";

const ingredientLineSchema = z.object({
  childItemId: z.number().int().positive("Select an ingredient"),
  quantityMg: z.number().int().nonnegative("Quantity cannot be negative"),
  quantityPieces: z.number().int().nonnegative("Quantity cannot be negative"),
});

export const recipeSchema = z.object({
  parentItemId: z.number().int().positive("Select a product"),
  ingredients: z.array(ingredientLineSchema).min(1, "At least one ingredient required"),
});

export type RecipeFormData = z.infer<typeof recipeSchema>;
```

### Server Component Data Loading Pattern (from Phase 1)
```typescript
// Source: Pattern from src/app/(dashboard)/items/page.tsx
import { getRecipes } from "@/actions/recipes";

export default async function RecipesPage() {
  const result = await getRecipes();

  if (result.error) {
    return <p className="text-sm text-destructive">Error: {result.error}</p>;
  }

  return <RecipeTable data={result.recipes || []} />;
}
```

### Edit Page Server/Client Split Pattern (from Phase 1)
```typescript
// Source: Pattern from src/app/(dashboard)/items/[id]/edit/page.tsx
import { notFound } from "next/navigation";
import { getRecipe } from "@/actions/recipes";
import { EditRecipeClient } from "./edit-client";

export default async function EditRecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const itemId = parseInt(id, 10);
  if (isNaN(itemId)) notFound();

  const recipe = await getRecipe(itemId);
  if (!recipe) notFound();

  return <EditRecipeClient recipe={recipe} />;
}
```

### Sidebar Navigation Extension
```typescript
// Add to src/components/layout/sidebar.tsx navigation array
import { BookOpen } from "lucide-react";

// Add after "Items" entry:
{
  label: "Recipes",
  roles: ["admin", "staff", "viewer"],
  items: [
    {
      name: "All Recipes",
      href: "/recipes",
      icon: BookOpen,
      roles: ["admin", "staff", "viewer"],
    },
  ],
},
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Prisma implicit m-n | Explicit join table with metadata fields | Always for BOM | Explicit is required when relation needs quantity data |
| Stored computed costs | On-demand cost computation | Best practice | Eliminates cache invalidation complexity |
| Database-level recursion (CTE) | App-level recursion for shallow trees | Depends on depth | For 2-3 level trees, app-level is simpler and more maintainable |
| Prisma TypedSQL for raw queries | `$queryRaw` tagged templates | Prisma 7 | TypedSQL has driver adapter issues on Prisma 7 |

**Deprecated/outdated:**
- Prisma TypedSQL on Prisma 7 with driver adapters: Known issues with `generate --sql` failing. Avoid for now.
- `zodResolver` from `@hookform/resolvers`: Must use `standardSchemaResolver` with zod v4 (decision from Phase 1).

## Open Questions

1. **Quantity semantics for semi-finished ingredients**
   - What we know: When a finished product uses a semi-finished product, we need to know "how much" of the SF to use. The SF's own recipe produces some yield amount.
   - What's unclear: Should `quantityMg` represent the amount of SF consumed, with the assumption that the SF recipe defines how to make it? Or should we track yield explicitly?
   - Recommendation: Keep it simple. `quantityMg` on the RecipeIngredient means "how many milligrams of this ingredient are needed to make one unit of the parent." The SF's recipe then tells us what raw materials are needed for that amount. For the BOM explosion, the ratio is: `(quantityMg needed) / (SF recipe total yield)` applied to each SF ingredient. **However, since we do not track yield per recipe, the simpler approach is to define the SF recipe as "what you need to make one unit/batch" and the parent recipe specifies how many units/batches of SF it needs.** This avoids yield tracking entirely and matches the ice cream shop mental model: "1 serving of matcha latte uses 30ml of matcha syrup, and the matcha syrup recipe makes 1 batch."

2. **Recipe versioning**
   - What we know: Requirements do not mention recipe versions or history.
   - What's unclear: Whether editing a recipe should create a new version or modify in place.
   - Recommendation: Modify in place (upsert pattern). Recipe versioning is out of scope for v1. The delete-and-recreate-ingredients approach in a transaction is cleanest.

3. **One recipe per item vs multiple recipes**
   - What we know: Requirements say "create a recipe for a finished product" (singular).
   - What's unclear: Can one item have multiple recipes (e.g., different batch sizes)?
   - Recommendation: One recipe per item. The `@@unique([parentItemId, childItemId])` constraint enforces this naturally. The `parentItemId` effectively IS the recipe identifier.

## RLS Policies for Recipe Data

The `recipe_ingredients` table needs RLS policies matching the pattern from `00001_rbac_setup.sql`:

```sql
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read recipes (viewer+)
CREATE POLICY "recipe_ingredients_select" ON public.recipe_ingredients
  FOR SELECT TO authenticated
  USING ((SELECT public.authorize('viewer')));

-- Staff and admin can insert recipe ingredients
CREATE POLICY "recipe_ingredients_insert" ON public.recipe_ingredients
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.authorize('staff')));

-- Staff and admin can update recipe ingredients
CREATE POLICY "recipe_ingredients_update" ON public.recipe_ingredients
  FOR UPDATE TO authenticated
  USING ((SELECT public.authorize('staff')));

-- Staff and admin can delete recipe ingredients (needed for recipe updates)
CREATE POLICY "recipe_ingredients_delete" ON public.recipe_ingredients
  FOR DELETE TO authenticated
  USING ((SELECT public.authorize('staff')));
```

## Sources

### Primary (HIGH confidence)
- Prisma official docs: [Many-to-many relations](https://www.prisma.io/docs/orm/prisma-schema/data-model/relations/many-to-many-relations) - explicit join table pattern with metadata fields
- Prisma official docs: [Self-relations](https://www.prisma.io/docs/orm/prisma-schema/data-model/relations/self-relations) - self-referencing model patterns
- Prisma official docs: [Raw queries](https://www.prisma.io/docs/orm/prisma-client/using-raw-sql/raw-queries) - `$queryRaw` tagged template syntax for PostgreSQL
- Existing codebase: `src/actions/items.ts`, `src/actions/stock.ts`, `src/schemas/item.ts`, `prisma/schema.prisma` - Phase 1 established patterns

### Secondary (MEDIUM confidence)
- Prisma GitHub Issue [#3725](https://github.com/prisma/prisma/issues/3725) - confirms no native recursive include support, validates app-level recursion approach
- Prisma GitHub Issue [#28717](https://github.com/prisma/prisma/issues/28717) - TypedSQL fails on Prisma 7 with pooling, validates avoiding TypedSQL
- [BOM Explosion with SQL (Medium)](https://medium.com/@and.h/bom-explosion-with-sql-the-sap-approach-that-works-anywhere-5913c952fc2f) - recursive CTE pattern for BOM cost rollup

### Tertiary (LOW confidence)
- General BOM cost rollup practices from manufacturing ERP systems - direction matters (leaf-to-root for cost, root-to-leaf for explosion)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Zero new dependencies, all patterns established in Phase 1 codebase
- Architecture: HIGH - Explicit join table is the only correct Prisma pattern for quantity-carrying relations; application-level recursion well-suited for shallow trees
- Pitfalls: HIGH - Circular references, dual units, N+1 queries are well-known BOM problems with clear solutions
- BOM quantity semantics: MEDIUM - The "one recipe = one batch" mental model is a simplification that works for ice cream/tea but may need revisiting for complex manufacturing

**Research date:** 2026-03-09
**Valid until:** 2026-04-09 (30 days - stable domain, no fast-moving dependencies)
