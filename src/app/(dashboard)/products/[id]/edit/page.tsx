import { notFound } from "next/navigation";
import { getProduct, getItemsForIngredientSelect } from "@/actions/products";
import { EditProductClient } from "./edit-client";

interface EditProductPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProductPage({
  params,
}: EditProductPageProps) {
  const { id } = await params;
  const itemId = parseInt(id, 10);

  if (isNaN(itemId)) {
    notFound();
  }

  const product = await getProduct(itemId);

  if (!product) {
    notFound();
  }

  const ingredientResult = await getItemsForIngredientSelect(
    product.type as "FINISHED" | "SEMI_FINISHED"
  );

  const returnTo =
    product.type === "SEMI_FINISHED"
      ? "/products/semi-finished"
      : "/products/finished";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Edit Product</h1>
        <p className="text-sm text-muted-foreground">
          Update ingredients and quantities for {product.name}.
        </p>
      </div>
      <EditProductClient
        product={product}
        ingredientItems={ingredientResult.items}
        returnTo={returnTo}
      />
    </div>
  );
}
