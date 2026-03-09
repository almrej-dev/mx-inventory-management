"use client";

import { useRouter } from "next/navigation";
import { ItemForm } from "@/components/items/item-form";
import { createItem } from "@/actions/items";
import type { ItemFormData } from "@/schemas/item";

export default function NewItemPage() {
  const router = useRouter();

  async function handleSubmit(data: ItemFormData) {
    const result = await createItem(data);

    if (result.success) {
      router.push("/items");
    }

    return result as {
      success?: boolean;
      error?: Record<string, string[]>;
    };
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Create New Item</h1>
        <p className="text-sm text-muted-foreground">
          Add a new item to the inventory system.
        </p>
      </div>
      <ItemForm mode="create" onSubmit={handleSubmit} />
    </div>
  );
}
