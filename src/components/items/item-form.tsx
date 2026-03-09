"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { itemSchema, type ItemFormData } from "@/schemas/item";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ITEM_TYPES } from "@/lib/constants";
import Link from "next/link";

interface ItemFormProps {
  initialData?: {
    name: string;
    sku: string;
    type: "RAW_MATERIAL" | "SEMI_FINISHED" | "FINISHED" | "PACKAGING";
    category: string | null;
    unitWeightMg: number;
    cartonSize: number;
    costCentavos: number;
    minStockQty: number;
  };
  onSubmit: (data: ItemFormData) => Promise<{
    success?: boolean;
    error?: Record<string, string[]>;
  }>;
  mode: "create" | "edit";
}

export function ItemForm({ initialData, onSubmit, mode }: ItemFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ItemFormData>({
    resolver: standardSchemaResolver(itemSchema),
    defaultValues: initialData
      ? {
          name: initialData.name,
          sku: initialData.sku,
          type: initialData.type,
          category: initialData.category || "",
          unitWeightGrams: initialData.unitWeightMg / 1000,
          cartonSize: initialData.cartonSize,
          costPesos: initialData.costCentavos / 100,
          minStockQty: initialData.minStockQty,
        }
      : {
          type: "RAW_MATERIAL",
          unitWeightGrams: 0,
          cartonSize: 1,
          costPesos: 0,
          minStockQty: 0,
        },
  });

  const unitWeightGrams = watch("unitWeightGrams");
  const cartonSize = watch("cartonSize");

  const cartonWeightGrams =
    unitWeightGrams && cartonSize ? cartonSize * unitWeightGrams : 0;

  async function handleFormSubmit(data: ItemFormData) {
    setServerError(null);
    const result = await onSubmit(data);

    if (result.error) {
      if (result.error._form) {
        setServerError(result.error._form[0]);
      } else {
        // Collect field-level server errors for display
        const messages = Object.entries(result.error)
          .map(([field, msgs]) => `${field}: ${msgs.join(", ")}`)
          .join("; ");
        setServerError(messages);
      }
    }
  }

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      className="max-w-lg space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          placeholder="e.g., Fresh Cream"
          {...register("name")}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="sku">
          SKU{" "}
          <Link
            href="/items/sku-legend"
            className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            (format guide)
          </Link>
        </Label>
        <Input
          id="sku"
          placeholder="e.g., RM-DC-001"
          {...register("sku")}
        />
        {errors.sku && (
          <p className="text-sm text-destructive">{errors.sku.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="type">Type</Label>
        <select
          id="type"
          className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          {...register("type")}
        >
          {ITEM_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        {errors.type && (
          <p className="text-sm text-destructive">{errors.type.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Category (optional)</Label>
        <Input
          id="category"
          placeholder="e.g., Dairy & Cream"
          {...register("category")}
        />
        {errors.category && (
          <p className="text-sm text-destructive">{errors.category.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="unitWeightGrams">Unit Weight (grams)</Label>
        <Input
          id="unitWeightGrams"
          type="number"
          step="0.1"
          placeholder="e.g., 850"
          {...register("unitWeightGrams", { valueAsNumber: true })}
        />
        {errors.unitWeightGrams && (
          <p className="text-sm text-destructive">
            {errors.unitWeightGrams.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="cartonSize">Carton Size (units per carton)</Label>
        <Input
          id="cartonSize"
          type="number"
          step="1"
          placeholder="e.g., 8"
          {...register("cartonSize", { valueAsNumber: true })}
        />
        {errors.cartonSize && (
          <p className="text-sm text-destructive">
            {errors.cartonSize.message}
          </p>
        )}
      </div>

      {cartonWeightGrams > 0 && (
        <div className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
          1 carton = {cartonSize} units = {cartonWeightGrams.toLocaleString()}g
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="costPesos">Cost per Unit (PHP)</Label>
        <Input
          id="costPesos"
          type="number"
          step="0.01"
          placeholder="e.g., 45.50"
          {...register("costPesos", { valueAsNumber: true })}
        />
        {errors.costPesos && (
          <p className="text-sm text-destructive">
            {errors.costPesos.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="minStockQty">Minimum Stock Quantity</Label>
        <Input
          id="minStockQty"
          type="number"
          step="1"
          placeholder="e.g., 10"
          {...register("minStockQty", { valueAsNumber: true })}
        />
        {errors.minStockQty && (
          <p className="text-sm text-destructive">
            {errors.minStockQty.message}
          </p>
        )}
      </div>

      {serverError && (
        <p className="text-sm text-destructive">{serverError}</p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? mode === "create"
              ? "Creating..."
              : "Updating..."
            : mode === "create"
              ? "Create Item"
              : "Update Item"}
        </Button>
        <Link href="/items">
          <Button type="button" variant="outline">
            Cancel
          </Button>
        </Link>
      </div>
    </form>
  );
}
