"use client";

import { ProductForm } from "@/components/products/product-form";
import type { ProductDetail } from "@/actions/products";
import type { ProductFormData } from "@/schemas/product";

interface EditProductClientProps {
  product: ProductDetail;
  ingredientItems: Array<{
    id: number;
    name: string;
    sku: string;
    type: string;
    unitType: 'grams' | 'pcs';
    unitWeightMg: number;
    costCentavos: number;
  }>;
  returnTo: string;
}

export function EditProductClient({
  product,
  ingredientItems,
  returnTo,
}: EditProductClientProps) {
  const defaultValues: ProductFormData = {
    ingredients: product.ingredients.map((ing) => ({
      childItemId: ing.childItemId,
      quantityGrams: ing.quantityGrams,
      quantityPieces: ing.quantityPieces,
    })),
  };

  return (
    <ProductForm
      mode="edit"
      defaultValues={defaultValues}
      parentItemId={product.id}
      productName={product.name}
      productSku={product.sku}
      ingredientItems={ingredientItems}
      returnTo={returnTo}
    />
  );
}
