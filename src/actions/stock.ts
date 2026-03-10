"use server";

import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { receivingSchema, wasteSchema, reconciliationSchema } from "@/schemas/stock";
import { pesosToCentavos, gramsToMg } from "@/lib/utils";
import { revalidatePath } from "next/cache";

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
 * Unit interpretation depends on item.type:
 *   - PACKAGING: stock_qty is in pieces (quantityCartons * cartonSize)
 *   - All other types: stock_qty is in milligrams (quantityCartons * cartonSize * unitWeightMg)
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

    if (!item || item.deletedAt !== null) {
      return { error: "Item not found" };
    }

    // Calculate quantity in storage units
    // PACKAGING: pieces = cartons * cartonSize
    // All others: milligrams = cartons * cartonSize * unitWeightMg
    let calculatedQty: number;
    if (item.type === "PACKAGING") {
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

    return { success: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to record receiving",
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
 * Unit interpretation depends on item.type:
 *   - PACKAGING: user enters in pieces (stock_qty is pieces)
 *   - All other types: user enters in grams; server converts to milligrams
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

    if (!item || item.deletedAt !== null) {
      return { error: "Item not found" };
    }

    // Convert user-friendly units to storage units
    // PACKAGING: user enters pieces -- already correct
    // All others: user enters grams -- convert to milligrams
    let wasteQty: number;
    if (item.type === "PACKAGING") {
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
    revalidatePath("/stock/history");
    revalidatePath("/items");
    revalidatePath("/");

    return { success: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to record waste",
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

    return { transactions };
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
      where: { deletedAt: null },
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
      error: err instanceof Error ? err.message : "Failed to load items",
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
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        sku: true,
        type: true,
        stockQty: true,
      },
      orderBy: { name: "asc" },
    });

    return { items };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to load items",
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
      select: { id: true, type: true, stockQty: true },
    });

    const itemMap = new Map(items.map((i) => [i.id, i]));

    type TxOp =
      | ReturnType<typeof prisma.inventoryTransaction.create>
      | ReturnType<typeof prisma.item.update>;

    const ops: TxOp[] = [];
    let adjustedCount = 0;

    for (const count of data.counts) {
      const item = itemMap.get(count.itemId);
      if (!item) continue;

      // Convert user-entered display units to storage units
      // PACKAGING: user enters pieces -- already correct
      // All other types: user enters grams -- convert to milligrams
      const physicalStorageQty =
        item.type === "PACKAGING"
          ? count.physicalCount
          : gramsToMg(count.physicalCount);

      // Calculate variance (positive = surplus, negative = shortage)
      const variance = physicalStorageQty - item.stockQty;

      // Skip items with no discrepancy
      if (variance === 0) continue;

      adjustedCount++;

      ops.push(
        prisma.inventoryTransaction.create({
          data: {
            itemId: count.itemId,
            type: "ADJUSTMENT",
            quantity: variance,
            referenceId: batchRefId,
            notes: data.notes
              ? "Reconciliation: " + data.notes
              : "Physical count reconciliation",
            createdBy: user.id,
          },
        })
      );

      ops.push(
        prisma.item.update({
          where: { id: count.itemId },
          data: { stockQty: physicalStorageQty },
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

    return {
      success: true,
      message: `Reconciliation complete. ${adjustedCount} item${adjustedCount !== 1 ? "s" : ""} adjusted.`,
    };
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "Failed to submit reconciliation",
    };
  }
}
