# Logs Page Design

**Date:** 2026-03-11
**Status:** Approved

## Overview

Replace `/stock/history` with a unified admin-only `/logs` page in the Management section. The page tracks every create, update, and delete action on Items and Products, plus all stock movements (Receive, Waste, Adjustment, Sale Deduction), showing who did it, what they did, and when.

---

## 1. Schema

Add two new enums and an `AuditLog` table to `prisma/schema.prisma`:

```prisma
enum AuditEntityType {
  ITEM
  PRODUCT

  @@map("audit_entity_type")
}

enum AuditAction {
  CREATE
  UPDATE
  DELETE

  @@map("audit_action")
}

model AuditLog {
  id         Int             @id @default(autoincrement())
  entityType AuditEntityType @map("entity_type")
  entityId   Int             @map("entity_id")
  entityName String          @map("entity_name")  // snapshot at time of action
  entitySku  String          @map("entity_sku")   // snapshot at time of action — Item.sku is String @unique (non-nullable)
  action     AuditAction
  createdBy  String          @map("created_by")   // user UUID
  createdAt  DateTime        @default(now()) @map("created_at")

  @@index([entityType, createdAt])
  @@map("audit_logs")
}
```

Both `entityType` and `action` use Prisma enums (consistent with `TransactionType`, `ItemType`, `AppRole`).

---

## 2. Instrumentation

### Auth context

`requireRole(role)` returns `{ user, role }` where `user.id` is the Supabase UUID. See `src/lib/auth.ts`.

**What changes where:**

| File | Functions | Change |
|---|---|---|
| `src/actions/stock.ts` | `receiveStock`, `recordWaste`, `submitReconciliation` | Already capture `user` — no change to auth. Add `revalidatePath('/logs')` only. |
| `src/actions/sales.ts` | `processSalesLines` | Add `revalidatePath('/logs')` only (no audit write — SALE_DEDUCTION already goes to `InventoryTransaction`). |
| `src/actions/items.ts` | `createItem`, `updateItem`, `deleteItem` | Change `await requireRole("staff")` → `const { user } = await requireRole("staff")`. Add audit write + `revalidatePath('/logs')`. |
| `src/actions/products.ts` | `createProduct`, `updateProduct`, `deleteProduct` | Same: capture `user`, add audit write + `revalidatePath('/logs')`. |

### `revalidatePath('/logs')` — full list

Every function that writes to `InventoryTransaction` or `AuditLog` must call `revalidatePath('/logs')` so the Logs page serves fresh data:

- `src/actions/items.ts`: `createItem`, `updateItem`, `deleteItem`
- `src/actions/products.ts`: `createProduct`, `updateProduct`, `deleteProduct`
- `src/actions/stock.ts`: `receiveStock`, `recordWaste`, `submitReconciliation`
- `src/actions/sales.ts`: `processSalesLines`

### Audit write pattern

After a successful primary DB write, write to `audit_logs` inside a silent try/catch. The audit write is secondary — if it throws, the error is logged to console and not propagated:

```ts
try {
  await prisma.auditLog.create({
    data: {
      entityType: 'ITEM',     // or 'PRODUCT'
      entityId: item.id,
      entityName: item.name,
      entitySku: item.sku,
      action: 'CREATE',       // or 'UPDATE' | 'DELETE'
      createdBy: user.id,
    },
  });
} catch (auditErr) {
  console.error('Audit log write failed:', auditErr);
}
```

**Known trade-off:** The audit write is not atomic with the primary DB write. A server crash between them silently drops the audit entry. Acceptable for this scope.

### Items — per-function sequencing

**`createItem` and `updateItem`** share the same two-try-block structure:
```
// Outer try (existing):
try { await requireRole("staff") } catch { return { error: { _form: ["Unauthorized"] } } }
// Change to:
let user;
try { ({ user } = await requireRole("staff")) } catch { return { error: { _form: ["Unauthorized"] } } }
// OR simply:
const authResult = await requireRole("staff").catch(() => null);
if (!authResult) return { error: { _form: ["Unauthorized"] } };
const { user } = authResult;
```

Then inside the main try block, after the `prisma.item.create`/`update` call, add:
```ts
// silent audit write
// revalidatePath('/logs')
```

**`deleteItem` — critical sequencing:**

`deleteItem` currently wraps both `requireRole` and the delete in a single try block. Restructure as:

```ts
// Block 1: auth (existing pattern — keep separate)
let user;
try {
  ({ user } = await requireRole("staff"));
} catch {
  return { error: "Unauthorized" };
}

// Block 2: main logic
try {
  // NEW: fetch snapshot before delete
  const existing = await prisma.item.findUnique({
    where: { id },
    select: { name: true, sku: true },
  });
  if (!existing) return { error: "Item not found" };

  // Existing: delete
  await prisma.item.delete({ where: { id } });

  // NEW: silent audit write
  try {
    await prisma.auditLog.create({
      data: { entityType: 'ITEM', entityId: id, entityName: existing.name, entitySku: existing.sku, action: 'DELETE', createdBy: user.id },
    });
  } catch (auditErr) { console.error('Audit log write failed:', auditErr); }

  // Existing + new revalidation
  revalidatePath('/items');
  revalidatePath('/logs');
  return { success: true };
} catch (err) {
  return { error: err instanceof Error ? err.message : 'Failed to delete item' };
}
```

### Products — per-function sequencing

**`createProduct`:**

```
// auth block (existing — has separate try/catch returning { error: { _form: [...] } })
// Change: const { user } = await requireRole("staff")

// main try block (existing):
const result = await prisma.$transaction(async (tx) => {
  const item = await tx.item.create(...);
  ...
  return item;  // ensure item is returned
});

// NEW after transaction:
// silent audit write: PRODUCT / CREATE using result.id, result.name, result.sku
// revalidatePath('/logs')
```

**`updateProduct`:**

The existing `$transaction` returns nothing. Refactor to return the item snapshot from inside the transaction:

```ts
const snapshot = await prisma.$transaction(async (tx) => {
  // NEW: fetch snapshot atomically inside transaction
  const item = await tx.item.findUnique({
    where: { id: parentItemId },
    select: { name: true, sku: true },
  });
  if (!item) throw new Error('Product item not found');

  // Existing:
  await tx.recipeIngredient.deleteMany({ where: { parentItemId } });
  await tx.recipeIngredient.createMany({ ... });

  return item; // NEW: return snapshot
});

// NEW after transaction:
// silent audit write: PRODUCT / UPDATE using parentItemId, snapshot.name, snapshot.sku
// revalidatePath('/logs')
```

Auth pattern for `updateProduct`: it uses a standalone `requireRole("staff")` with no separate auth try/catch (the whole function body is one try). Update to `const { user } = await requireRole("staff")` at the top of the function, before the circular reference check loop.

**`deleteProduct`:**

`deleteProduct` has two try/catch blocks:
- Block 1: `try { await requireRole("staff") } catch { return { error: "Unauthorized" } }` — change to `const { user } = await requireRole("staff")`
- Block 2: main logic

In block 2:
```
// NEW: fetch snapshot before delete
const snapshot = await prisma.item.findUnique({ where: { id: parentItemId }, select: { name, sku } });
if (!snapshot) return { success: true }; // nothing to delete; treat as idempotent

// Existing: deleteMany
await prisma.recipeIngredient.deleteMany({ where: { parentItemId } });

// NEW: silent audit write: PRODUCT / DELETE
// revalidatePath('/logs')
```

Note: `deleteProduct` logs `PRODUCT / DELETE` to mean "the recipe definition was removed." The parent `Item` row is NOT deleted (existing behaviour, unchanged).

---

## 3. Data Layer

### New file: `src/actions/logs.ts`

```ts
"use server";

export type LogFilter = 'all' | 'items' | 'products' | 'stocks';

export type LogEntry = {
  // Prefixed to avoid numeric ID collisions across source tables:
  // "audit-{Int}" for AuditLog rows | "tx-{Int}" for InventoryTransaction rows
  id: string
  entityType: 'ITEM' | 'PRODUCT' | 'STOCK'
  entityName: string
  entitySku: string
  action: string  // CREATE | UPDATE | DELETE | RECEIVE | WASTE | ADJUSTMENT | SALE_DEDUCTION
  userName: string  // resolved from profiles; falls back to uuid.slice(0, 8) if no profile row
  createdAt: Date
}

export async function getLogs(
  filter: LogFilter = 'all',
  limit = 100
): Promise<{ logs: LogEntry[]; error?: string }>
```

**Implementation:**

```
// Auth guard
try { await requireRole('admin') }
catch { return { logs: [], error: 'Unauthorized' } }

try {
  includeAudit  = filter === 'all' || filter === 'items' || filter === 'products'
  includeStocks = filter === 'all' || filter === 'stocks'

  // Build queries
  auditQuery = includeAudit
    ? prisma.auditLog.findMany({
        where:
          filter === 'items'    ? { entityType: 'ITEM' } :
          filter === 'products' ? { entityType: 'PRODUCT' } :
          {},  // 'all' — no entityType filter
        orderBy: { createdAt: 'desc' },
        take: limit,
      })
    : Promise.resolve([])

  stockQuery = includeStocks
    ? prisma.inventoryTransaction.findMany({
        include: { item: { select: { name: true, sku: true } } },
        orderBy: { createdAt: 'desc' },
        take: limit,
      })
    : Promise.resolve([])

  [auditRows, stockRows] = await Promise.all([auditQuery, stockQuery])

  // Resolve user names (single bulk fetch)
  userIds = [...new Set([...auditRows.map(r => r.createdBy), ...stockRows.map(r => r.createdBy)])]
  profiles = await prisma.profile.findMany({
    where: { id: { in: userIds } },
    select: { id: true, fullName: true },
  })
  profileMap = new Map(profiles.map(p => [p.id, p.fullName]))

  // Map to LogEntry
  auditEntries: LogEntry[] = auditRows.map(row => ({
    id: `audit-${row.id}`,
    entityType: row.entityType as 'ITEM' | 'PRODUCT',
    entityName: row.entityName,
    entitySku: row.entitySku,
    action: row.action,
    userName: profileMap.get(row.createdBy) ?? row.createdBy.slice(0, 8),
    createdAt: row.createdAt,
  }))

  stockEntries: LogEntry[] = stockRows.map(row => ({
    id: `tx-${row.id}`,
    entityType: 'STOCK',
    entityName: row.item.name,
    entitySku: row.item.sku,
    action: row.type,  // RECEIVE | WASTE | ADJUSTMENT | SALE_DEDUCTION
    userName: profileMap.get(row.createdBy) ?? row.createdBy.slice(0, 8),
    createdAt: row.createdAt,
  }))

  merged = [...auditEntries, ...stockEntries]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, limit)

  // Per-source limit of `limit` is intentional — merged result may over-represent
  // the source with more recent activity. Acceptable for a capped admin view.

  return { logs: merged }

} catch (err) {
  return { logs: [], error: err instanceof Error ? err.message : 'Failed to load logs' }
}
```

---

## 4. UI

### Page: `src/app/(dashboard)/logs/page.tsx`

Next.js 16 (React 19): `searchParams` is a `Promise` and must be awaited.

```ts
import { redirect } from 'next/navigation';
import { getAuth } from '@/lib/auth';
import { getLogs, type LogFilter } from '@/actions/logs';
import { LogsClient } from './logs-client';

export default async function LogsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { userRole } = await getAuth();
  if (userRole !== 'admin') redirect('/');

  const { filter: rawFilter } = await searchParams;
  const filter = (rawFilter ?? 'all') as LogFilter;
  const { logs, error } = await getLogs(filter);

  return <LogsClient initialLogs={logs} activeFilter={filter} error={error} />;
}
```

`getAuth()` returns `{ user, userRole, userName }`. `userRole` is decoded from the Supabase JWT — no extra DB call needed.

**Two-layer auth:** Page-level `getAuth()` redirects non-admins immediately. `requireRole('admin')` inside `getLogs` provides defense-in-depth. A `staff` user hitting `/logs` directly is redirected to `/` silently — acceptable behaviour.

### Client component: `src/app/(dashboard)/logs/logs-client.tsx`

Props: `{ initialLogs: LogEntry[], activeFilter: LogFilter, error?: string }`

**Layout:**
```
[Heading: "Activity Logs"]
[Subtitle: "All system activity — items, products, and stock movements"]

[Filter tabs: All | Items | Products | Stocks]

[Table]
  Date & Time | User | Category | Action | Name / SKU
```

**Filter tab links and active state:**

| Tab | `href` | Active when |
|---|---|---|
| All | `/logs` | `activeFilter === 'all'` |
| Items | `/logs?filter=items` | `activeFilter === 'items'` |
| Products | `/logs?filter=products` | `activeFilter === 'products'` |
| Stocks | `/logs?filter=stocks` | `activeFilter === 'stocks'` |

The `All` tab uses `href="/logs"` (no param) as the canonical URL. The page defaults `filter` to `'all'` when no param is present, so `/logs` and `/logs?filter=all` behave identically but `/logs` is canonical.

**Action badge colors** (replaces `/stock/history` badge colors — that page is being removed):

| Action | Badge color |
|---|---|
| CREATE | green |
| UPDATE | amber |
| DELETE | red |
| RECEIVE | blue |
| WASTE | orange |
| ADJUSTMENT | purple |
| SALE_DEDUCTION | muted/gray |

Badge styling uses inline Tailwind classes on `<Badge variant="outline">` (same approach as `/stock/history` — e.g. `className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"`).

**Empty state:** `logs.length === 0` → centered "No activity yet" message in the table body.

**Error state:** `error` is set → render a `<Card>` containing a `<p className="text-destructive">` with the error message. This matches the `UsersClient` error pattern in `src/app/(dashboard)/users/users-client.tsx` exactly.

---

## 5. Removals & Cleanups

### Delete page
- `src/app/(dashboard)/stock/history/page.tsx` — delete this file entirely

### Sidebar (`src/components/layout/sidebar.tsx`)
- **Remove** the `{ name: 'History', href: '/stock/history', icon: History, roles: [...] }` item from the Stock section
- **Add** `{ name: 'Logs', href: '/logs', icon: ScrollText, roles: ['admin'] }` to the Management section
- Import `ScrollText` from `lucide-react`; remove `History` import (used only for the stock history item)

### Remove stale `revalidatePath('/stock/history')` calls

Remove only the `/stock/history` line from each (leave all other `revalidatePath` calls):

- `src/actions/stock.ts` → `recordWaste` (confirmed present)
- `src/actions/stock.ts` → `submitReconciliation` (confirmed present)
- `src/actions/sales.ts` → `processSalesLines` line ~143 (confirmed present)

---

## 6. Out of Scope

- Pagination beyond the `limit` param (100 entries default is sufficient for now)
- Storing field-level diffs (old/new values) on updates
- Logs for sales uploads or user management actions
- Balancing the per-source row count when merging (biased merge is acceptable)
- Making audit writes atomic with primary DB writes (silent failure on audit write is acceptable)
