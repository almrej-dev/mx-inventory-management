"use server";

import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { itemSchema } from "@/schemas/item";
import { gramsToMg, pesosToCentavos, mgToGrams, centavosToPesos, formatPesos } from "@/lib/utils";
import { revalidatePath } from "next/cache";

const ITEM_TYPE_LABELS: Record<string, string> = {
  RAW_MATERIAL: "Raw Material",
  SEMI_FINISHED: "Semi-Finished",
  FINISHED: "Finished",
  PACKAGING: "Packaging",
};

function buildItemChanges(item: {
  type: string;
  unitType: string;
  category: string | null;
  unitWeightMg: number;
  cartonSize: number;
  costCentavos: number;
  minStockQty: number;
}) {
  return {
    "Type": ITEM_TYPE_LABELS[item.type] ?? item.type,
    "Category": item.category ?? "—",
    "Unit": item.unitType,
    "Unit weight": item.unitType === "pcs" ? `${item.cartonSize} pcs` : `${mgToGrams(item.unitWeightMg)} g`,
    "Carton size": item.cartonSize,
    "Cost": formatPesos(item.costCentavos),
    "Min stock qty": item.minStockQty,
  };
}

export async function createItem(rawData: unknown) {
  let authUser: { id: string };
  try {
    const { user } = await requireRole("staff");
    authUser = user;
  } catch {
    return { error: { _form: ["Unauthorized"] } };
  }

  const parsed = itemSchema.safeParse(rawData);
  if (!parsed.success) {
    const fieldErrors = parsed.error.issues.reduce(
      (acc, issue) => {
        const path = issue.path.join(".");
        if (!acc[path]) acc[path] = [];
        acc[path].push(issue.message);
        return acc;
      },
      {} as Record<string, string[]>
    );
    return { error: fieldErrors };
  }

  const { unitWeightGrams, costPesos, category, ...rest } = parsed.data;

  try {
    const item = await prisma.item.create({
      data: {
        ...rest,
        category: category || null,
        unitWeightMg: gramsToMg(unitWeightGrams),
        costCentavos: pesosToCentavos(costPesos),
      },
    });

    try {
      await prisma.auditLog.create({
        data: {
          entityType: "ITEM",
          entityId: item.id,
          entityName: item.name,
          entitySku: item.sku,
          action: "CREATE",
          changes: buildItemChanges(item),
          createdBy: authUser.id,
        },
      });
    } catch (auditErr) {
      console.error("Audit log write failed:", auditErr);
    }

    revalidatePath("/items");
    revalidatePath("/logs");
    return { success: true, item };
  } catch (err) {
    if (
      err instanceof Error &&
      err.message.includes("Unique constraint failed")
    ) {
      return { error: { sku: ["SKU already exists"] } };
    }
    return {
      error: {
        _form: [
          err instanceof Error ? err.message : "Failed to create item",
        ],
      },
    };
  }
}

export async function updateItem(id: number, rawData: unknown) {
  let authUser: { id: string };
  try {
    const { user } = await requireRole("staff");
    authUser = user;
  } catch {
    return { error: { _form: ["Unauthorized"] } };
  }

  const parsed = itemSchema.safeParse(rawData);
  if (!parsed.success) {
    const fieldErrors = parsed.error.issues.reduce(
      (acc, issue) => {
        const path = issue.path.join(".");
        if (!acc[path]) acc[path] = [];
        acc[path].push(issue.message);
        return acc;
      },
      {} as Record<string, string[]>
    );
    return { error: fieldErrors };
  }

  const { unitWeightGrams, costPesos, category, ...rest } = parsed.data;

  try {
    const item = await prisma.item.update({
      where: { id },
      data: {
        ...rest,
        category: category || null,
        unitWeightMg: gramsToMg(unitWeightGrams),
        costCentavos: pesosToCentavos(costPesos),
      },
    });

    try {
      await prisma.auditLog.create({
        data: {
          entityType: "ITEM",
          entityId: item.id,
          entityName: item.name,
          entitySku: item.sku,
          action: "UPDATE",
          changes: buildItemChanges(item),
          createdBy: authUser.id,
        },
      });
    } catch (auditErr) {
      console.error("Audit log write failed:", auditErr);
    }

    revalidatePath("/items");
    revalidatePath("/logs");
    return { success: true, item };
  } catch (err) {
    if (
      err instanceof Error &&
      err.message.includes("Unique constraint failed")
    ) {
      return { error: { sku: ["SKU already exists"] } };
    }
    return {
      error: {
        _form: [
          err instanceof Error ? err.message : "Failed to update item",
        ],
      },
    };
  }
}

export async function deleteItem(id: number) {
  let authUser: { id: string };
  try {
    const { user } = await requireRole("staff");
    authUser = user;
  } catch {
    return { error: "Unauthorized" };
  }

  try {
    const existing = await prisma.item.findUnique({
      where: { id },
    });
    if (!existing) return { error: "Item not found" };

    await prisma.item.delete({
      where: { id },
    });

    try {
      await prisma.auditLog.create({
        data: {
          entityType: "ITEM",
          entityId: id,
          entityName: existing.name,
          entitySku: existing.sku,
          action: "DELETE",
          changes: buildItemChanges(existing),
          createdBy: authUser.id,
        },
      });
    } catch (auditErr) {
      console.error("Audit log write failed:", auditErr);
    }

    revalidatePath("/items");
    revalidatePath("/logs");
    return { success: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to delete item",
    };
  }
}

export interface ItemWithDisplayValues {
  id: number;
  sku: string;
  name: string;
  type: string;
  unitType: string;
  category: string | null;
  unitWeightMg: number;
  cartonSize: number;
  costCentavos: number;
  stockQty: number;
  minStockQty: number;
  createdAt: Date;
  updatedAt: Date;
  weightGrams: string;
  costPesos: string;
}

export async function getItems(filters?: {
  search?: string;
  type?: string;
  category?: string;
}): Promise<{ items?: ItemWithDisplayValues[]; error?: string }> {
  await requireRole("viewer");

  try {
    const where: Record<string, unknown> = {};
    const andConditions: Record<string, unknown>[] = [];

    if (filters?.search) {
      andConditions.push({
        OR: [
          { name: { contains: filters.search, mode: "insensitive" } },
          { sku: { contains: filters.search, mode: "insensitive" } },
        ],
      });
    }

    if (filters?.type) {
      andConditions.push({ type: filters.type });
    }

    if (filters?.category) {
      andConditions.push({ category: filters.category });
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    const items = await prisma.item.findMany({
      where,
      orderBy: { name: "asc" },
    });

    const itemsWithDisplay: ItemWithDisplayValues[] = items.map((item) => ({
      ...item,
      weightGrams: mgToGrams(item.unitWeightMg),
      costPesos: centavosToPesos(item.costCentavos),
    }));

    return { items: itemsWithDisplay };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to fetch items",
    };
  }
}

export async function getItem(id: number) {
  await requireRole("viewer");

  try {
    const item = await prisma.item.findUnique({
      where: { id },
    });

    if (!item) {
      return null;
    }

    return item;
  } catch {
    return null;
  }
}
