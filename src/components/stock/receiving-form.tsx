"use client";

import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { receivingSchema, type ReceivingFormData } from "@/schemas/stock";
import { receiveStock } from "@/actions/stock";
import { mgToGrams } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ItemTypeValue } from "@/types";

interface ItemOption {
  id: number;
  name: string;
  sku: string;
  type: ItemTypeValue;
  cartonSize: number;
  unitWeightMg: number;
}

interface ReceivingFormProps {
  items: ItemOption[];
}

export function ReceivingForm({ items }: ReceivingFormProps) {
  const [submitStatus, setSubmitStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<ReceivingFormData>({
    resolver: standardSchemaResolver(receivingSchema),
    defaultValues: {
      itemId: 0,
      quantityCartons: 0,
      receivedDate: new Date().toISOString().split("T")[0],
      costPesos: 0,
      notes: "",
    },
  });

  const watchedItemId = watch("itemId");
  const watchedQuantity = watch("quantityCartons");
  const watchedCost = watch("costPesos");

  // Find selected item for unit conversion display
  const selectedItem = useMemo(
    () => items.find((i) => i.id === Number(watchedItemId)),
    [items, watchedItemId]
  );

  // Real-time unit conversion preview
  const conversionPreview = useMemo(() => {
    if (!selectedItem || !watchedQuantity || watchedQuantity <= 0) return null;

    const qty = Number(watchedQuantity);
    const totalUnits = qty * selectedItem.cartonSize;

    if (selectedItem.type === "PACKAGING") {
      // Packaging items: pieces
      return `${qty} carton${qty !== 1 ? "s" : ""} = ${totalUnits.toLocaleString()} pieces`;
    } else {
      // Weight items: milligrams -> grams display
      const totalMg = totalUnits * selectedItem.unitWeightMg;
      return `${qty} carton${qty !== 1 ? "s" : ""} = ${totalUnits.toLocaleString()} units = ${mgToGrams(totalMg)}g`;
    }
  }, [selectedItem, watchedQuantity]);

  // Total cost preview
  const totalCostPreview = useMemo(() => {
    if (!watchedCost || !watchedQuantity || watchedQuantity <= 0 || watchedCost <= 0)
      return null;
    const total = Number(watchedCost) * Number(watchedQuantity);
    return `Total: PHP ${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }, [watchedCost, watchedQuantity]);

  async function onSubmit(formData: ReceivingFormData) {
    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      // Convert itemId and numbers from string to proper types for the server action
      const payload = {
        itemId: Number(formData.itemId),
        quantityCartons: Number(formData.quantityCartons),
        receivedDate: formData.receivedDate,
        costPesos: Number(formData.costPesos),
        notes: formData.notes || undefined,
      };

      const result = await receiveStock(payload);

      if (result.error) {
        setSubmitStatus({ type: "error", message: result.error });
      } else {
        setSubmitStatus({
          type: "success",
          message: "Stock receiving recorded successfully!",
        });
        reset();
      }
    } catch {
      setSubmitStatus({
        type: "error",
        message: "An unexpected error occurred.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-lg">
      {/* Status messages */}
      {submitStatus && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            submitStatus.type === "success"
              ? "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200"
              : "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
          }`}
        >
          {submitStatus.message}
        </div>
      )}

      {/* Item Selector */}
      <div className="space-y-2">
        <Label htmlFor="itemId">Item</Label>
        <select
          id="itemId"
          {...register("itemId", { valueAsNumber: true })}
          className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        >
          <option value={0}>Select an item...</option>
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} ({item.sku}) - {item.type.replace("_", " ")}
            </option>
          ))}
        </select>
        {errors.itemId && (
          <p className="text-sm text-destructive">{errors.itemId.message}</p>
        )}
      </div>

      {/* Quantity in Cartons */}
      <div className="space-y-2">
        <Label htmlFor="quantityCartons">Quantity (Cartons)</Label>
        <Input
          id="quantityCartons"
          type="number"
          step="1"
          min="1"
          {...register("quantityCartons", { valueAsNumber: true })}
        />
        {errors.quantityCartons && (
          <p className="text-sm text-destructive">
            {errors.quantityCartons.message}
          </p>
        )}
        {/* Real-time unit conversion display */}
        {conversionPreview && (
          <p className="text-sm text-muted-foreground">{conversionPreview}</p>
        )}
      </div>

      {/* Received Date */}
      <div className="space-y-2">
        <Label htmlFor="receivedDate">Received Date</Label>
        <Input id="receivedDate" type="date" {...register("receivedDate")} />
        {errors.receivedDate && (
          <p className="text-sm text-destructive">
            {errors.receivedDate.message}
          </p>
        )}
      </div>

      {/* Cost per Carton */}
      <div className="space-y-2">
        <Label htmlFor="costPesos">Cost per Carton (PHP)</Label>
        <Input
          id="costPesos"
          type="number"
          step="0.01"
          min="0"
          {...register("costPesos", { valueAsNumber: true })}
        />
        {errors.costPesos && (
          <p className="text-sm text-destructive">{errors.costPesos.message}</p>
        )}
        {/* Total cost preview */}
        {totalCostPreview && (
          <p className="text-sm font-medium text-muted-foreground">
            {totalCostPreview}
          </p>
        )}
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea
          id="notes"
          placeholder="Supplier name, invoice number, etc."
          {...register("notes")}
        />
        {errors.notes && (
          <p className="text-sm text-destructive">{errors.notes.message}</p>
        )}
      </div>

      {/* Submit */}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Recording..." : "Record Receiving"}
      </Button>
    </form>
  );
}
