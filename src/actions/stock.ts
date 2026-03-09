"use server";

import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { receivingSchema } from "@/schemas/stock";
import { pesosToCentavos } from "@/lib/utils";
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
