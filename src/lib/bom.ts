import { prisma } from "@/lib/prisma";
import type { ItemTypeValue } from "@/types";

/**
 * A single line in a flattened Bill of Materials.
 * All quantities and costs use integer arithmetic (mg, centavos).
 */
export interface BomLine {
  itemId: number;
  itemName: string;
  itemSku: string;
  itemType: ItemTypeValue;
  quantityMg: number;
  quantityPieces: number;
  unitCostCentavos: number;
  unitWeightMg: number;
  lineCostCentavos: number;
}

/**
 * Recursively resolves a recipe tree into a flat list of leaf-level ingredients.
 *
 * For SEMI_FINISHED items that have their own recipe, the function recurses
 * into that sub-recipe. Duplicate items across levels are merged by summing
 * their quantities.
 *
 * @param parentItemId - The item whose recipe to explode
 * @param visited - Set of item IDs already visited (for circular reference detection)
 * @returns Flat array of BomLine entries sorted by itemName
 * @throws Error if a circular recipe reference is detected
 */
export async function explodeBom(
  parentItemId: number,
  visited: Set<number> = new Set()
): Promise<BomLine[]> {
  // Circular reference guard
  if (visited.has(parentItemId)) {
    throw new Error(`Circular recipe detected for item ${parentItemId}`);
  }
  visited.add(parentItemId);

  const ingredients = await prisma.recipeIngredient.findMany({
    where: { parentItemId },
    include: {
      childItem: {
        select: {
          id: true,
          name: true,
          sku: true,
          type: true,
          costCentavos: true,
          cartonSize: true,
          unitWeightMg: true,
        },
      },
    },
  });

  const lines: BomLine[] = [];

  for (const ing of ingredients) {
    const child = ing.childItem;

    // If child is SEMI_FINISHED and has its own recipe, recurse
    if (child.type === "SEMI_FINISHED") {
      const hasRecipe = await prisma.recipeIngredient.count({
        where: { parentItemId: child.id },
      });

      if (hasRecipe > 0) {
        const subLines = await explodeBom(child.id, new Set(visited));
        lines.push(...subLines);
        continue;
      }
    }

    // Leaf node: RAW_MATERIAL, PACKAGING, or SEMI_FINISHED without recipe
    const unitCostCentavos = child.cartonSize > 0
      ? Math.round(child.costCentavos / child.cartonSize)
      : child.costCentavos;
    lines.push({
      itemId: child.id,
      itemName: child.name,
      itemSku: child.sku,
      itemType: child.type as ItemTypeValue,
      quantityMg: ing.quantityMg,
      quantityPieces: ing.quantityPieces,
      unitCostCentavos,
      unitWeightMg: child.unitWeightMg,
      lineCostCentavos: 0, // calculated after merging
    });
  }

  // Merge duplicate items (same ingredient may appear through multiple sub-recipes)
  const merged = new Map<number, BomLine>();
  for (const line of lines) {
    const existing = merged.get(line.itemId);
    if (existing) {
      existing.quantityMg += line.quantityMg;
      existing.quantityPieces += line.quantityPieces;
    } else {
      merged.set(line.itemId, { ...line });
    }
  }

  // Compute line costs for each merged line
  const result: BomLine[] = [];
  for (const line of merged.values()) {
    if (line.itemType === "PACKAGING") {
      // Packaging: cost per piece
      line.lineCostCentavos = line.quantityPieces * line.unitCostCentavos;
    } else {
      // Weight-based items: cost proportional to weight used vs unit weight
      if (line.unitWeightMg > 0) {
        line.lineCostCentavos = Math.round(
          (line.quantityMg * line.unitCostCentavos) / line.unitWeightMg
        );
      } else {
        line.lineCostCentavos = 0;
      }
    }
    result.push(line);
  }

  // Sort by item name for consistent display
  result.sort((a, b) => a.itemName.localeCompare(b.itemName));

  return result;
}

/**
 * Calculates the total cost of a recipe by summing all BOM line costs.
 *
 * @param parentItemId - The item whose recipe cost to calculate
 * @returns Total cost in centavos (integer)
 */
export async function calculateRecipeCost(
  parentItemId: number
): Promise<number> {
  const lines = await explodeBom(parentItemId);
  return lines.reduce((sum, line) => sum + line.lineCostCentavos, 0);
}

/**
 * Checks if adding a new child ingredient to a parent item would create
 * a circular reference in the recipe tree.
 *
 * @param parentItemId - The item that would receive the new ingredient
 * @param newChildItemId - The ingredient being added
 * @returns true if circular (unsafe), false if safe to add
 */
export async function checkCircularReference(
  parentItemId: number,
  newChildItemId: number
): Promise<boolean> {
  // Direct self-reference
  if (newChildItemId === parentItemId) {
    return true;
  }

  // Check if the new child is SEMI_FINISHED and has parentItemId
  // somewhere in its recipe tree
  return hasAncestor(newChildItemId, parentItemId, new Set());
}

/**
 * Recursively walks the recipe tree of `itemId` to check if `targetId`
 * appears as an ingredient at any level.
 */
async function hasAncestor(
  itemId: number,
  targetId: number,
  visited: Set<number>
): Promise<boolean> {
  if (visited.has(itemId)) {
    return false; // Already checked this subtree
  }
  visited.add(itemId);

  const ingredients = await prisma.recipeIngredient.findMany({
    where: { parentItemId: itemId },
    select: { childItemId: true },
  });

  for (const ing of ingredients) {
    if (ing.childItemId === targetId) {
      return true;
    }
    // Recurse into child's recipe tree
    const found = await hasAncestor(ing.childItemId, targetId, visited);
    if (found) {
      return true;
    }
  }

  return false;
}
