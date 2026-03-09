"use client";

import { useRouter } from "next/navigation";
import { ItemForm } from "@/components/items/item-form";
import { updateItem } from "@/actions/items";
import type { ItemFormData } from "@/schemas/item";

interface EditItemClientProps {
  item: {
    id: number;
    name: string;
    sku: string;
    type: "RAW_MATERIAL" | "SEMI_FINISHED" | "FINISHED" | "PACKAGING";
    category: string | null;
    unitWeightMg: number;
    cartonSize: number;
    costCentavos: number;
    minStockQty: number;
  };
}

export function EditItemClient({ item }: EditItemClientProps) {
  const router = useRouter();

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
    <ItemForm
      mode="edit"
      initialData={{
        name: item.name,
        sku: item.sku,
        type: item.type,
        category: item.category,
        unitWeightMg: item.unitWeightMg,
        cartonSize: item.cartonSize,
        costCentavos: item.costCentavos,
        minStockQty: item.minStockQty,
      }}
      onSubmit={handleSubmit}
    />
  );
}
