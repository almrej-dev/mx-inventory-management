"use client";

import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { wasteSchema, type WasteFormData } from "@/schemas/stock";
import { recordWaste } from "@/actions/stock";
import { WASTE_REASON_CODES } from "@/lib/constants";
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
}

interface WasteFormProps {
  items: ItemOption[];
}

export function WasteForm({ items }: WasteFormProps) {
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
  } = useForm<WasteFormData>({
    resolver: standardSchemaResolver(wasteSchema),
    defaultValues: {
      itemId: 0,
      quantity: 0,
      reasonCode: "",
      notes: "",
    },
  });

  const watchedItemId = watch("itemId");

  // Find selected item to determine unit label
  const selectedItem = useMemo(
    () => items.find((i) => i.id === Number(watchedItemId)),
    [items, watchedItemId]
  );

  // Dynamic unit label based on item type
  const quantityLabel = useMemo(() => {
    if (!selectedItem) return "Quantity";
    return selectedItem.type === "PACKAGING"
      ? "Quantity (pieces)"
      : "Quantity (grams)";
  }, [selectedItem]);

  async function onSubmit(formData: WasteFormData) {
    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      const payload = {
        itemId: Number(formData.itemId),
        quantity: Number(formData.quantity),
        reasonCode: formData.reasonCode,
        notes: formData.notes || undefined,
      };

      const result = await recordWaste(payload);

      if (result.error) {
        setSubmitStatus({ type: "error", message: result.error });
      } else {
        setSubmitStatus({
          type: "success",
          message: "Waste recorded successfully!",
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

      {/* Quantity */}
      <div className="space-y-2">
        <Label htmlFor="quantity">{quantityLabel}</Label>
        <Input
          id="quantity"
          type="number"
          step="0.01"
          min="0.01"
          {...register("quantity", { valueAsNumber: true })}
        />
        {errors.quantity && (
          <p className="text-sm text-destructive">{errors.quantity.message}</p>
        )}
      </div>

      {/* Reason Code */}
      <div className="space-y-2">
        <Label htmlFor="reasonCode">Reason</Label>
        <select
          id="reasonCode"
          {...register("reasonCode")}
          className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        >
          <option value="">Select a reason...</option>
          {WASTE_REASON_CODES.map((code) => (
            <option key={code.value} value={code.value}>
              {code.label}
            </option>
          ))}
        </select>
        {errors.reasonCode && (
          <p className="text-sm text-destructive">
            {errors.reasonCode.message}
          </p>
        )}
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea
          id="notes"
          placeholder="Additional details (optional)"
          {...register("notes")}
        />
        {errors.notes && (
          <p className="text-sm text-destructive">{errors.notes.message}</p>
        )}
      </div>

      {/* Submit */}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Recording..." : "Record Waste"}
      </Button>
    </form>
  );
}
