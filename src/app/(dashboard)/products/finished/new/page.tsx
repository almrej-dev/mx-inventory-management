import { getItemsForIngredientSelect } from "@/actions/products";
import { ProductForm } from "@/components/products/product-form";

export default async function NewFinishedProductPage() {
  const ingredientResult = await getItemsForIngredientSelect("FINISHED");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">New Finished Product</h1>
        <p className="text-sm text-muted-foreground">
          Define ingredients and quantities for a finished product.
        </p>
      </div>
      <ProductForm
        mode="create"
        productType="FINISHED"
        ingredientItems={ingredientResult.items}
        returnTo="/products/finished"
      />
    </div>
  );
}
