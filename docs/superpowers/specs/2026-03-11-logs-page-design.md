# Logs Page Design

**Date:** 2026-03-11
**Status:** Approved

## Overview

Replace `/stock/history` with a unified admin-only `/logs` page in the Management section. The page tracks every create, update, and delete action on Items and Products, plus all stock movements (Receive, Waste, Adjustment, Sale Deduction), showing who did it, what they did, and when.

---

## 1. Schema

Add a new `AuditLog` table to `prisma/schema.prisma`:

```prisma
model AuditLog {
  id         Int      @id @default(autoincrement())
  entityType String   @map("entity_type")  // "ITEM" | "PRODUCT"
  entityId   Int      @map("entity_id")
  entityName String   @map("entity_name")  // snapshot at time of action
  entitySku  String   @map("entity_sku")   // snapshot at time of action
  action     String                        // "CREATE" | "UPDATE" | "DELETE"
  createdBy  String   @map("created_by")   // user UUID
  createdAt  DateTime @default(now()) @map("created_at")

  @@index([entityType, createdAt])
  @@map("audit_logs")
}
```

Name and SKU are snapshotted so deleted items still display meaningful info in the log.

---

## 2. Instrumentation

The following server actions gain audit log writes after a successful operation:

| File | Function | entityType | action |
|---|---|---|---|
| `src/actions/items.ts` | `createItem` | ITEM | CREATE |
| `src/actions/items.ts` | `updateItem` | ITEM | UPDATE |
| `src/actions/items.ts` | `deleteItem` | ITEM | DELETE |
| `src/actions/products.ts` | `createProduct` | PRODUCT | CREATE |
| `src/actions/products.ts` | `updateProduct` | PRODUCT | UPDATE |
| `src/actions/products.ts` | `deleteProduct` | PRODUCT | DELETE |

`createItem`, `updateItem`, and `deleteItem` currently discard the return value of `requireRole`. They must be updated to `const { user } = await requireRole(...)` to capture the user UUID for logging.

Stock events (`receiveStock`, `recordWaste`, `submitReconciliation`, sales deductions) already write `createdBy` to `InventoryTransaction` — no changes needed for those.

---

## 3. Data Layer

### New file: `src/actions/logs.ts`

Exports a single server action `getLogs`:

```ts
type LogFilter = 'all' | 'items' | 'products' | 'stocks'

type LogEntry = {
  id: string           // prefixed to avoid collisions: "audit-{id}" | "tx-{id}"
  entityType: 'ITEM' | 'PRODUCT' | 'STOCK'
  entityName: string
  entitySku: string
  action: string       // CREATE | UPDATE | DELETE | RECEIVE | WASTE | ADJUSTMENT | SALE_DEDUCTION
  userName: string     // resolved from profiles table
  createdAt: Date
}

export async function getLogs(filter: LogFilter = 'all', limit = 100): Promise<{ logs: LogEntry[], error?: string }>
```

**Implementation:**
1. `requireRole('admin')` — logs are admin-only
2. Based on `filter`, query one or both sources:
   - `filter !== 'stocks'` → query `audit_logs` ordered by `createdAt desc`, take `limit`
   - `filter !== 'items' && filter !== 'products'` → query `inventory_transactions` with item join, ordered by `createdAt desc`, take `limit`
3. Collect all unique `createdBy` UUIDs, resolve to `fullName` via a single `profiles` lookup
4. Merge both result arrays, sort by `createdAt desc`, slice to `limit`
5. Return unified `LogEntry[]`

---

## 4. UI

### Page: `src/app/(dashboard)/logs/page.tsx`

Server component. Calls `getAuth()` and redirects non-admins. Reads `searchParams.filter` (default `'all'`), calls `getLogs(filter)`, passes result to the client component.

### Client component: `src/app/(dashboard)/logs/logs-client.tsx`

Props: `initialLogs: LogEntry[]`, `activeFilter: LogFilter`, `error?: string`

**Layout:**
```
[Page heading: "Activity Logs"]
[Subtitle: "All system activity — items, products, and stock movements"]

[Filter tabs: All | Items | Products | Stocks]   ← navigation links with ?filter=...

[Table]
  Date & Time | User | Category | Action | Name / SKU
```

**Action badge colors:**
| Action | Color |
|---|---|
| CREATE | green |
| UPDATE | amber |
| DELETE | red (destructive) |
| RECEIVE | blue |
| WASTE | orange |
| ADJUSTMENT | purple |
| SALE_DEDUCTION | muted/gray |

Filter tabs are rendered as `<Link href="/logs?filter=items">` etc., so the active state is driven by the URL and the page is SSR'd per filter — no client-side state needed.

---

## 5. Sidebar Changes

### Remove
- "History" item (`href: '/stock/history'`) from the Stock section in `sidebar.tsx`

### Add
- "Logs" item (`href: '/logs'`, icon: `ScrollText`, roles: `['admin']`) to the Management section in `sidebar.tsx`

### Remove page
- Delete `src/app/(dashboard)/stock/history/page.tsx`

---

## 6. Out of Scope

- Pagination beyond the `limit` param (100 entries default is sufficient for now)
- Storing field-level diffs (old/new values) on updates
- Logs for sales uploads or user management actions
