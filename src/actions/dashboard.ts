"use server";

import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Dashboard summary: total items, inventory value, low-stock count, and
 * this month's transaction count.
 *
 * Inventory value is computed per-item by converting stockQty back to
 * "carton equivalents" and multiplying by costCentavos (cost per carton).
 * - PACKAGING: stockQty is pieces, so value = (stockQty / cartonSize) * costCentavos
 * - Others: stockQty is milligrams, so value = (stockQty / (cartonSize * unitWeightMg)) * costCentavos
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
    // Calculate inventory value in centavos
    if (item.type === "PACKAGING") {
      // stockQty is pieces, cost is per carton (cartonSize pieces per carton)
      if (item.cartonSize > 0) {
        totalValueCentavos += Math.round(
          (item.stockQty / item.cartonSize) * item.costCentavos
        );
      }
    } else {
      // stockQty is milligrams, cost is per carton
      const cartonWeightMg = item.cartonSize * item.unitWeightMg;
      if (cartonWeightMg > 0) {
        totalValueCentavos += Math.round(
          (item.stockQty / cartonWeightMg) * item.costCentavos
        );
      }
    }

    // Count low-stock items (only those with a threshold set)
    if (item.minStockQty > 0 && item.stockQty < item.minStockQty) {
      lowStockCount++;
    }
  }

  // Count this month's inventory transactions
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
