"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ProductForm } from "@/components/products/product-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import type { ProductDetail } from "@/actions/products";
import type { ProductFormData } from "@/schemas/product";

interface EditProductClientProps {
  product: ProductDetail;
  ingredientItems: Array<{
    id: number;
    name: string;
    sku: string;
    type: string;
    unitType: "grams" | "pcs";
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
  const router = useRouter();
  const [isDirty, setIsDirty] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);

  const handleDirtyChange = useCallback((dirty: boolean) => {
    setIsDirty(dirty);
  }, []);

  function handleBack() {
    if (isDirty) {
      setShowDiscardDialog(true);
    } else {
      router.push(returnTo);
    }
  }

  const defaultValues: ProductFormData = {
    ingredients: product.ingredients.map((ing) => ({
      childItemId: ing.childItemId,
      quantityGrams: ing.quantityGrams,
      quantityPieces: ing.quantityPieces,
    })),
  };

  return (
    <>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">Edit Product</h1>
          <p className="text-sm text-muted-foreground">
            Update ingredients and quantities for {product.name}.
          </p>
        </div>
      </div>

      <ProductForm
        mode="edit"
        defaultValues={defaultValues}
        parentItemId={product.id}
        productName={product.name}
        productSku={product.sku}
        ingredientItems={ingredientItems}
        returnTo={returnTo}
        onDirtyChange={handleDirtyChange}
      />

      <Dialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discard changes?</DialogTitle>
            <DialogDescription>
              You have unsaved changes. Are you sure you want to leave? Your
              changes will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDiscardDialog(false)}
            >
              Keep editing
            </Button>
            <Button
              variant="destructive"
              onClick={() => router.push(returnTo)}
            >
              Discard changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
