"use server";

import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recipeSchema } from "@/schemas/recipe";
import { checkCircularReference, explodeBom, calculateRecipeCost } from "@/lib/bom";
import type { BomLine } from "@/lib/bom";
import { gramsToMg, mgToGrams, centavosToPesos } from "@/lib/utils";
import { revalidatePath } from "next/cache";

export async function createRecipe(rawData: unknown) {
  try {
    await requireRole("staff");
  } catch {
    return { error: { _form: ["Unauthorized"] } };
  }

  const parsed = recipeSchema.safeParse(rawData);
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

  const { parentItemId, ingredients } = parsed.data;

  // Validate parent item exists and is FINISHED or SEMI_FINISHED
  const parentItem = await prisma.item.findUnique({
    where: { id: parentItemId },
  });
  if (!parentItem || parentItem.deletedAt) {
    return { error: { _form: ["Parent item not found"] } };
  }
  if (parentItem.type !== "FINISHED" && parentItem.type !== "SEMI_FINISHED") {
    return { error: { _form: ["Parent item must be Finished or Semi-Finished type"] } };
  }

  // Check circular references for each ingredient
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
    if (!childItem || childItem.deletedAt) {
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
    await prisma.$transaction(async (tx) => {
      // Delete any existing recipe ingredients for this parent (upsert pattern)
      await tx.recipeIngredient.deleteMany({
        where: { parentItemId },
      });

      // Create new ingredient rows
      await tx.recipeIngredient.createMany({
        data: ingredients.map((ing) => ({
          parentItemId,
          childItemId: ing.childItemId,
          quantityMg: gramsToMg(ing.quantityGrams),
          quantityPieces: ing.quantityPieces,
        })),
      });
    });

    revalidatePath("/recipes");
    return { success: true };
  } catch (err) {
    return {
      error: {
        _form: [
          err instanceof Error ? err.message : "Failed to create recipe",
        ],
      },
    };
  }
}

export async function updateRecipe(parentItemId: number, rawData: unknown) {
  try {
    await requireRole("staff");
  } catch {
    return { error: { _form: ["Unauthorized"] } };
  }

  const parsed = recipeSchema.safeParse(rawData);
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
    if (!childItem || childItem.deletedAt) {
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
    await prisma.$transaction(async (tx) => {
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
    });

    revalidatePath("/recipes");
    revalidatePath(`/recipes/${parentItemId}`);
    return { success: true };
  } catch (err) {
    return {
      error: {
        _form: [
          err instanceof Error ? err.message : "Failed to update recipe",
        ],
      },
    };
  }
}

export async function deleteRecipe(parentItemId: number) {
  try {
    await requireRole("staff");
  } catch {
    return { error: "Unauthorized" };
  }

  try {
    await prisma.recipeIngredient.deleteMany({
      where: { parentItemId },
    });

    revalidatePath("/recipes");
    return { success: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to delete recipe",
    };
  }
}

export interface RecipeListItem {
  id: number;
  sku: string;
  name: string;
  type: string;
  ingredientCount: number;
  totalCostCentavos: number;
  costPesos: string;
}

export async function getRecipes(): Promise<{
  recipes?: RecipeListItem[];
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
        deletedAt: null,
        recipeIngredients: { some: {} },
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

    const recipes: RecipeListItem[] = items.map((item) => {
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

    return { recipes };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to fetch recipes",
    };
  }
}

export interface RecipeDetail {
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

export async function getRecipe(
  parentItemId: number
): Promise<RecipeDetail | null> {
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

    if (!item || item.deletedAt || item.recipeIngredients.length === 0) {
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

export async function getRecipeBom(parentItemId: number): Promise<{
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

export async function getItemsForIngredientSelect(): Promise<{
  items: Array<{
    id: number;
    name: string;
    sku: string;
    type: string;
    unitWeightMg: number;
    costCentavos: number;
  }>;
}> {
  try {
    await requireRole("viewer");
  } catch {
    return { items: [] };
  }

  const items = await prisma.item.findMany({
    where: {
      deletedAt: null,
      type: { in: ["RAW_MATERIAL", "SEMI_FINISHED", "PACKAGING"] },
    },
    select: {
      id: true,
      name: true,
      sku: true,
      type: true,
      unitWeightMg: true,
      costCentavos: true,
    },
    orderBy: { name: "asc" },
  });

  return { items };
}

export async function getItemsForParentSelect(): Promise<{
  items: Array<{
    id: number;
    name: string;
    sku: string;
    type: string;
  }>;
}> {
  try {
    await requireRole("viewer");
  } catch {
    return { items: [] };
  }

  const items = await prisma.item.findMany({
    where: {
      deletedAt: null,
      type: { in: ["FINISHED", "SEMI_FINISHED"] },
    },
    select: {
      id: true,
      name: true,
      sku: true,
      type: true,
    },
    orderBy: { name: "asc" },
  });

  return { items };
}
