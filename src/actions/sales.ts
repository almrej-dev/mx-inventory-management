"use server";

import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { explodeBom } from "@/lib/bom";
import { processSalesSchema } from "@/schemas/sales";
import { revalidatePath } from "next/cache";

/**
 * Process a batch of sales lines with automatic BOM-based inventory deduction.
 *
 * PHASE 1 (outside transaction): BOM explosion and aggregation
 *   - For each sold item, explode its BOM to get leaf-level ingredients
 *   - Aggregate deductions across all sold products into a single deduction map
 *
 * PHASE 2 (single prisma.$transaction): All writes atomically
 *   - Create SalesUpload record
 *   - Create SalesLine records
 *   - Create SALE_DEDUCTION ledger entries for each aggregated ingredient
 *   - Decrement stock quantities
 *
 * CRITICAL: Negative stock is allowed. The system must record reality --
 * if sales exceed stock, the stock goes negative to flag the discrepancy.
 */
export async function processSalesLines(rawData: unknown) {
  const { user } = await requireRole("staff");

  const parsed = processSalesSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: "Validation failed. Please check your input." };
  }

  const data = parsed.data;

  try {
    // =========================================================
    // PHASE 1: BOM explosion and deduction aggregation
    // (outside transaction to avoid holding it open during reads)
    // =========================================================

    // deductionMap: itemId -> { totalQtyMg, totalQtyPieces }
    const deductionMap = new Map<
      number,
      { itemId: number; totalQtyMg: number; totalQtyPieces: number }
    >();

    for (const line of data.lines) {
      const bomLines = await explodeBom(line.itemId);

      for (const bom of bomLines) {
        // Scale BOM quantities by units sold (BOM returns per-unit amounts)
        const scaledMg = bom.quantityMg * line.quantity;
        const scaledPieces = bom.quantityPieces * line.quantity;

        const existing = deductionMap.get(bom.itemId);
        if (existing) {
          existing.totalQtyMg += scaledMg;
          existing.totalQtyPieces += scaledPieces;
        } else {
          deductionMap.set(bom.itemId, {
            itemId: bom.itemId,
            totalQtyMg: scaledMg,
            totalQtyPieces: scaledPieces,
          });
        }
      }
    }

    // Load item types for deduction entries to determine mg vs pieces
    const itemIds = [...deductionMap.keys()];
    const items = await prisma.item.findMany({
      where: { id: { in: itemIds } },
      select: { id: true, type: true },
    });
    const itemTypeMap = new Map(items.map((i) => [i.id, i.type]));

    // =========================================================
    // PHASE 2: Atomic writes in a single transaction
    // =========================================================

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create SalesUpload record
      const upload = await tx.salesUpload.create({
        data: {
          fileName: data.fileName || null,
          source: data.source,
          saleDate: new Date(data.saleDate),
          totalLines: data.lines.length,
          matchedLines: data.lines.length,
          status: "completed",
          notes: data.notes || null,
          createdBy: user.id,
        },
      });

      // 2. Create SalesLine records
      await tx.salesLine.createMany({
        data: data.lines.map((line) => ({
          uploadId: upload.id,
          itemId: line.itemId,
          productName: line.productName,
          quantity: line.quantity,
          unitPriceCentavos: line.unitPriceCentavos ?? null,
          deducted: true,
        })),
      });

      // 3. Create SALE_DEDUCTION ledger entries and decrement stock
      for (const [ingredientItemId, deduction] of deductionMap) {
        const itemType = itemTypeMap.get(ingredientItemId);

        // PACKAGING uses pieces, all others use milligrams
        const deductQty =
          itemType === "PACKAGING"
            ? deduction.totalQtyPieces
            : deduction.totalQtyMg;

        // Create ledger entry (negative quantity for deduction)
        await tx.inventoryTransaction.create({
          data: {
            itemId: ingredientItemId,
            type: "SALE_DEDUCTION",
            quantity: -deductQty,
            referenceId: `SALE-${upload.id}`,
            notes: `Auto-deducted from sales batch #${upload.id}`,
            createdBy: user.id,
          },
        });

        // Decrement stock (allow negative -- no guard)
        await tx.item.update({
          where: { id: ingredientItemId },
          data: {
            stockQty: { decrement: deductQty },
          },
        });
      }

      return upload;
    });

    revalidatePath("/sales");
    revalidatePath("/stock/history");
    revalidatePath("/items");

    return { success: true, uploadId: result.id };
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "Failed to process sales lines",
    };
  }
}

/**
 * Get all sales uploads ordered by most recent, with line counts.
 */
export async function getSalesUploads() {
  await requireRole("viewer");

  try {
    const uploads = await prisma.salesUpload.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { lines: true },
        },
      },
    });

    return { uploads };
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "Failed to load sales uploads",
      uploads: [],
    };
  }
}

/**
 * Get a single sales upload with full line details.
 */
export async function getSalesUploadDetail(uploadId: number) {
  await requireRole("viewer");

  try {
    const upload = await prisma.salesUpload.findUnique({
      where: { id: uploadId },
      include: {
        lines: {
          include: {
            item: {
              select: {
                name: true,
                sku: true,
                type: true,
              },
            },
          },
        },
      },
    });

    if (!upload) {
      return { error: "Not found" };
    }

    return { upload };
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : "Failed to load sales upload detail",
    };
  }
}

/**
 * Get finished items that have recipes defined (i.e., are sellable products).
 *
 * Used by the upload preview and manual entry form to show only items
 * that can trigger BOM-based deductions.
 */
export async function getFinishedItems() {
  await requireRole("staff");

  try {
    const items = await prisma.item.findMany({
      where: {
        type: "FINISHED",
        recipeIngredients: {
          some: {},
        },
      },
      select: {
        id: true,
        name: true,
        sku: true,
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
