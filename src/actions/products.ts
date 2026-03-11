"use server";

import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ItemType } from "@prisma/client";
import { productSchema } from "@/schemas/product";
import { checkCircularReference, explodeBom, calculateRecipeCost } from "@/lib/bom";
import type { BomLine } from "@/lib/bom";
import { gramsToMg, mgToGrams, centavosToPesos } from "@/lib/utils";
import { revalidatePath } from "next/cache";

async function fetchIngredientChanges(parentItemId: number) {
  const rows = await prisma.recipeIngredient.findMany({
    where: { parentItemId },
    include: { childItem: { select: { name: true, sku: true, unitType: true } } },
  });
  const ingredients = rows.map((r) => {
    const qtyParts: string[] = [];
    if (r.quantityMg > 0) qtyParts.push(`${mgToGrams(r.quantityMg)} g`);
    if (r.quantityPieces > 0) qtyParts.push(`${r.quantityPieces} pcs`);
    return `${r.childItem.name} (${r.childItem.sku}): ${qtyParts.join(" + ") || "0"}`;
  });
  return { "Ingredients": ingredients };
}

export async function createProduct(
  productType: "FINISHED" | "SEMI_FINISHED",
  name: string,
  sku: string,
  rawData: unknown
) {
  let authUser: { id: string };
  try {
    const { user } = await requireRole("staff");
    authUser = user;
  } catch {
    return { error: { _form: ["Unauthorized"] } };
  }

  if (!name || !name.trim()) {
    return { error: { _form: ["Product name is required"] } };
  }
  if (!sku || !sku.trim()) {
    return { error: { _form: ["SKU is required"] } };
  }

  const parsed = productSchema.safeParse(rawData);
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

  const { ingredients } = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Create the product item
      const item = await tx.item.create({
        data: {
          name: name.trim(),
          sku: sku.trim().toUpperCase(),
          type: productType,
          unitWeightMg: 0,
          cartonSize: 0,
          costCentavos: 0,
        },
      });

      // Check circular references and validate ingredients
      for (const ing of ingredients) {
        const isCircular = await checkCircularReference(item.id, ing.childItemId);
        if (isCircular) {
          throw new Error("Circular recipe detected: this ingredient would create a cycle");
        }

        const childItem = await tx.item.findUnique({ where: { id: ing.childItemId } });
        if (!childItem) {
          throw new Error(`Ingredient item ${ing.childItemId} not found`);
        }
        if (childItem.type === "FINISHED") {
          throw new Error(
            "Finished products cannot be used as ingredients. Only Raw Material, Semi-Finished, and Packaging items are allowed."
          );
        }
      }

      // Create ingredient rows
      await tx.recipeIngredient.createMany({
        data: ingredients.map((ing) => ({
          parentItemId: item.id,
          childItemId: ing.childItemId,
          quantityMg: gramsToMg(ing.quantityGrams),
          quantityPieces: ing.quantityPieces,
        })),
      });

      return item;
    });

    try {
      const changes = await fetchIngredientChanges(result.id);
      await prisma.auditLog.create({
        data: {
          entityType: "PRODUCT",
          entityId: result.id,
          entityName: result.name,
          entitySku: result.sku,
          action: "CREATE",
          changes,
          createdBy: authUser.id,
        },
      });
    } catch (auditErr) {
      console.error("Audit log write failed:", auditErr);
    }

    revalidatePath("/products/semi-finished");
    revalidatePath("/products/finished");
    revalidatePath("/logs");
    return { success: true, productId: result.id, productType };
  } catch (err) {
    return {
      error: {
        _form: [err instanceof Error ? err.message : "Failed to create product"],
      },
    };
  }
}

export async function updateProduct(parentItemId: number, rawData: unknown) {
  let authUser: { id: string };
  try {
    const { user } = await requireRole("staff");
    authUser = user;
  } catch {
    return { error: { _form: ["Unauthorized"] } };
  }

  const parsed = productSchema.safeParse(rawData);
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

  const { ingredients } = parsed.data;

  // Note: circular-reference and child-item type checks run outside the transaction.
  // A concurrent request could modify a child item between these checks and the write.
  // This is a known pre-existing limitation; fixing it is out of scope for this task.
  // Check circular references
  for (const ing of ingredients) {
    const isCircular = await checkCircularReference(parentItemId, ing.childItemId);
    if (isCircular) {
      return {
        error: {
          _form: [
            "Circular recipe detected: this ingredient would create a cycle",
          ],
        },
      };
    }
  }

  // Validate each child item
  for (const ing of ingredients) {
    const childItem = await prisma.item.findUnique({
      where: { id: ing.childItemId },
    });
    if (!childItem) {
      return { error: { _form: [`Ingredient item ${ing.childItemId} not found`] } };
    }
    if (childItem.type === "FINISHED") {
      return {
        error: {
          _form: [
            "Finished products cannot be used as ingredients. Only Raw Material, Semi-Finished, and Packaging items are allowed.",
          ],
        },
      };
    }
  }

  try {
    const snapshot = await prisma.$transaction(async (tx) => {
      const item = await tx.item.findUnique({
        where: { id: parentItemId },
        select: { name: true, sku: true },
      });
      if (!item) throw new Error("Product item not found");

      await tx.recipeIngredient.deleteMany({
        where: { parentItemId },
      });

      await tx.recipeIngredient.createMany({
        data: ingredients.map((ing) => ({
          parentItemId,
          childItemId: ing.childItemId,
          quantityMg: gramsToMg(ing.quantityGrams),
          quantityPieces: ing.quantityPieces,
        })),
      });

      return item;
    });

    try {
      const changes = await fetchIngredientChanges(parentItemId);
      await prisma.auditLog.create({
        data: {
          entityType: "PRODUCT",
          entityId: parentItemId,
          entityName: snapshot.name,
          entitySku: snapshot.sku,
          action: "UPDATE",
          changes,
          createdBy: authUser.id,
        },
      });
    } catch (auditErr) {
      console.error("Audit log write failed:", auditErr);
    }

    revalidatePath(`/products/${parentItemId}`);
    revalidatePath("/products/semi-finished");
    revalidatePath("/products/finished");
    revalidatePath("/logs");
    return { success: true };
  } catch (err) {
    return {
      error: {
        _form: [
          err instanceof Error ? err.message : "Failed to update product",
        ],
      },
    };
  }
}

export async function deleteProduct(parentItemId: number) {
  let authUser: { id: string };
  try {
    const { user } = await requireRole("staff");
    authUser = user;
  } catch {
    return { error: "Unauthorized" };
  }

  try {
    // Deletes only the recipe ingredients (product definition).
    // The parent Item row is intentionally left intact per design.
    const snapshot = await prisma.item.findUnique({
      where: { id: parentItemId },
      select: { name: true, sku: true },
    });
    if (!snapshot) return { success: true }; // nothing to log; treat as idempotent

    const changes = await fetchIngredientChanges(parentItemId);

    await prisma.recipeIngredient.deleteMany({
      where: { parentItemId },
    });

    try {
      await prisma.auditLog.create({
        data: {
          entityType: "PRODUCT",
          entityId: parentItemId,
          entityName: snapshot.name,
          entitySku: snapshot.sku,
          action: "DELETE",
          changes,
          createdBy: authUser.id,
        },
      });
    } catch (auditErr) {
      console.error("Audit log write failed:", auditErr);
    }

    revalidatePath("/products/semi-finished");
    revalidatePath("/products/finished");
    revalidatePath("/logs");
    return { success: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to delete product",
    };
  }
}

export interface ProductListItem {
  id: number;
  sku: string;
  name: string;
  type: string;
  ingredientCount: number;
  totalCostCentavos: number;
  costPesos: string;
}

export async function getProducts(type?: "FINISHED" | "SEMI_FINISHED"): Promise<{
  products?: ProductListItem[];
  error?: string;
}> {
  try {
    await requireRole("viewer");
  } catch {
    return { error: "Unauthorized" };
  }

  try {
    const items = await prisma.item.findMany({
      where: {
        recipeIngredients: { some: {} },
        ...(type ? { type } : {}),
      },
      include: {
        recipeIngredients: {
          include: {
            childItem: {
              select: {
                id: true,
                name: true,
                sku: true,
                type: true,
                costCentavos: true,
                unitWeightMg: true,
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const products: ProductListItem[] = items.map((item) => {
      let totalCostCentavos = 0;
      for (const ing of item.recipeIngredients) {
        const child = ing.childItem;
        if (child.type === "PACKAGING") {
          totalCostCentavos += ing.quantityPieces * child.costCentavos;
        } else {
          if (child.unitWeightMg > 0) {
            totalCostCentavos += Math.round(
              (ing.quantityMg * child.costCentavos) / child.unitWeightMg
            );
          }
        }
      }

      return {
        id: item.id,
        sku: item.sku,
        name: item.name,
        type: item.type,
        ingredientCount: item.recipeIngredients.length,
        totalCostCentavos,
        costPesos: centavosToPesos(totalCostCentavos),
      };
    });

    return { products };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to fetch products",
    };
  }
}

export interface ProductDetail {
  id: number;
  sku: string;
  name: string;
  type: string;
  ingredients: Array<{
    childItemId: number;
    childItemName: string;
    childItemSku: string;
    childItemType: string;
    quantityGrams: number;
    quantityPieces: number;
  }>;
}

export async function getProduct(
  parentItemId: number
): Promise<ProductDetail | null> {
  try {
    await requireRole("viewer");
  } catch {
    return null;
  }

  try {
    const item = await prisma.item.findUnique({
      where: { id: parentItemId },
      include: {
        recipeIngredients: {
          include: {
            childItem: {
              select: {
                id: true,
                name: true,
                sku: true,
                type: true,
              },
            },
          },
        },
      },
    });

    if (!item || item.recipeIngredients.length === 0) {
      return null;
    }

    return {
      id: item.id,
      sku: item.sku,
      name: item.name,
      type: item.type,
      ingredients: item.recipeIngredients.map((ing) => ({
        childItemId: ing.childItem.id,
        childItemName: ing.childItem.name,
        childItemSku: ing.childItem.sku,
        childItemType: ing.childItem.type,
        quantityGrams: parseFloat(mgToGrams(ing.quantityMg)),
        quantityPieces: ing.quantityPieces,
      })),
    };
  } catch {
    return null;
  }
}

export async function getProductBom(parentItemId: number): Promise<{
  bom?: BomLine[];
  totalCostCentavos?: number;
  totalCostPesos?: string;
  error?: string;
}> {
  try {
    await requireRole("viewer");
  } catch {
    return { error: "Unauthorized" };
  }

  try {
    const bom = await explodeBom(parentItemId);
    const totalCostCentavos = await calculateRecipeCost(parentItemId);

    return {
      bom,
      totalCostCentavos,
      totalCostPesos: centavosToPesos(totalCostCentavos),
    };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to compute BOM",
    };
  }
}

export async function getItemsForIngredientSelect(
  productType?: "FINISHED" | "SEMI_FINISHED"
): Promise<{
  items: Array<{
    id: number;
    name: string;
    sku: string;
    type: string;
    unitType: "grams" | "pcs";
    unitWeightMg: number;
    costCentavos: number;
  }>;
}> {
  try {
    await requireRole("viewer");
  } catch {
    return { items: [] };
  }

  // Semi-finished products can only use items (raw materials + packaging)
  // Finished products can use items + semi-finished products
  const allowedTypes: ItemType[] =
    productType === "SEMI_FINISHED"
      ? [ItemType.RAW_MATERIAL, ItemType.PACKAGING]
      : [ItemType.RAW_MATERIAL, ItemType.PACKAGING, ItemType.SEMI_FINISHED];

  const rows = await prisma.item.findMany({
    where: {
      type: { in: allowedTypes },
    },
    select: {
      id: true,
      name: true,
      sku: true,
      type: true,
      unitType: true,
      unitWeightMg: true,
      costCentavos: true,
    },
    orderBy: { name: "asc" },
  });

  const items = rows.map((row) => ({
    ...row,
    unitType: row.unitType as "grams" | "pcs",
  }));

  return { items };
}
