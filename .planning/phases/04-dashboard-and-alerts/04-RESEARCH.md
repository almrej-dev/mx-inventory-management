# Phase 4: Dashboard and Alerts - Research

**Researched:** 2026-03-10
**Domain:** Dashboard data aggregation, low-stock alerting, sales reporting, Prisma queries
**Confidence:** HIGH

## Summary

Phase 4 transforms the existing placeholder dashboard (currently showing `--` for all stats) into a fully functional command center. The foundation is strong: the database schema already has `stock_qty`, `min_stock_qty`, and `cost_centavos` on every `Item`, the `SalesLine` table tracks all sold products with quantities, and the `InventoryTransaction` ledger records every stock movement. The work is primarily about querying this existing data, computing derived values (inventory value, bestsellers, reorder recommendations), and presenting them through summary cards, tables, and filtered reports.

No new npm packages are required for the core dashboard. All aggregation can be handled by Prisma's `aggregate`, `groupBy`, and `findMany` with computed fields. The one new UI dependency is for date range filtering on sales reports -- this requires adding shadcn/ui's `popover` and `calendar` components (Base UI variants) which bring in `react-day-picker` as a dependency. The `date-fns` library already in the project handles all date formatting and range computation.

The `minStockQty` field already exists on the Item model and is already exposed in the item form (the item-form.tsx has a "Minimum Stock Quantity" input). The field defaults to 0, meaning items without a user-set threshold will never trigger low-stock alerts, which is correct behavior. The dashboard simply needs to query for items where `stockQty < minStockQty` AND `minStockQty > 0`.

**Primary recommendation:** Build entirely with server components and server actions using Prisma queries against existing schema -- no new tables needed, no charting libraries required, just data aggregation queries, summary cards, sortable tables, and date-filtered report views.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DASH-01 | Dashboard displays inventory summary (stock levels, total value, low-stock count) | Prisma `aggregate` for total value (`_sum` of stockQty * costCentavos via raw query or application-level calc), `count` for items, conditional count for low-stock items where `stockQty < minStockQty AND minStockQty > 0` |
| DASH-02 | Dashboard prioritizes bestseller products by sales volume | Prisma `groupBy` on `SalesLine` by `itemId` with `_sum` on `quantity`, ordered descending, joined with Item name -- shows top N sellers |
| DASH-03 | Dashboard recommends stock items to buy surplus and items to limit buying | Low-stock/out-of-stock items (stockQty <= 0 or stockQty < minStockQty) as "reorder" list; surplus items (stockQty >> minStockQty, e.g., > 3x threshold) as "limit buying" list |
| DASH-04 | User can generate sales reports filtered by date range, product, and category | SalesLine queries with date range filter on SalesUpload.saleDate, product filter on SalesLine.itemId, category filter via Item.category join; requires date picker UI component |
| STCK-02 | User can set low stock threshold per item and see alerts on dashboard | `minStockQty` field already exists in Item schema and item form; dashboard queries items where `stockQty < minStockQty AND minStockQty > 0` and displays as alert list |
</phase_requirements>

## Standard Stack

### Core (already in project -- no new dependencies for dashboard)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @prisma/client | ^7.4.2 | Database queries -- aggregate, groupBy, findMany | Already the project ORM; aggregate/groupBy cover all dashboard query needs |
| date-fns | ^4.1.0 | Date formatting and range helpers (startOfDay, endOfDay, subDays) | Already in project; handles date range filter computation |
| @tanstack/react-table | ^8.21.3 | Sortable/filterable tables for reports and item lists | Already used for items and sales history; reuse for report tables |
| lucide-react | ^0.577.0 | Dashboard icons (TrendingUp, AlertTriangle, ShoppingCart, etc.) | Already in project |

### New Components to Add
| Component | Install Command | Purpose | Why Needed |
|-----------|----------------|---------|------------|
| shadcn/ui popover (Base UI) | `pnpm dlx shadcn@latest add popover` | Container for date picker dropdown | Date range filter for sales reports (DASH-04) |
| shadcn/ui calendar (Base UI) | `pnpm dlx shadcn@latest add calendar` | Date picker calendar UI | Date range selection for sales reports (DASH-04) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Prisma aggregate queries | Raw SQL via `prisma.$queryRaw` | Raw SQL is more flexible for complex aggregations but loses type safety; Prisma aggregate is sufficient for our needs |
| Simple HTML date inputs | shadcn Calendar + Popover | HTML date inputs work but look inconsistent with the design system; Calendar component is polished and consistent |
| Charting library (recharts, chart.js) | No charts for v1 | Charts add complexity; simple number cards and sorted tables communicate the same data more directly for this use case |

**Installation:**
```bash
pnpm dlx shadcn@latest add popover calendar
```

Note: This will install `react-day-picker` as a transitive dependency of the calendar component.

## Architecture Patterns

### Recommended Project Structure
```
src/
  actions/
    dashboard.ts              # Server actions for all dashboard data queries
  app/(dashboard)/
    page.tsx                   # Main dashboard (replace current placeholder)
    reports/
      page.tsx                 # Sales reports with date range + product + category filters
      reports-client.tsx       # Client component for filter state management
  components/
    dashboard/
      summary-cards.tsx        # 4 stat cards (total items, inventory value, low stock, transactions)
      bestsellers-table.tsx    # Top selling products table
      low-stock-alerts.tsx     # Items below threshold alert list
      reorder-recommendations.tsx  # Buy more / limit buying recommendations
    reports/
      date-range-picker.tsx    # Date range picker using Popover + Calendar
      report-filters.tsx       # Combined filter bar (date range + product + category)
      report-table.tsx         # Filtered sales data table
```

### Pattern 1: Server Component Dashboard with Parallel Data Fetching
**What:** The main dashboard page fetches all summary data in parallel using Promise.all in a server component, avoiding waterfalls.
**When to use:** Dashboard page where multiple independent queries feed different UI sections.
**Example:**
```typescript
// src/app/(dashboard)/page.tsx
// Source: Next.js data fetching patterns + project conventions
export default async function DashboardPage() {
  const [summary, bestsellers, lowStock, reorderRecs] = await Promise.all([
    getDashboardSummary(),
    getBestsellers(5),
    getLowStockItems(),
    getReorderRecommendations(),
  ]);

  return (
    <div className="space-y-6">
      <SummaryCards data={summary} />
      <div className="grid gap-6 md:grid-cols-2">
        <BestsellersTable data={bestsellers} />
        <LowStockAlerts data={lowStock} />
      </div>
      <ReorderRecommendations data={reorderRecs} />
    </div>
  );
}
```

### Pattern 2: Inventory Value Calculation (Application-Level)
**What:** Inventory value computed per-item as `stockQty * costCentavos` at the application level, since Prisma aggregate cannot multiply two columns directly.
**When to use:** Total inventory value and per-item value display.
**Example:**
```typescript
// Source: Project schema + Prisma limitations
// Item stockQty is stored in milligrams (weight-based) or pieces (packaging)
// Item costCentavos is cost per carton
// For inventory value: need to convert stockQty back to "cartons worth" then multiply
// SIMPLER: fetch all items with stockQty > 0, compute value per item in JS

async function getDashboardSummary() {
  const items = await prisma.item.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      stockQty: true,
      costCentavos: true,
      minStockQty: true,
      type: true,
      unitWeightMg: true,
      cartonSize: true,
    },
  });

  let totalValueCentavos = 0;
  let lowStockCount = 0;

  for (const item of items) {
    // Value = (stockQty in storage units) / (units per carton * weight per unit) * cost per carton
    // This gives approximate value based on last purchase price
    if (item.type === "PACKAGING") {
      // stockQty is pieces, cost is per carton (cartonSize pieces)
      totalValueCentavos += Math.round(
        (item.stockQty / item.cartonSize) * item.costCentavos
      );
    } else {
      // stockQty is mg, cost is per carton
      const cartonWeightMg = item.cartonSize * item.unitWeightMg;
      if (cartonWeightMg > 0) {
        totalValueCentavos += Math.round(
          (item.stockQty / cartonWeightMg) * item.costCentavos
        );
      }
    }

    if (item.minStockQty > 0 && item.stockQty < item.minStockQty) {
      lowStockCount++;
    }
  }

  return {
    totalItems: items.length,
    totalValueCentavos,
    lowStockCount,
  };
}
```

### Pattern 3: Bestsellers via SalesLine GroupBy
**What:** Rank finished products by total units sold using Prisma groupBy on SalesLine.
**When to use:** DASH-02 bestseller ranking.
**Example:**
```typescript
// Source: Prisma groupBy docs
async function getBestsellers(limit: number = 10) {
  const grouped = await prisma.salesLine.groupBy({
    by: ["itemId"],
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: limit,
  });

  // Fetch item details for the top sellers
  const itemIds = grouped.map((g) => g.itemId);
  const items = await prisma.item.findMany({
    where: { id: { in: itemIds } },
    select: { id: true, name: true, sku: true },
  });

  const itemMap = new Map(items.map((i) => [i.id, i]));
  return grouped.map((g) => ({
    item: itemMap.get(g.itemId),
    totalSold: g._sum.quantity || 0,
  }));
}
```

### Pattern 4: Reports with Client-Side Filter State
**What:** The reports page uses a client component for filter state (date range, product, category) and passes filters to a server action that returns filtered data.
**When to use:** DASH-04 sales reports page.
**Example:**
```typescript
// src/app/(dashboard)/reports/reports-client.tsx
"use client";

import { useState, useEffect, useTransition } from "react";
import { getSalesReport } from "@/actions/dashboard";

export function ReportsClient({ categories, products }: Props) {
  const [isPending, startTransition] = useTransition();
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [data, setData] = useState<SalesReportRow[]>([]);

  function handleFilter() {
    startTransition(async () => {
      const result = await getSalesReport({
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString(),
        productId: selectedProduct,
        category: selectedCategory,
      });
      setData(result.rows);
    });
  }
  // ... render filters + table
}
```

### Pattern 5: Low Stock Alert with Threshold Display
**What:** Query items where `stockQty < minStockQty AND minStockQty > 0`, display with visual severity indicator.
**When to use:** STCK-02 low-stock alerts.
**Example:**
```typescript
// Source: Prisma where clause + project schema
async function getLowStockItems() {
  return prisma.item.findMany({
    where: {
      deletedAt: null,
      minStockQty: { gt: 0 },
      // Can't do stockQty < minStockQty in Prisma directly
      // Use raw filter or fetch-and-filter approach
    },
    select: {
      id: true,
      name: true,
      sku: true,
      type: true,
      stockQty: true,
      minStockQty: true,
    },
    orderBy: { stockQty: "asc" },
  });
  // Filter in application: items.filter(i => i.stockQty < i.minStockQty)
}
```

### Anti-Patterns to Avoid
- **N+1 queries in dashboard:** Do NOT fetch summary, then loop to fetch related data. Use `Promise.all` for parallel independent queries, and `include`/`select` for related data in single queries.
- **Client-side data fetching for dashboard stats:** The dashboard page MUST be a server component fetching data directly. Do not use `useEffect` + fetch for the main dashboard -- it creates a loading flash and doubles render time.
- **Storing computed aggregates:** Do NOT add columns for "total value" or "bestseller rank" to the database. These are derived values computed on-demand from existing data. The dataset is small enough (ice cream shop) that real-time computation is fast.
- **Complex date grouping in Prisma:** Prisma `groupBy` does NOT support grouping by date parts (month, week). If needed, fetch raw data and group in application code, or use `$queryRaw` for date_trunc.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date range picker UI | Custom date input with validation | shadcn Calendar + Popover + date-fns | Keyboard navigation, locale support, accessibility, consistent styling |
| Currency formatting | Manual string concatenation | `centavosToPesos()` from src/lib/utils.ts | Already exists, handles decimal precision |
| Weight display | Manual mg-to-g conversion | `mgToGrams()` from src/lib/utils.ts | Already exists, consistent across app |
| Sortable data tables | Custom table sorting logic | @tanstack/react-table (already used) | Column sorting, pagination, filtering already implemented in item-table pattern |
| Cross-column comparison (stockQty < minStockQty) | Complex Prisma raw query | Application-level filter after findMany | Dataset is small (single ice cream shop), filter 50-200 items in JS is trivial |

**Key insight:** The entire dashboard operates on a small dataset (single store, likely 50-200 items). There is no need for database-level optimization -- fetch all items once, compute everything in application code.

## Common Pitfalls

### Pitfall 1: Inventory Value Calculation Complexity
**What goes wrong:** Treating `stockQty * costCentavos` as the inventory value without accounting for unit conversion. stockQty is in milligrams (for weight-based items) or pieces (for packaging), while costCentavos is cost per carton.
**Why it happens:** The storage units are internal optimization (integer arithmetic), not display-ready.
**How to avoid:** Always convert stockQty back to "carton equivalents" before multiplying by costCentavos. For weight-based items: `(stockQty / (cartonSize * unitWeightMg)) * costCentavos`. For packaging: `(stockQty / cartonSize) * costCentavos`.
**Warning signs:** Inventory values that are astronomically large (millions of pesos for an ice cream shop).

### Pitfall 2: minStockQty Unit Mismatch
**What goes wrong:** The `minStockQty` field is an integer but its unit semantics are not documented. If it is stored in milligrams while the user enters it in grams, comparisons will be off by 1000x.
**Why it happens:** The item form currently accepts `minStockQty` as a raw integer with no unit conversion (unlike `unitWeightGrams` which converts to `unitWeightMg`).
**How to avoid:** Determine what unit `minStockQty` represents. Looking at the schema: it defaults to 0 and the form accepts it directly as a number. Since the item-form.tsx registers it with `valueAsNumber: true` and passes it through without conversion, it appears to be stored in the same units as the user enters. The user likely enters this in "cartons" or "units" -- this must be clarified. **Recommendation:** Define minStockQty as number of cartons (simplest for user), and compare against `stockQty / (cartonSize * unitWeightMg)` for weight-based items or `stockQty / cartonSize` for packaging.
**Warning signs:** Items showing as "low stock" when they clearly have plenty, or never triggering despite being nearly empty.

### Pitfall 3: Prisma Cannot Compare Two Columns
**What goes wrong:** Attempting `where: { stockQty: { lt: prisma.item.fields.minStockQty } }` -- Prisma does not support cross-column comparison in where clauses.
**Why it happens:** Prisma's type-safe query builder works with literal values, not column references.
**How to avoid:** Fetch items with `minStockQty > 0` from Prisma, then filter in application code: `items.filter(i => i.stockQty < i.minStockQty)`. Alternatively, use `prisma.$queryRaw` for this specific query.
**Warning signs:** TypeScript compilation errors on the where clause.

### Pitfall 4: Date Range Filter Off-By-One
**What goes wrong:** Sales for the end date are excluded because the filter uses `lte: endDate` where endDate is midnight (start of day), so sales during that day are missed.
**Why it happens:** JavaScript `new Date("2026-03-10")` creates midnight, not end-of-day.
**How to avoid:** Use `endOfDay(endDate)` from date-fns for the upper bound, or use `lt: addDays(endDate, 1)` (exclusive upper bound). Apply to `SalesUpload.saleDate` which is the date the sales occurred.
**Warning signs:** Reports showing fewer sales than expected for a given range.

### Pitfall 5: shadcn v4 Base UI vs Radix Pattern
**What goes wrong:** Using `asChild` prop on PopoverTrigger when the project uses Base UI (not Radix).
**Why it happens:** Most shadcn examples online show the Radix variant with `asChild`.
**How to avoid:** The project uses `@base-ui/react`. Base UI components use the `render` prop pattern, not `asChild`. Example: `<PopoverTrigger render={<Button variant="outline" />}>`. Check existing components (dialog.tsx, dropdown-menu.tsx) for the correct pattern.
**Warning signs:** Runtime error about unexpected `asChild` prop, or trigger element rendering incorrectly.

### Pitfall 6: Negative Stock Display
**What goes wrong:** Dashboard shows negative stock values confusingly, or negative stock items are excluded from low-stock alerts.
**Why it happens:** The system allows negative stock by design (decision from Phase 3: "Negative stock allowed by design -- no guard prevents stockQty from going below 0").
**How to avoid:** Explicitly handle negative stock: treat items with `stockQty <= 0` as critical alerts (more urgent than merely "below threshold"). Display negative values with clear visual warning (red text, warning icon).
**Warning signs:** Users seeing "0 low stock items" when items are actually at negative inventory.

## Code Examples

Verified patterns from the existing codebase and official documentation:

### Dashboard Summary Query
```typescript
// Source: Prisma aggregate docs + project schema
export async function getDashboardSummary() {
  await requireRole("viewer");

  const items = await prisma.item.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      stockQty: true,
      costCentavos: true,
      minStockQty: true,
      type: true,
      unitWeightMg: true,
      cartonSize: true,
    },
  });

  let totalValueCentavos = 0;
  let lowStockCount = 0;

  for (const item of items) {
    // Calculate inventory value in centavos
    if (item.type === "PACKAGING") {
      totalValueCentavos += Math.round(
        (item.stockQty / item.cartonSize) * item.costCentavos
      );
    } else {
      const cartonWeightMg = item.cartonSize * item.unitWeightMg;
      if (cartonWeightMg > 0) {
        totalValueCentavos += Math.round(
          (item.stockQty / cartonWeightMg) * item.costCentavos
        );
      }
    }

    // Count low-stock items
    if (item.minStockQty > 0 && item.stockQty < item.minStockQty) {
      lowStockCount++;
    }
  }

  // Count this month's transactions
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const transactionCount = await prisma.inventoryTransaction.count({
    where: { createdAt: { gte: startOfMonth } },
  });

  return {
    totalItems: items.length,
    totalValueCentavos,
    lowStockCount,
    transactionCount,
  };
}
```

### Bestsellers GroupBy Query
```typescript
// Source: Prisma groupBy docs
export async function getBestsellers(limit: number = 10) {
  await requireRole("viewer");

  const grouped = await prisma.salesLine.groupBy({
    by: ["itemId"],
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: limit,
  });

  const itemIds = grouped.map((g) => g.itemId);
  const items = await prisma.item.findMany({
    where: { id: { in: itemIds } },
    select: { id: true, name: true, sku: true, type: true },
  });

  const itemMap = new Map(items.map((i) => [i.id, i]));
  return grouped.map((g) => ({
    item: itemMap.get(g.itemId)!,
    totalSold: g._sum.quantity || 0,
  }));
}
```

### Sales Report with Date Range Filter
```typescript
// Source: Prisma where clause + date-fns
import { startOfDay, endOfDay } from "date-fns";

export async function getSalesReport(filters: {
  from?: string;
  to?: string;
  productId?: number;
  category?: string;
}) {
  await requireRole("viewer");

  const where: Record<string, unknown> = {};
  const uploadWhere: Record<string, unknown> = {};

  // Date range filter on SalesUpload.saleDate
  if (filters.from || filters.to) {
    const dateFilter: Record<string, Date> = {};
    if (filters.from) dateFilter.gte = startOfDay(new Date(filters.from));
    if (filters.to) dateFilter.lte = endOfDay(new Date(filters.to));
    uploadWhere.saleDate = dateFilter;
  }

  if (filters.productId) {
    where.itemId = filters.productId;
  }

  const lines = await prisma.salesLine.findMany({
    where: {
      ...where,
      upload: uploadWhere,
      ...(filters.category
        ? { item: { category: filters.category } }
        : {}),
    },
    include: {
      item: { select: { name: true, sku: true, type: true, category: true } },
      upload: { select: { saleDate: true, source: true } },
    },
    orderBy: { upload: { saleDate: "desc" } },
  });

  return { lines };
}
```

### Date Range Picker Component Pattern
```typescript
// Source: shadcn/ui Base UI docs + project patterns
"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { DateRange } from "react-day-picker";

interface DateRangePickerProps {
  value: DateRange | undefined;
  onChange: (range: DateRange | undefined) => void;
}

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  return (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" />}>
        <CalendarIcon className="mr-2 h-4 w-4" />
        {value?.from ? (
          value.to ? (
            <>
              {format(value.from, "LLL dd, y")} - {format(value.to, "LLL dd, y")}
            </>
          ) : (
            format(value.from, "LLL dd, y")
          )
        ) : (
          <span>Pick a date range</span>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={value}
          onSelect={onChange}
          numberOfMonths={2}
        />
      </PopoverContent>
    </Popover>
  );
}
```

### Reorder Recommendations Logic
```typescript
// Source: Business logic derived from requirements
export async function getReorderRecommendations() {
  await requireRole("viewer");

  const items = await prisma.item.findMany({
    where: { deletedAt: null, minStockQty: { gt: 0 } },
    select: {
      id: true,
      name: true,
      sku: true,
      type: true,
      stockQty: true,
      minStockQty: true,
      unitWeightMg: true,
      cartonSize: true,
    },
    orderBy: { stockQty: "asc" },
  });

  const reorder: typeof items = []; // Buy more -- low or out of stock
  const surplus: typeof items = []; // Limit buying -- overstocked

  for (const item of items) {
    if (item.stockQty <= 0 || item.stockQty < item.minStockQty) {
      reorder.push(item);
    } else if (item.stockQty > item.minStockQty * 3) {
      // Surplus: stock is more than 3x the minimum threshold
      surplus.push(item);
    }
  }

  return { reorder, surplus };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Client-side data fetching (useEffect + API routes) | Server Components with direct DB queries | Next.js 13+ App Router (2023+) | Eliminates loading spinners on dashboard, better SEO, reduced client JS |
| Separate API routes for dashboard data | Server actions called from server components | Next.js 14+ (2024) | Simpler architecture, no API layer needed |
| Heavy charting libraries for dashboards | Simple stat cards + sorted tables | Current best practice for small-scale apps | Charts add 50-200KB for visual decoration; tables are more actionable |

**Deprecated/outdated:**
- `getServerSideProps` / `getStaticProps`: Replaced by server components in App Router
- API routes for data fetching: Server components can query DB directly; server actions for mutations
- Radix UI primitives in shadcn: This project uses Base UI (`@base-ui/react`), not Radix

## Open Questions

1. **minStockQty unit semantics**
   - What we know: The field is stored as an integer, accepted directly from the form without conversion. The form label says "Minimum Stock Quantity" with no unit suffix.
   - What's unclear: Is this in cartons? Individual units? The same storage unit as stockQty (milligrams/pieces)? If it's in a different unit than stockQty, the comparison `stockQty < minStockQty` is meaningless.
   - Recommendation: **Treat minStockQty as being in the same storage units as stockQty** (milligrams for weight-based, pieces for packaging). This is the most consistent interpretation since both fields are on the same model. If this proves wrong during testing, add a conversion step. Consider adding helper text to the item form clarifying the unit.

2. **Surplus threshold definition**
   - What we know: DASH-03 asks for "items to limit buying" (surplus).
   - What's unclear: What multiplier defines "surplus"? 2x? 3x? 5x the minimum threshold?
   - Recommendation: Use 3x as default (items with stock > 3x minStockQty are flagged as surplus). This is a reasonable heuristic. Could later be made configurable.

3. **Report export format**
   - What we know: DASH-04 says "generate sales reports" -- this could mean view on screen or export to file.
   - What's unclear: Does "generate" imply PDF/CSV export, or just on-screen filtered view?
   - Recommendation: Start with on-screen filtered view only. CSV export can be added as a follow-up enhancement (not in v1 requirements).

## Sources

### Primary (HIGH confidence)
- [Prisma aggregate/groupBy docs](https://www.prisma.io/docs/orm/prisma-client/queries/aggregation-grouping-summarizing) - Verified aggregate, groupBy, count, _sum syntax and capabilities
- [Prisma Client API reference](https://www.prisma.io/docs/orm/reference/prisma-client-reference) - Where clause syntax, ordering, take/skip
- [shadcn/ui Base UI date-picker](https://ui.shadcn.com/docs/components/base/date-picker) - Installation, Popover + Calendar composition pattern
- [shadcn/ui Base UI popover](https://ui.shadcn.com/docs/components/base/popover) - Install command: `pnpm dlx shadcn@latest add popover`
- [shadcn/ui Base UI calendar](https://ui.shadcn.com/docs/components/base/calendar) - Install command: `pnpm dlx shadcn@latest add calendar`
- Project codebase: schema.prisma, actions/*.ts, components/*.tsx -- verified existing patterns and data models

### Secondary (MEDIUM confidence)
- [Next.js data fetching patterns](https://nextjs.org/docs/app/getting-started/fetching-data) - Server component patterns, parallel fetching with Promise.all
- [date-fns documentation](https://date-fns.org/) - startOfDay, endOfDay, format, subDays functions
- [React DayPicker](https://react-day-picker.js.org) - Calendar mode="range" for date range selection

### Tertiary (LOW confidence)
- Surplus threshold multiplier (3x) -- heuristic, not from any authoritative source; should be validated with the business user

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new major dependencies; everything builds on existing project stack
- Architecture: HIGH - Follows established project patterns (server components, Prisma queries, shadcn UI, TanStack Table)
- Pitfalls: HIGH - Identified from direct codebase inspection (unit conversions, Prisma limitations, Base UI patterns)
- Inventory value calculation: MEDIUM - Unit conversion formula derived from schema inspection; needs validation with real data
- minStockQty semantics: MEDIUM - Unit interpretation is assumed, not definitively documented

**Research date:** 2026-03-10
**Valid until:** 2026-04-10 (stable -- no rapidly evolving dependencies)
