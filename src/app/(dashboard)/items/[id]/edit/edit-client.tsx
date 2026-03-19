"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ItemForm } from "@/components/items/item-form";
import { updateItem } from "@/actions/items";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import type { ItemFormData } from "@/schemas/item";

interface EditItemClientProps {
  item: {
    id: number;
    name: string;
    sku: string;
    type: "RAW_MATERIAL" | "SEMI_FINISHED" | "FINISHED" | "PACKAGING";
    unitType: "grams" | "pcs";
    category: string | null;
    unitWeightMg: number;
    cartonSize: number;
    costCentavos: number;
    minStockQty: number;
  };
}

export function EditItemClient({ item }: EditItemClientProps) {
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
      router.push("/items");
    }
  }

  async function handleSubmit(data: ItemFormData) {
    const result = await updateItem(item.id, data);

    if (result.success) {
      router.push("/items");
    }

    return result as {
      success?: boolean;
      error?: Record<string, string[]>;
    };
  }

  return (
    <>
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleBack}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">Edit Item</h1>
          <p className="text-sm text-muted-foreground">
            Update item details for {item.name}.
          </p>
        </div>
      </div>

      <ItemForm
        mode="edit"
        initialData={{
          name: item.name,
          sku: item.sku,
          type: item.type,
          unitType: item.unitType,
          category: item.category,
          unitWeightMg: item.unitWeightMg,
          cartonSize: item.cartonSize,
          costPerCartonCentavos: item.costCentavos,
          minStockQty: item.minStockQty,
        }}
        onSubmit={handleSubmit}
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
              onClick={() => router.push("/items")}
            >
              Discard changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
