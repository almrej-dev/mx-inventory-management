"use server";

import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { receivingSchema, batchReceivingSchema, wasteSchema, batchWasteSchema, reconciliationSchema } from "@/schemas/stock";
import { pesosToCentavos, gramsToMg } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { humanError } from "@/lib/errors";

/**
 * Record incoming stock for an item.
 *
 * Uses prisma.$transaction to ATOMICALLY:
 *   1. Create an inventory_transactions ledger entry (RECEIVE)
 *   2. Increment the item's stock_qty
 *
 * stock_qty is a denormalized cache of the ledger total -- it MUST only
 * change inside a transaction that also writes a ledger row.
 *
 * Unit interpretation depends on item.unitType:
 *   - pcs: stock_qty is in pieces (quantityCartons * cartonSize)
 *   - grams: stock_qty is in milligrams (quantityCartons * cartonSize * unitWeightMg)
 */
export async function receiveStock(rawData: unknown) {
  const { user } = await requireRole("staff");

  const parsed = receivingSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: "Validation failed. Please check your input." };
  }

  const data = parsed.data;

  try {
    // Load the item to get cartonSize, unitWeightMg, and type
    const item = await prisma.item.findUnique({
      where: { id: data.itemId },
    });

    if (!item) {
      return { error: "Item not found" };
    }

    // Calculate quantity in storage units
    // pcs items: pieces = cartons * cartonSize
    // grams items: milligrams = cartons * cartonSize * unitWeightMg
    let calculatedQty: number;
    if (item.unitType === "pcs") {
      calculatedQty = data.quantityCartons * item.cartonSize;
    } else {
      calculatedQty = data.quantityCartons * item.cartonSize * item.unitWeightMg;
    }

    // Calculate total cost in centavos (costPesos is per-carton)
    const totalCostCentavos = pesosToCentavos(data.costPesos) * data.quantityCartons;

    // Generate unique reference ID
    const referenceId = `RCV-${Date.now()}`;

    // ATOMIC: ledger insert + stock_qty increment in one transaction
    await prisma.$transaction([
      prisma.inventoryTransaction.create({
        data: {
          itemId: data.itemId,
          type: "RECEIVE",
          quantity: calculatedQty,
          costCentavos: totalCostCentavos,
          notes: data.notes || null,
          createdBy: user.id,
          referenceId,
        },
      }),
      prisma.item.update({
        where: { id: data.itemId },
        data: {
          stockQty: { increment: calculatedQty },
          // Update per-unit cost to latest purchase cost (per-carton cost converted to per-unit)
          costCentavos: pesosToCentavos(data.costPesos),
        },
      }),
    ]);

    revalidatePath("/stock/receiving");
    revalidatePath("/items");
    revalidatePath("/logs");

    return { success: true };
  } catch (err) {
    return {
      error: humanError(err, "Failed to record receiving"),
    };
  }
}

/**
 * Record incoming stock for multiple items in a single atomic transaction.
 *
 * Batch version of receiveStock — processes all entries in one $transaction.
 * Used by the table-based receiving form where staff can enter quantities
 * for multiple items at once.
 */
export async function receiveStockBatch(rawData: unknown) {
  const { user } = await requireRole("staff");

  const parsed = batchReceivingSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: "Validation failed. Please check your input." };
  }

  const data = parsed.data;

  try {
    const itemIds = data.entries.map((e) => e.itemId);
    const items = await prisma.item.findMany({
      where: { id: { in: itemIds } },
    });
    const itemMap = new Map(items.map((i) => [i.id, i]));

    const batchRefId = `RCV-${Date.now()}`;

    // Pre-compute all entries before entering the transaction
    const prepared = data.entries
      .map((entry) => {
        const item = itemMap.get(entry.itemId);
        if (!item) return null;
        const calculatedQty = item.unitType === "pcs"
          ? entry.quantityCartons * item.cartonSize
          : entry.quantityCartons * item.cartonSize * item.unitWeightMg;
        const totalCostCentavos = pesosToCentavos(entry.costPesos) * entry.quantityCartons;
        return { itemId: entry.itemId, calculatedQty, totalCostCentavos, costCentavos: pesosToCentavos(entry.costPesos) };
      })
      .filter((e) => e !== null);

    if (prepared.length === 0) {
      return { error: "No valid items to receive." };
    }

    await prisma.$transaction(async (tx) => {
      for (const entry of prepared) {
        await tx.inventoryTransaction.create({
          data: {
            itemId: entry.itemId,
            type: "RECEIVE",
            quantity: entry.calculatedQty,
            costCentavos: entry.totalCostCentavos,
            notes: data.notes || null,
            createdBy: user.id,
            referenceId: batchRefId,
          },
        });
        await tx.item.update({
          where: { id: entry.itemId },
          data: {
            stockQty: { increment: entry.calculatedQty },
            costCentavos: entry.costCentavos,
          },
        });
      }
    }, { timeout: 30000 });

    revalidatePath("/stock/receiving");
    revalidatePath("/items");
    revalidatePath("/logs");

    return {
      success: true,
      message: `${data.entries.length} item${data.entries.length !== 1 ? "s" : ""} received successfully.`,
    };
  } catch (err) {
    return {
      error: humanError(err, "Failed to record receiving"),
    };
  }
}

/**
 * Record waste or spoilage for an item.
 *
 * Uses prisma.$transaction to ATOMICALLY:
 *   1. Create an inventory_transactions ledger entry (WASTE) with negative quantity
 *   2. Decrement the item's stock_qty
 *
 * Unit interpretation depends on item.unitType:
 *   - pcs: user enters in pieces (stock_qty is pieces)
 *   - grams: user enters in grams; server converts to milligrams
 *
 * CRITICAL: The ledger quantity MUST be negative (waste removes stock).
 * The decrement value MUST be positive.
 */
export async function recordWaste(rawData: unknown) {
  const { user } = await requireRole("staff");

  const parsed = wasteSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: "Validation failed. Please check your input." };
  }

  const data = parsed.data;

  try {
    const item = await prisma.item.findUnique({
      where: { id: data.itemId },
    });

    if (!item) {
      return { error: "Item not found" };
    }

    // Convert user-friendly units to storage units
    // pcs items: user enters pieces -- already correct
    // grams items: user enters grams -- convert to milligrams
    let wasteQty: number;
    if (item.unitType === "pcs") {
      wasteQty = data.quantity;
    } else {
      wasteQty = gramsToMg(data.quantity);
    }

    const referenceId = `WST-${Date.now()}`;

    // ATOMIC: ledger insert (negative quantity) + stock_qty decrement in one transaction
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
        data: {
          stockQty: { decrement: wasteQty },
        },
      }),
    ]);

    revalidatePath("/stock/waste");
    revalidatePath("/items");
    revalidatePath("/");
    revalidatePath("/logs");

    return { success: true };
  } catch (err) {
    return {
      error: humanError(err, "Failed to record waste"),
    };
  }
}

/**
 * Record waste for multiple items in a single atomic transaction.
 *
 * Batch version of recordWaste — processes all entries in one $transaction.
 * Used by the table-based waste form where staff can enter waste quantities
 * for multiple items at once.
 *
 * Unit interpretation depends on item.unitType:
 *   - pcs: user enters in pieces (stock_qty is pieces)
 *   - grams: user enters in grams; server converts to milligrams
 */
export async function recordWasteBatch(rawData: unknown) {
  const { user } = await requireRole("staff");

  const parsed = batchWasteSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: "Validation failed. Please check your input." };
  }

  const data = parsed.data;

  try {
    const itemIds = data.entries.map((e) => e.itemId);
    const items = await prisma.item.findMany({
      where: { id: { in: itemIds } },
    });
    const itemMap = new Map(items.map((i) => [i.id, i]));

    const batchRefId = `WST-${Date.now()}`;

    // Pre-compute all entries before entering the transaction
    const prepared = data.entries
      .map((entry) => {
        const item = itemMap.get(entry.itemId);
        if (!item) return null;
        const wasteQty = item.unitType === "pcs" ? entry.quantity : gramsToMg(entry.quantity);
        return { itemId: entry.itemId, wasteQty, reasonCode: entry.reasonCode };
      })
      .filter((e) => e !== null);

    if (prepared.length === 0) {
      return { error: "No valid items to record." };
    }

    await prisma.$transaction(async (tx) => {
      for (const entry of prepared) {
        await tx.inventoryTransaction.create({
          data: {
            itemId: entry.itemId,
            type: "WASTE",
            quantity: -entry.wasteQty,
            referenceId: batchRefId,
            notes: `[${entry.reasonCode}]${data.notes ? " " + data.notes : ""}`,
            createdBy: user.id,
          },
        });
        await tx.item.update({
          where: { id: entry.itemId },
          data: { stockQty: { decrement: entry.wasteQty } },
        });
      }
    }, { timeout: 30000 });

    revalidatePath("/stock/waste");
    revalidatePath("/items");
    revalidatePath("/");
    revalidatePath("/logs");

    return {
      success: true,
      message: `${data.entries.length} waste record${data.entries.length !== 1 ? "s" : ""} submitted successfully.`,
    };
  } catch (err) {
    return {
      error: humanError(err, "Failed to record waste"),
    };
  }
}

/**
 * Get transaction history with optional filters.
 *
 * Quantities are stored as:
 *   - PACKAGING items: pieces
 *   - All other items: milligrams
 *
 * The caller should use item.type to determine display format.
 */
export async function getTransactionHistory(filters?: {
  itemId?: number;
  type?: string;
  limit?: number;
}) {
  await requireRole("viewer");

  try {
    const where: Record<string, unknown> = {};

    if (filters?.itemId) {
      where.itemId = filters.itemId;
    }
    if (filters?.type) {
      where.type = filters.type;
    }

    const limit = filters?.limit ?? 50;

    const transactions = await prisma.inventoryTransaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        item: {
          select: {
            id: true,
            name: true,
            sku: true,
            type: true,
          },
        },
      },
    });

    // Resolve createdBy UUIDs to human-readable display names via the profiles table.
    // The profiles table is managed by Supabase auth triggers -- we use a separate
    // lookup query instead of a Prisma relation to avoid requiring a migration.
    const userIds = [...new Set(transactions.map((tx) => tx.createdBy))];

    const profiles = await prisma.profile.findMany({
      where: { id: { in: userIds } },
      select: { id: true, fullName: true },
    });

    const profileMap = new Map(profiles.map((p) => [p.id, p.fullName]));

    const enriched = transactions.map((tx) => ({
      ...tx,
      userName: profileMap.get(tx.createdBy) ?? tx.createdBy.slice(0, 8),
    }));

    return { transactions: enriched };
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : "Failed to load transaction history",
      transactions: [],
    };
  }
}

/**
 * Get active items for the receiving form item selector.
 * Returns only non-deleted items with fields needed for the form.
 */
export async function getActiveItems() {
  await requireRole("staff");

  try {
    const items = await prisma.item.findMany({
      select: {
        id: true,
        name: true,
        sku: true,
        type: true,
        cartonSize: true,
        unitWeightMg: true,
      },
      orderBy: { name: "asc" },
    });

    return { items };
  } catch (err) {
    return {
      error: humanError(err, "Failed to load items"),
      items: [],
    };
  }
}

/**
 * Get all active items with their current stock levels for reconciliation.
 *
 * Returns stockQty in storage units (mg for weight items, pieces for PACKAGING).
 * The client form will convert to display units using mgToGrams().
 */
export async function getItemsForReconciliation() {
  await requireRole("staff");

  try {
    const items = await prisma.item.findMany({
      select: {
        id: true,
        name: true,
        sku: true,
        type: true,
        unitType: true,
        stockQty: true,
      },
      orderBy: { name: "asc" },
    });

    return { items };
  } catch (err) {
    return {
      error: humanError(err, "Failed to load items"),
      items: [],
    };
  }
}

/**
 * Submit a physical inventory reconciliation.
 *
 * For each item where the user entered a physical count:
 *   - Converts user-entered display units (grams/pieces) to storage units (mg/pieces)
 *   - Compares with current stockQty to find variance
 *   - Skips items with zero variance (no discrepancy)
 *   - For discrepant items, atomically:
 *     1. Creates an ADJUSTMENT ledger entry recording the delta (variance)
 *     2. Sets stockQty to the physical count (absolute SET, NOT increment/decrement)
 *
 * CRITICAL: Uses SET (not increment/decrement) because physical count IS the truth.
 * The ledger entry records the variance (delta) for the audit trail.
 */
export async function submitReconciliation(rawData: unknown) {
  const { user } = await requireRole("staff");

  const parsed = reconciliationSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: "Validation failed. Please check your input." };
  }

  const data = parsed.data;

  try {
    const batchRefId = "RECON-" + Date.now();

    // Load current stock levels for all submitted items
    const itemIds = data.counts.map((c) => c.itemId);
    const items = await prisma.item.findMany({
      where: { id: { in: itemIds } },
      select: { id: true, type: true, unitType: true, stockQty: true },
    });

    const itemMap = new Map(items.map((i) => [i.id, i]));

    // Pre-compute adjustments before entering the transaction
    const adjustments: { itemId: number; variance: number; physicalStorageQty: number }[] = [];

    for (const count of data.counts) {
      const item = itemMap.get(count.itemId);
      if (!item) continue;

      const physicalStorageQty =
        item.unitType === "pcs"
          ? count.physicalCount
          : gramsToMg(count.physicalCount);

      const variance = physicalStorageQty - item.stockQty;
      if (variance === 0) continue;

      adjustments.push({ itemId: count.itemId, variance, physicalStorageQty });
    }

    if (adjustments.length === 0) {
      return { success: true, message: "No discrepancies found." };
    }

    const adjustedCount = adjustments.length;
    const reconNotes = data.notes
      ? "Reconciliation: " + data.notes
      : "Physical count reconciliation";

    await prisma.$transaction(async (tx) => {
      for (const adj of adjustments) {
        await tx.inventoryTransaction.create({
          data: {
            itemId: adj.itemId,
            type: "ADJUSTMENT",
            quantity: adj.variance,
            referenceId: batchRefId,
            notes: reconNotes,
            createdBy: user.id,
          },
        });
        await tx.item.update({
          where: { id: adj.itemId },
          data: { stockQty: adj.physicalStorageQty },
        });
      }
    }, { timeout: 30000 });

    revalidatePath("/stock/reconciliation");
    revalidatePath("/items");
    revalidatePath("/");
    revalidatePath("/logs");

    return {
      success: true,
      message: `Reconciliation complete. ${adjustedCount} item${adjustedCount !== 1 ? "s" : ""} adjusted.`,
    };
  } catch (err) {
    return {
      error: humanError(err, "Failed to submit reconciliation"),
    };
  }
}
