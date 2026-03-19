"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, type FieldPath } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import {
  manualEntrySchema,
  type ManualEntryFormData,
} from "@/schemas/sales";
import { getFinishedItems, processSalesLines } from "@/actions/sales";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";

interface FinishedItem {
  id: number;
  name: string;
  sku: string;
}

export function ManualEntryForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [finishedItems, setFinishedItems] = useState<FinishedItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);

  const {
    register,
    control,
    handleSubmit,
    clearErrors,
    formState: { errors },
  } = useForm<ManualEntryFormData>({
    resolver: standardSchemaResolver(manualEntrySchema),
    defaultValues: {
      saleDate: new Date().toISOString().split("T")[0],
      lines: [{ itemId: 0, quantity: 1, unitPricePesos: undefined }],
      notes: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "lines",
  });

  // Load finished items on mount
  useEffect(() => {
    async function loadItems() {
      const result = await getFinishedItems();
      if (result.items) {
        setFinishedItems(result.items);
      }
      setLoadingItems(false);
    }
    loadItems();
  }, []);

  function onSubmit(data: ManualEntryFormData) {
    setFormError(null);
    setFormSuccess(null);

    startTransition(async () => {
      // Map form data to processSalesLines input
      const lines = data.lines.map((line) => {
        const item = finishedItems.find((i) => i.id === Number(line.itemId));
        return {
          itemId: Number(line.itemId),
          productName: item?.name || "Unknown Product",
          quantity: Number(line.quantity),
          unitPriceCentavos: line.unitPricePesos
            ? Math.round(Number(line.unitPricePesos) * 100)
            : undefined,
        };
      });

      const result = await processSalesLines({
        source: "manual",
        saleDate: data.saleDate,
        notes: data.notes || undefined,
        lines,
      });

      if (result.error) {
        setFormError(result.error);
        return;
      }

      setFormSuccess("Sales recorded successfully! Redirecting...");
      setTimeout(() => {
        router.push("/sales/history");
      }, 1000);
    });
  }

  if (loadingItems) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        Loading products...
      </div>
    );
  }

  if (finishedItems.length === 0) {
    return (
      <div className="rounded-lg border px-4 py-8 text-center">
        <p className="text-muted-foreground">
          No sellable products found. Create a finished item with a recipe
          first.
        </p>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} onFocus={(e) => { const name = (e.target as HTMLElement).getAttribute('name'); if (name) clearErrors(name as FieldPath<ManualEntryFormData>); }} className="max-w-2xl space-y-6">
      {/* Status messages */}
      {formError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive-muted px-4 py-3 text-sm text-destructive-muted-foreground">
          {formError}
        </div>
      )}
      {formSuccess && (
        <div className="rounded-lg border border-success/30 bg-success-muted px-4 py-3 text-sm text-success-muted-foreground">
          {formSuccess}
        </div>
      )}

      {/* Sale Date */}
      <div className="space-y-2">
        <Label htmlFor="saleDate">Sale Date</Label>
        <Input id="saleDate" type="date" aria-invalid={!!errors.saleDate} {...register("saleDate")} />
        {errors.saleDate && (
          <p className="text-sm text-destructive">{errors.saleDate.message}</p>
        )}
      </div>

      {/* Sales Lines */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Sales Lines</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              append({ itemId: 0, quantity: 1, unitPricePesos: undefined })
            }
          >
            <Plus className="mr-1 h-3 w-3" />
            Add Line
          </Button>
        </div>

        {errors.lines?.root && (
          <p className="text-sm text-destructive">
            {errors.lines.root.message}
          </p>
        )}

        <div className="space-y-3">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="space-y-3 rounded-lg border p-3 sm:space-y-0 sm:flex sm:items-start sm:gap-3"
            >
              {/* Product Selector */}
              <div className="flex-1 space-y-1">
                <label
                  htmlFor={`lines.${index}.itemId`}
                  className="text-xs font-medium text-muted-foreground"
                >
                  Product
                </label>
                <div className="relative">
                  <select
                    id={`lines.${index}.itemId`}
                    {...register(`lines.${index}.itemId`, {
                      valueAsNumber: true,
                    })}
                    aria-invalid={!!errors.lines?.[index]?.itemId}
                    className="flex h-9 w-full appearance-none rounded-lg border border-input bg-background px-2.5 py-2 pr-8 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20"
                  >
                    <option value={0}>Select a product...</option>
                    {finishedItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.sku})
                      </option>
                    ))}
                  </select>
                  <svg
                    className="pointer-events-none absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </div>
                {errors.lines?.[index]?.itemId && (
                  <p className="text-xs text-destructive">
                    {errors.lines[index].itemId.message}
                  </p>
                )}
              </div>

              <div className="flex items-start gap-3">
                {/* Quantity */}
                <div className="w-full space-y-1 sm:w-24">
                  <label
                    htmlFor={`lines.${index}.quantity`}
                    className="text-xs font-medium text-muted-foreground"
                  >
                    Qty
                  </label>
                  <Input
                    id={`lines.${index}.quantity`}
                    type="number"
                    min="1"
                    step="1"
                    aria-invalid={!!errors.lines?.[index]?.quantity}
                    {...register(`lines.${index}.quantity`, {
                      valueAsNumber: true,
                    })}
                  />
                  {errors.lines?.[index]?.quantity && (
                    <p className="text-xs text-destructive">
                      {errors.lines[index].quantity.message}
                    </p>
                  )}
                </div>

                {/* Unit Price (optional) */}
                <div className="w-full space-y-1 sm:w-32">
                  <label
                    htmlFor={`lines.${index}.unitPricePesos`}
                    className="text-xs font-medium text-muted-foreground"
                  >
                    Price (PHP)
                  </label>
                  <Input
                    id={`lines.${index}.unitPricePesos`}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Optional"
                    aria-invalid={!!errors.lines?.[index]?.unitPricePesos}
                    {...register(`lines.${index}.unitPricePesos`, {
                      valueAsNumber: true,
                      setValueAs: (v: string) => {
                        if (v === "" || v === undefined) return undefined;
                        const num = Number(v);
                        return isNaN(num) ? undefined : num;
                      },
                    })}
                  />
                  {errors.lines?.[index]?.unitPricePesos && (
                    <p className="text-xs text-destructive">
                      {errors.lines[index].unitPricePesos.message}
                    </p>
                  )}
                </div>

                {/* Remove Button */}
                {fields.length > 1 && (
                  <div className="pt-5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => remove(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea
          id="notes"
          placeholder="Any additional notes about this sale..."
          maxLength={500}
          aria-invalid={!!errors.notes}
          {...register("notes")}
        />
        {errors.notes && (
          <p className="text-sm text-destructive">{errors.notes.message}</p>
        )}
      </div>

      {/* Submit */}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Processing..." : "Record Sale"}
      </Button>
    </form>
  );
}
