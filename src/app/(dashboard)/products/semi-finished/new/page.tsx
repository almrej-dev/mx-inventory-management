import { getItemsForIngredientSelect } from "@/actions/products";
import { ProductForm } from "@/components/products/product-form";

export default async function NewSemiFinishedProductPage() {
  const ingredientResult = await getItemsForIngredientSelect("SEMI_FINISHED");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">New Semi-finished Product</h1>
        <p className="text-sm text-muted-foreground">
          Define ingredients and quantities for a semi-finished product.
        </p>
      </div>
      <ProductForm
        mode="create"
        productType="SEMI_FINISHED"
        ingredientItems={ingredientResult.items}
        returnTo="/products/semi-finished"
      />
    </div>
  );
}
