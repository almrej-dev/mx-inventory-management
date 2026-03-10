"use client";

import { RecipeForm } from "@/components/recipes/recipe-form";
import type { RecipeDetail } from "@/actions/recipes";
import type { RecipeFormData } from "@/schemas/recipe";

interface EditRecipeClientProps {
  recipe: RecipeDetail;
  parentItems: Array<{
    id: number;
    name: string;
    sku: string;
    type: string;
  }>;
  ingredientItems: Array<{
    id: number;
    name: string;
    sku: string;
    type: string;
    unitWeightMg: number;
    costCentavos: number;
  }>;
}

export function EditRecipeClient({
  recipe,
  parentItems,
  ingredientItems,
}: EditRecipeClientProps) {
  const defaultValues: RecipeFormData = {
    parentItemId: recipe.id,
    ingredients: recipe.ingredients.map((ing) => ({
      childItemId: ing.childItemId,
      quantityGrams: ing.quantityGrams,
      quantityPieces: ing.quantityPieces,
    })),
  };

  return (
    <RecipeForm
      mode="edit"
      defaultValues={defaultValues}
      parentItems={parentItems}
      ingredientItems={ingredientItems}
      parentItemId={recipe.id}
    />
  );
}
