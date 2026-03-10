# Phase 5: Accuracy and Polish - Research

**Researched:** 2026-03-10
**Domain:** Inventory accuracy -- waste recording, physical count reconciliation, audit trail
**Confidence:** HIGH

## Summary

Phase 5 completes the stock management module by adding waste/spoilage recording (STCK-03) and physical inventory reconciliation (STCK-04). The existing codebase already has comprehensive infrastructure for this: the `InventoryTransaction` ledger model includes `WASTE` and `ADJUSTMENT` transaction types (already defined in the Prisma enum), the `TransactionTypeValue` union in `src/types/index.ts` already includes both, and the transaction history page already has badge styles for both types. The stock receiving form and sales deduction logic provide a proven atomic ledger pattern (`prisma.$transaction` wrapping ledger insert + `stockQty` increment/decrement) that waste and reconciliation must follow identically.

The primary work is: (1) a waste recording form with reason codes and its server action, (2) a physical count / reconciliation page that compares user-entered counts against system levels and writes ADJUSTMENT entries for discrepancies, and (3) sidebar navigation additions for both pages. No schema migration is needed -- the existing `InventoryTransaction` model already supports `WASTE` and `ADJUSTMENT` types with `notes` for reason codes and `createdBy` for user attribution. The `referenceId` field provides batch grouping for reconciliation events.

**Primary recommendation:** Follow the exact atomic ledger pattern from `receiveStock` and `processSalesLines` -- all stock mutations go through `prisma.$transaction` that atomically writes a ledger entry and adjusts `stockQty`. Reason codes should be application-level constants (not a separate table), stored in the `notes` field with a structured prefix.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| STCK-03 | User can record waste/spoilage with reason codes | Existing `WASTE` transaction type in Prisma enum; atomic ledger pattern from `receiveStock`; reason codes as app constants stored in `notes` field; new waste form + server action |
| STCK-04 | User can enter physical counts and view variance against system levels | Existing `ADJUSTMENT` transaction type in Prisma enum; compare entered count vs `stockQty`; batch `referenceId` groups all adjustments from one reconciliation; variance display before confirmation |
</phase_requirements>

## Standard Stack

### Core (already installed -- no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.6 | App Router, server components, server actions | Already in use |
| Prisma | 7.4.2 | ORM with `$transaction` for atomic ledger writes | Already in use |
| zod | 4.3.6 (via `zod/v4`) | Form and server action validation | Already in use |
| react-hook-form | 7.71.2 | Client-side form state management | Already in use |
| @hookform/resolvers | 5.2.2 | `standardSchemaResolver` for zod v4 | Already in use |
| date-fns | 4.1.0 | Date formatting in transaction displays | Already in use |
| lucide-react | 0.577.0 | Icons for nav items, badges | Already in use |

### Supporting (already installed)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn/ui (v4) | 4.0.2 | UI components (Button, Input, Label, Table, Badge, Card) | All form and display elements |
| @base-ui/react | 1.2.0 | Base UI primitives underneath shadcn v4 | Render prop pattern for Popover/Dialog if needed |

### Alternatives Considered

None. This phase uses exclusively existing stack components. No new libraries needed.

**Installation:**
```bash
# No new installations required
```

## Architecture Patterns

### Recommended Project Structure (new files only)

```
src/
  actions/
    stock.ts              # ADD: recordWaste(), getItemsForReconciliation(), submitReconciliation()
  schemas/
    stock.ts              # ADD: wasteSchema, reconciliationSchema
  app/(dashboard)/stock/
    waste/
      page.tsx            # Waste recording page (server component)
    reconciliation/
      page.tsx            # Physical count entry page (server component)
      reconciliation-client.tsx  # Client form with variance display
  components/stock/
    waste-form.tsx         # Client waste recording form
    reconciliation-form.tsx # Client reconciliation form with variance preview
  lib/
    constants.ts           # ADD: WASTE_REASON_CODES array
```

### Pattern 1: Atomic Ledger Transaction (ESTABLISHED)

**What:** Every stock mutation wraps a ledger insert + stockQty update in a single `prisma.$transaction`
**When to use:** ALL stock changes -- waste, adjustments, receives, deductions
**Why critical:** The `stockQty` field is a denormalized cache of the ledger. If they diverge, the entire system is inconsistent.

```typescript
// Source: src/actions/stock.ts (receiveStock pattern)
await prisma.$transaction([
  prisma.inventoryTransaction.create({
    data: {
      itemId: data.itemId,
      type: "WASTE",           // or "ADJUSTMENT"
      quantity: -wasteQty,     // negative for waste
      referenceId: `WST-${Date.now()}`,
      notes: `${reasonCode}: ${optionalNotes}`,
      createdBy: user.id,
    },
  }),
  prisma.item.update({
    where: { id: data.itemId },
    data: {
      stockQty: { decrement: wasteQty },
    },
  }),
]);
```

### Pattern 2: Server Component Page + Client Form Component (ESTABLISHED)

**What:** Page is a server component that loads initial data, passes it as props to a client form component
**When to use:** All form pages in this project

```typescript
// Source: src/app/(dashboard)/stock/receiving/page.tsx pattern
// page.tsx (server component)
export default async function WastePage() {
  const items = await prisma.item.findMany({ where: { deletedAt: null }, ... });
  return <WasteForm items={items} />;
}

// waste-form.tsx (client component)
"use client";
export function WasteForm({ items }: { items: ItemOption[] }) {
  const { register, handleSubmit, ... } = useForm<WasteFormData>({
    resolver: standardSchemaResolver(wasteSchema),
  });
  // ...
}
```

### Pattern 3: Reason Codes as Application Constants (RECOMMENDED)

**What:** Waste reason codes defined as a constant array in `src/lib/constants.ts`, stored as text prefix in `notes` field
**When to use:** When reason codes are a fixed, small set that does not need CRUD management

```typescript
// src/lib/constants.ts
export const WASTE_REASON_CODES = [
  { value: "EXPIRED", label: "Expired" },
  { value: "SPOILED", label: "Spoiled / Contaminated" },
  { value: "DAMAGED", label: "Damaged" },
  { value: "QUALITY", label: "Quality Issue" },
  { value: "SPILL",   label: "Spilled / Dropped" },
  { value: "OTHER",   label: "Other" },
] as const;
```

**Why not a separate DB table:** The ice cream/tea shop domain has a small, stable set of waste reasons. A database table adds unnecessary complexity (CRUD UI, foreign keys, joins) for what is effectively an enum.

### Pattern 4: Reconciliation as Batch Adjustments (RECOMMENDED)

**What:** Physical count reconciliation compares all items, shows variance, and creates one ADJUSTMENT ledger entry per discrepant item, all in a single transaction
**When to use:** The reconciliation page

```typescript
// Reconciliation flow:
// 1. Load all active items with current stockQty
// 2. User enters physical count for each item
// 3. UI shows variance (physicalCount - systemCount) for each
// 4. On submit, create one ADJUSTMENT entry per discrepant item
// 5. All writes in a single prisma.$transaction

const batchRefId = `RECON-${Date.now()}`;

await prisma.$transaction(
  adjustments.map(adj => [
    prisma.inventoryTransaction.create({
      data: {
        itemId: adj.itemId,
        type: "ADJUSTMENT",
        quantity: adj.varianceQty, // positive if physical > system, negative if less
        referenceId: batchRefId,
        notes: `Reconciliation: system ${adj.systemQty}, counted ${adj.physicalQty}`,
        createdBy: user.id,
      },
    }),
    prisma.item.update({
      where: { id: adj.itemId },
      data: { stockQty: adj.physicalQty }, // SET to physical count, not increment
    }),
  ]).flat()
);
```

**Important:** For reconciliation, use `stockQty: adj.physicalQty` (absolute SET) rather than increment/decrement, since we know the true count. But the ledger entry records the delta for audit trail.

### Pattern 5: Quantity Unit Handling (ESTABLISHED)

**What:** Items have different stock unit semantics depending on type
**Critical rule:**
- `PACKAGING` items: `stockQty` is in **pieces**
- All other items: `stockQty` is in **milligrams**

The waste form and reconciliation form MUST handle unit conversion:
- Waste form: user enters waste quantity in user-friendly units (grams for weight items, pieces for packaging), server action converts to storage units
- Reconciliation form: show system levels in display units, accept physical counts in display units, convert to storage units for comparison and adjustment

### Anti-Patterns to Avoid

- **Modifying stockQty without a ledger entry:** NEVER update `stockQty` outside a `$transaction` that also writes an `InventoryTransaction` row. This breaks the append-only audit trail.
- **Using interactive $transaction when batch is sufficient:** The reconciliation writes are independent per item -- use `prisma.$transaction([...])` (batch array) not `prisma.$transaction(async (tx) => {...})` (interactive). Batch is simpler and sufficient since no read-then-write dependency exists within the transaction.
- **Storing reason codes in a separate table:** For this scale (single ice cream/tea shop), a constants array is simpler and avoids unnecessary CRUD.
- **Assuming positive quantity for waste:** Waste quantities in the ledger MUST be negative (they reduce stock). The receiving pattern uses positive (adds stock), sales use negative (removes stock). Waste follows the sales sign convention.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Form validation | Custom validation logic | zod v4 schema + standardSchemaResolver | Existing validated pattern with proper error messages |
| Atomic stock updates | Manual SQL or separate queries | `prisma.$transaction([...])` | Guaranteed atomicity; established project pattern |
| Date formatting | Custom date string manipulation | `date-fns format()` | Already used throughout (transaction history, reports) |
| Transaction type badges | Custom badge rendering | Existing `TRANSACTION_TYPE_STYLES` map in stock history | WASTE and ADJUSTMENT styles already defined and styled |
| Unit conversion display | Inline math | `mgToGrams()` / `gramsToMg()` from `src/lib/utils.ts` | Established utility functions used project-wide |

**Key insight:** Phase 5 is almost entirely about applying established patterns to two new forms. The infrastructure (schema, types, display, ledger) is already in place. The risk is not technical complexity but deviating from established patterns.

## Common Pitfalls

### Pitfall 1: Quantity Sign Convention Mismatch
**What goes wrong:** Waste creates positive ledger entries or adjustments use wrong sign, causing stockQty to increase instead of decrease
**Why it happens:** The receiving pattern uses positive quantities (adding stock), and developers may copy that pattern without flipping the sign
**How to avoid:** Waste entries: quantity is ALWAYS negative. Adjustment entries: quantity is (physicalCount - systemCount), which can be positive or negative. The `stockQty` increment/decrement must match the ledger quantity sign.
**Warning signs:** Stock levels go up after recording waste; reconciliation adjustments move stock in the wrong direction

### Pitfall 2: Reconciliation Race Condition
**What goes wrong:** Between loading current stock levels and submitting the reconciliation, other transactions change stockQty, making the variance calculation stale
**Why it happens:** Time gap between displaying variance and submitting adjustment
**How to avoid:** On submit, re-read current stockQty inside the transaction and recalculate variance. OR accept this as a known limitation (suitable for a single-shop system where reconciliation is done at closing time when no other data entry is happening). For this project scale, the simpler approach (no re-read) is acceptable if documented.
**Warning signs:** Variance displayed doesn't match the ledger entry after the fact

### Pitfall 3: Unit Conversion in Reconciliation Form
**What goes wrong:** User enters physical count in grams but system stores milligrams, causing massive variance
**Why it happens:** The reconciliation form must display and accept user-friendly units while the database stores storage units
**How to avoid:** Display current system levels in grams/pieces. Accept physical count input in the same display units. Convert to storage units (mg/pieces) before comparing and writing to DB. Use the established `gramsToMg()` / `mgToGrams()` helpers.
**Warning signs:** Adjustments are 1000x too large (grams vs milligrams confusion)

### Pitfall 4: Reconciliation Sets stockQty Absolutely, Not Incrementally
**What goes wrong:** Using `{ increment: variance }` instead of setting `stockQty` to the physical count
**Why it happens:** Other patterns (receiving, waste) use increment/decrement
**How to avoid:** Reconciliation is different -- the physical count IS the truth. Use `{ stockQty: physicalCountInStorageUnits }` for the item update. The ledger entry records the variance (delta) for audit purposes.
**Warning signs:** Stock level after reconciliation does not equal the physical count entered

### Pitfall 5: Missing revalidatePath Calls
**What goes wrong:** Stock levels on dashboard/item list don't update after waste or reconciliation
**Why it happens:** Forgetting to revalidate affected pages after mutations
**How to avoid:** After any stock mutation, revalidate: `/stock/history`, `/stock/waste`, `/stock/reconciliation`, `/items`, and `/` (dashboard)
**Warning signs:** Dashboard shows stale data after recording waste or completing reconciliation

### Pitfall 6: Zod v4 with standardSchemaResolver
**What goes wrong:** Using `zodResolver` instead of `standardSchemaResolver` causes type errors
**Why it happens:** zod v4 requires the standard schema resolver; zodResolver is only for zod v3
**How to avoid:** Import from `@hookform/resolvers/standard-schema` and use `standardSchemaResolver(schema)` as established in all other forms
**Warning signs:** TypeScript errors about schema type mismatch in form resolver

## Code Examples

### Waste Recording Server Action

```typescript
// src/actions/stock.ts (addition)
// Follows receiveStock pattern exactly

export async function recordWaste(rawData: unknown) {
  const { user } = await requireRole("staff");

  const parsed = wasteSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: "Validation failed. Please check your input." };
  }

  const data = parsed.data;

  const item = await prisma.item.findUnique({
    where: { id: data.itemId },
  });

  if (!item || item.deletedAt !== null) {
    return { error: "Item not found" };
  }

  // Convert user-friendly units to storage units
  let wasteQty: number;
  if (item.type === "PACKAGING") {
    wasteQty = data.quantity; // already in pieces
  } else {
    wasteQty = gramsToMg(data.quantity); // user enters grams, store mg
  }

  const referenceId = `WST-${Date.now()}`;

  await prisma.$transaction([
    prisma.inventoryTransaction.create({
      data: {
        itemId: data.itemId,
        type: "WASTE",
        quantity: -wasteQty, // NEGATIVE -- waste removes stock
        referenceId,
        notes: `[${data.reasonCode}] ${data.notes || ""}`.trim(),
        createdBy: user.id,
      },
    }),
    prisma.item.update({
      where: { id: data.itemId },
      data: { stockQty: { decrement: wasteQty } },
    }),
  ]);

  revalidatePath("/stock/waste");
  revalidatePath("/stock/history");
  revalidatePath("/items");
  revalidatePath("/");

  return { success: true };
}
```

### Waste Form Schema

```typescript
// src/schemas/stock.ts (addition)
import { z } from "zod/v4";

export const wasteSchema = z.object({
  itemId: z.number().int().positive("Select an item"),
  quantity: z.number().positive("Quantity must be positive"),
  reasonCode: z.string().min(1, "Select a reason"),
  notes: z.string().max(500).optional(),
});

export type WasteFormData = z.infer<typeof wasteSchema>;
```

### Reconciliation Server Action

```typescript
// src/actions/stock.ts (addition)

export async function submitReconciliation(rawData: unknown) {
  const { user } = await requireRole("staff");

  const parsed = reconciliationSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: "Validation failed." };
  }

  const data = parsed.data;
  const batchRefId = `RECON-${Date.now()}`;

  // Load current items to compare
  const itemIds = data.counts.map(c => c.itemId);
  const items = await prisma.item.findMany({
    where: { id: { in: itemIds } },
    select: { id: true, type: true, stockQty: true },
  });
  const itemMap = new Map(items.map(i => [i.id, i]));

  // Build transaction operations for discrepant items only
  const ops = [];

  for (const count of data.counts) {
    const item = itemMap.get(count.itemId);
    if (!item) continue;

    // Convert physical count to storage units
    const physicalStorageQty = item.type === "PACKAGING"
      ? count.physicalCount
      : gramsToMg(count.physicalCount);

    const variance = physicalStorageQty - item.stockQty;
    if (variance === 0) continue; // No discrepancy

    ops.push(
      prisma.inventoryTransaction.create({
        data: {
          itemId: count.itemId,
          type: "ADJUSTMENT",
          quantity: variance,
          referenceId: batchRefId,
          notes: data.notes
            ? `Reconciliation: ${data.notes}`
            : "Physical count reconciliation",
          createdBy: user.id,
        },
      }),
      prisma.item.update({
        where: { id: count.itemId },
        data: { stockQty: physicalStorageQty }, // SET to physical truth
      })
    );
  }

  if (ops.length === 0) {
    return { success: true, message: "No discrepancies found." };
  }

  await prisma.$transaction(ops);

  revalidatePath("/stock/reconciliation");
  revalidatePath("/stock/history");
  revalidatePath("/items");
  revalidatePath("/");

  return { success: true };
}
```

### Reconciliation Schema

```typescript
// src/schemas/stock.ts (addition)

export const reconciliationCountSchema = z.object({
  itemId: z.number().int().positive(),
  physicalCount: z.number().nonnegative("Count cannot be negative"),
});

export const reconciliationSchema = z.object({
  counts: z.array(reconciliationCountSchema).min(1, "Enter at least one count"),
  notes: z.string().max(500).optional(),
});

export type ReconciliationFormData = z.infer<typeof reconciliationSchema>;
```

### Sidebar Navigation Additions

```typescript
// Add to Stock section in src/components/layout/sidebar.tsx
// New icons needed: Trash2 (waste), ClipboardCheck (reconciliation)
{
  label: "Stock",
  roles: ["admin", "staff", "viewer"],
  items: [
    { name: "Receiving", href: "/stock/receiving", icon: ClipboardList, roles: ["admin", "staff"] },
    { name: "Waste", href: "/stock/waste", icon: Trash2, roles: ["admin", "staff"] },
    { name: "Reconciliation", href: "/stock/reconciliation", icon: ClipboardCheck, roles: ["admin", "staff"] },
    { name: "History", href: "/stock/history", icon: History, roles: ["admin", "staff", "viewer"] },
  ],
},
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate waste_events table | Unified transaction ledger with type enum | Already established in Phase 1 | Single source of truth for all stock movements |
| Reason code lookup table | Application-level constants | N/A (design choice) | Simpler for small fixed sets; no CRUD needed |
| Manual stock correction (edit stockQty directly) | Reconciliation via ADJUSTMENT ledger entry | Already established in Phase 1 | Full audit trail; stockQty is always derivable from ledger |

**Deprecated/outdated:**
- Nothing deprecated. This phase extends an established, well-designed pattern.

## Open Questions

1. **Reconciliation scope: all items or filtered subset?**
   - What we know: A full reconciliation of all active items could involve 50-200 items. User may want to reconcile just a category or subset.
   - What's unclear: Whether the user will typically do full counts or spot-check specific items
   - Recommendation: Support both -- show all items by default with an optional type/category filter. Users can enter counts for only the items they physically counted and skip the rest. Only items with entered counts get processed.

2. **Should waste form allow unit entry in cartons?**
   - What we know: The receiving form uses cartons as the input unit. Waste may be partial (e.g., 500g of spoiled milk, not a full carton).
   - What's unclear: User's typical mental model for waste quantities
   - Recommendation: Accept waste quantities in the same user-friendly units used elsewhere: grams for weight items, pieces for packaging. This is more precise for waste events which are typically sub-carton quantities.

3. **Display of user identity in audit trail**
   - What we know: `createdBy` stores a UUID (Supabase auth user ID). The transaction history currently shows no user name.
   - What's unclear: Whether the existing history page needs to be enhanced to show "who" for waste/adjustment entries
   - Recommendation: For Phase 5 success criteria ("all stock adjustments appear in the transaction ledger with user, timestamp, and reason"), the history page should join with the `profiles` table to display the user's full name. This is a minor enhancement to the existing history page.

## Sources

### Primary (HIGH confidence)
- Project codebase: `prisma/schema.prisma` -- confirmed WASTE and ADJUSTMENT types exist in TransactionType enum
- Project codebase: `src/types/index.ts` -- confirmed TransactionTypeValue includes WASTE and ADJUSTMENT
- Project codebase: `src/actions/stock.ts` -- established atomic ledger pattern (receiveStock)
- Project codebase: `src/actions/sales.ts` -- established batch transaction pattern (processSalesLines)
- Project codebase: `src/app/(dashboard)/stock/history/page.tsx` -- WASTE and ADJUSTMENT badge styles already defined
- Project codebase: `src/components/stock/receiving-form.tsx` -- established form pattern with react-hook-form + standardSchemaResolver
- Project codebase: `src/components/layout/sidebar.tsx` -- NavSection pattern with role gating

### Secondary (MEDIUM confidence)
- Project decisions in STATE.md: atomic ledger pattern decision, negative stock allowed, integer storage units

### Tertiary (LOW confidence)
- None -- all findings come from direct codebase inspection

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new libraries; everything already installed and patterns established
- Architecture: HIGH - Directly extends existing patterns (receiveStock, processSalesLines, form components)
- Pitfalls: HIGH - Based on direct analysis of existing code patterns and unit conversion logic

**Research date:** 2026-03-10
**Valid until:** 2026-04-10 (stable -- no external dependency changes expected)
