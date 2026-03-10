import { notFound } from "next/navigation";
import {
  getRecipe,
  getItemsForParentSelect,
  getItemsForIngredientSelect,
} from "@/actions/recipes";
import { EditRecipeClient } from "./edit-client";

interface EditRecipePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditRecipePage({
  params,
}: EditRecipePageProps) {
  const { id } = await params;
  const itemId = parseInt(id, 10);

  if (isNaN(itemId)) {
    notFound();
  }

  const [recipe, parentResult, ingredientResult] = await Promise.all([
    getRecipe(itemId),
    getItemsForParentSelect(),
    getItemsForIngredientSelect(),
  ]);

  if (!recipe) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Edit Recipe</h1>
        <p className="text-sm text-muted-foreground">
          Update ingredients and quantities for {recipe.name}.
        </p>
      </div>
      <EditRecipeClient
        recipe={recipe}
        parentItems={parentResult.items}
        ingredientItems={ingredientResult.items}
      />
    </div>
  );
}
