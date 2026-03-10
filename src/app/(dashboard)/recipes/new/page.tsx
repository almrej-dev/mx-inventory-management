import {
  getItemsForParentSelect,
  getItemsForIngredientSelect,
} from "@/actions/recipes";
import { RecipeForm } from "@/components/recipes/recipe-form";

export default async function NewRecipePage() {
  const [parentResult, ingredientResult] = await Promise.all([
    getItemsForParentSelect(),
    getItemsForIngredientSelect(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Create New Recipe</h1>
        <p className="text-sm text-muted-foreground">
          Define ingredients and quantities for a product.
        </p>
      </div>
      <RecipeForm
        mode="create"
        parentItems={parentResult.items}
        ingredientItems={ingredientResult.items}
      />
    </div>
  );
}
