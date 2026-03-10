"use server";

import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  startOfDay,
  subDays,
  startOfWeek,
  format,
} from "date-fns";

/**
 * Compute the inventory value (in centavos) of a single item by converting
 * its stockQty back to "carton equivalents" and multiplying by costCentavos.
 *
 * - PACKAGING: stockQty is pieces, so value = (stockQty / cartonSize) * costCentavos
 * - Others: stockQty is milligrams, so value = (stockQty / (cartonSize * unitWeightMg)) * costCentavos
 */
function itemValueCentavos(item: {
  type: string;
  stockQty: number;
  costCentavos: number;
  cartonSize: number;
  unitWeightMg: number;
}): number {
  if (item.type === "PACKAGING") {
    if (item.cartonSize > 0) {
      return Math.round(
        (item.stockQty / item.cartonSize) * item.costCentavos
      );
    }
    return 0;
  }

  const cartonWeightMg = item.cartonSize * item.unitWeightMg;
  if (cartonWeightMg > 0) {
    return Math.round(
      (item.stockQty / cartonWeightMg) * item.costCentavos
    );
  }
  return 0;
}

/**
 * Dashboard summary: total items, inventory value, low-stock count, and
 * this month's transaction count.
 */
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
    totalValueCentavos += itemValueCentavos(item);

    if (item.minStockQty > 0 && item.stockQty < item.minStockQty) {
      lowStockCount++;
    }
  }

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

/**
 * Top-selling products ranked by total units sold across all sales.
 * Uses Prisma groupBy on SalesLine, then fetches item details.
 */
export async function getBestsellers(limit: number = 5) {
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

  return grouped
    .map((g) => ({
      item: itemMap.get(g.itemId)!,
      totalSold: g._sum.quantity || 0,
    }))
    .filter((entry) => entry.item != null);
}

/**
 * Items below their low-stock threshold, ordered by stock level ascending.
 * Fetches items with minStockQty > 0 and filters in application code
 * (Prisma cannot compare two columns in a where clause).
 */
export async function getLowStockItems() {
  await requireRole("viewer");

  const items = await prisma.item.findMany({
    where: {
      deletedAt: null,
      minStockQty: { gt: 0 },
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

  return items.filter((i) => i.stockQty < i.minStockQty);
}

/**
 * Reorder recommendations: items to buy (low/out of stock) and items
 * to limit buying (surplus > 3x threshold).
 */
export async function getReorderRecommendations() {
  await requireRole("viewer");

  const items = await prisma.item.findMany({
    where: {
      deletedAt: null,
      minStockQty: { gt: 0 },
    },
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

  const reorder: typeof items = [];
  const surplus: typeof items = [];

  for (const item of items) {
    if (item.stockQty <= 0 || item.stockQty < item.minStockQty) {
      reorder.push(item);
    } else if (item.stockQty > item.minStockQty * 3) {
      surplus.push(item);
    }
  }

  return { reorder, surplus };
}

/**
 * Sales summary: yesterday and this-week totals from SalesLine.
 * Fetches all lines from the week start in a single query, then
 * partitions into yesterday vs. full-week totals.
 */
export async function getSalesSummary() {
  await requireRole("viewer");

  const now = new Date();
  const yesterdayStart = startOfDay(subDays(now, 1));
  const yesterdayEnd = startOfDay(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });

  const weekLines = await prisma.salesLine.findMany({
    where: {
      upload: {
        saleDate: { gte: weekStart },
        status: { not: "pending" },
      },
    },
    select: {
      quantity: true,
      unitPriceCentavos: true,
      upload: { select: { saleDate: true } },
    },
  });

  let yesterdayCentavos = 0;
  let weekCentavos = 0;

  for (const line of weekLines) {
    const revenue = line.quantity * (line.unitPriceCentavos || 0);
    weekCentavos += revenue;
    if (line.upload.saleDate >= yesterdayStart && line.upload.saleDate < yesterdayEnd) {
      yesterdayCentavos += revenue;
    }
  }

  return { yesterdayCentavos, weekCentavos };
}

/**
 * Daily sales totals for the last 7 days for bar chart.
 * Fetches all lines in the date range with a single query, then
 * groups by day in application code.
 */
export async function getWeeklySalesChart() {
  await requireRole("viewer");

  const now = new Date();
  const rangeStart = startOfDay(subDays(now, 6));
  const rangeEnd = startOfDay(subDays(now, -1));

  const lines = await prisma.salesLine.findMany({
    where: {
      upload: {
        saleDate: { gte: rangeStart, lt: rangeEnd },
        status: { not: "pending" },
      },
    },
    select: {
      quantity: true,
      unitPriceCentavos: true,
      upload: { select: { saleDate: true } },
    },
  });

  // Build a map of date-key -> total centavos
  const dailyTotals = new Map<string, number>();
  for (const line of lines) {
    const key = format(startOfDay(line.upload.saleDate), "MM/dd");
    const revenue = line.quantity * (line.unitPriceCentavos || 0);
    dailyTotals.set(key, (dailyTotals.get(key) || 0) + revenue);
  }

  // Build the result array for each of the 7 days
  const days: { date: string; label: string; totalCentavos: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const day = startOfDay(subDays(now, i));
    const dateKey = format(day, "MM/dd");
    days.push({
      date: dateKey,
      label: format(day, "EEE"),
      totalCentavos: dailyTotals.get(dateKey) || 0,
    });
  }

  return days;
}

/**
 * Receiving summary: this week's received items and pending count.
 */
export async function getReceivingSummary() {
  await requireRole("viewer");

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });

  const receivedThisWeek = await prisma.inventoryTransaction.findMany({
    where: {
      type: "RECEIVE",
      createdAt: { gte: weekStart },
    },
    select: { costCentavos: true },
  });

  let receivedValueCentavos = 0;
  for (const tx of receivedThisWeek) {
    receivedValueCentavos += tx.costCentavos || 0;
  }

  return { receivedValueCentavos, receivedCount: receivedThisWeek.length };
}

/**
 * Inventory value broken down by item category (for donut chart).
 */
export async function getInventoryByCategory() {
  await requireRole("viewer");

  const items = await prisma.item.findMany({
    where: { deletedAt: null },
    select: {
      category: true,
      type: true,
      stockQty: true,
      costCentavos: true,
      unitWeightMg: true,
      cartonSize: true,
    },
  });

  const categoryMap = new Map<string, number>();

  for (const item of items) {
    const cat = item.category || item.type;
    const value = itemValueCentavos(item);
    categoryMap.set(cat, (categoryMap.get(cat) || 0) + value);
  }

  return Array.from(categoryMap.entries())
    .map(([category, valueCentavos]) => ({ category, valueCentavos }))
    .sort((a, b) => b.valueCentavos - a.valueCentavos);
}

/**
 * Waste summary: today, yesterday, and this week's waste totals + recent waste items.
 */
export async function getWasteSummary() {
  await requireRole("viewer");

  const now = new Date();
  const todayStart = startOfDay(now);
  const yesterdayStart = startOfDay(subDays(now, 1));
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });

  const wasteTransactions = await prisma.inventoryTransaction.findMany({
    where: {
      type: "WASTE",
      createdAt: { gte: weekStart },
    },
    include: {
      item: { select: { name: true, sku: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  let todayCentavos = 0;
  let yesterdayCentavos = 0;
  let weekCentavos = 0;

  for (const tx of wasteTransactions) {
    const cost = tx.costCentavos || 0;
    weekCentavos += cost;
    if (tx.createdAt >= todayStart) {
      todayCentavos += cost;
    } else if (tx.createdAt >= yesterdayStart && tx.createdAt < todayStart) {
      yesterdayCentavos += cost;
    }
  }

  const recentItems = wasteTransactions.slice(0, 5).map((tx) => ({
    id: tx.id,
    itemName: tx.item.name,
    quantity: tx.quantity,
    costCentavos: tx.costCentavos || 0,
    createdAt: tx.createdAt,
  }));

  return { todayCentavos, yesterdayCentavos, weekCentavos, recentItems };
}

/**
 * Recent inventory transactions for the activity feed.
 */
export async function getRecentTransactions(limit: number = 5) {
  await requireRole("viewer");

  const transactions = await prisma.inventoryTransaction.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      item: { select: { name: true, sku: true } },
    },
  });

  return transactions.map((tx) => ({
    id: tx.id,
    type: tx.type,
    itemName: tx.item.name,
    quantity: tx.quantity,
    costCentavos: tx.costCentavos,
    notes: tx.notes,
    createdAt: tx.createdAt,
  }));
}

/**
 * Weekly transaction volume by type for trends chart.
 * Fetches all transactions in the 5-week range with a single query, then
 * buckets by week in application code.
 */
export async function getWeeklyTransactionTrends() {
  await requireRole("viewer");

  const now = new Date();
  const rangeStart = startOfDay(subDays(now, 5 * 7));
  const rangeEnd = startOfDay(now);

  const transactions = await prisma.inventoryTransaction.findMany({
    where: {
      createdAt: { gte: rangeStart, lt: rangeEnd },
    },
    select: { type: true, createdAt: true },
  });

  // Build week boundaries (oldest first)
  const weekBoundaries: { begin: Date; end: Date; label: string }[] = [];
  for (let i = 4; i >= 0; i--) {
    const begin = startOfDay(subDays(now, (i + 1) * 7));
    const end = startOfDay(subDays(now, i * 7));
    weekBoundaries.push({ begin, end, label: format(begin, "MM/dd") });
  }

  // Initialize counters per week
  const weekCounters = weekBoundaries.map((w) => ({
    label: w.label,
    receives: 0,
    sales: 0,
    waste: 0,
  }));

  // Bucket each transaction into the correct week
  for (const tx of transactions) {
    const txTime = tx.createdAt.getTime();
    for (let w = 0; w < weekBoundaries.length; w++) {
      if (txTime >= weekBoundaries[w].begin.getTime() && txTime < weekBoundaries[w].end.getTime()) {
        if (tx.type === "RECEIVE") weekCounters[w].receives++;
        else if (tx.type === "SALE_DEDUCTION") weekCounters[w].sales++;
        else if (tx.type === "WASTE") weekCounters[w].waste++;
        break;
      }
    }
  }

  return weekCounters;
}
