"use client";

import { useState, useTransition } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { zReadingFormSchema, type ZReadingFormData } from "@/schemas/z-reading";

interface ZReadingFormProps {
  defaultValues: ZReadingFormData;
  onSubmit: (data: ZReadingFormData) => Promise<void>;
  onCancel: () => void;
  readOnly?: boolean;
}

export function ZReadingForm({
  defaultValues,
  onSubmit,
  onCancel,
  readOnly = false,
}: ZReadingFormProps) {
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ZReadingFormData>({
    resolver: standardSchemaResolver(zReadingFormSchema),
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "lines",
  });

  function handleFormSubmit(data: ZReadingFormData) {
    setFormError(null);
    startTransition(async () => {
      try {
        await onSubmit(data);
      } catch (err) {
        setFormError(
          err instanceof Error ? err.message : "Failed to save"
        );
      }
    });
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit(handleFormSubmit)}
      className="space-y-6"
    >
      {formError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive-muted px-4 py-3 text-sm text-destructive-muted-foreground">
          {formError}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="storeName">Store Name</Label>
          <Input
            id="storeName"
            {...register("storeName")}
            placeholder="Store name"
            readOnly={readOnly}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="receiptNumber">Receipt #</Label>
          <Input
            id="receiptNumber"
            {...register("receiptNumber")}
            placeholder="Receipt number"
            readOnly={readOnly}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="receiptDate">Date</Label>
          <Input
            id="receiptDate"
            type="date"
            {...register("receiptDate")}
            readOnly={readOnly}
            aria-invalid={!!errors.receiptDate}
          />
          {errors.receiptDate && (
            <p className="text-xs text-destructive">
              {errors.receiptDate.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="paymentMethod">Payment Method</Label>
          <Input
            id="paymentMethod"
            {...register("paymentMethod")}
            placeholder="Cash, Card, GCash..."
            readOnly={readOnly}
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Line Items</Label>
          {!readOnly && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                append({
                  productName: "",
                  quantity: 1,
                  unitPricePesos: undefined,
                  lineTotalPesos: undefined,
                })
              }
            >
              <Plus className="mr-1 h-3 w-3" />
              Add Item
            </Button>
          )}
        </div>

        {fields.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No line items. Click &quot;Add Item&quot; to add one.
          </p>
        )}

        {fields.map((field, index) => (
          <div
            key={field.id}
            className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_80px_100px_100px_auto]"
          >
            <div className="space-y-1">
              {index === 0 && (
                <span className="text-xs text-muted-foreground">Product</span>
              )}
              <Input
                {...register(`lines.${index}.productName`)}
                placeholder="Product name"
                readOnly={readOnly}
                aria-invalid={!!errors.lines?.[index]?.productName}
              />
              {errors.lines?.[index]?.productName && (
                <p className="text-xs text-destructive">
                  {errors.lines[index].productName.message}
                </p>
              )}
            </div>
            <div className="space-y-1">
              {index === 0 && (
                <span className="text-xs text-muted-foreground">Qty</span>
              )}
              <Input
                type="number"
                {...register(`lines.${index}.quantity`, {
                  valueAsNumber: true,
                })}
                readOnly={readOnly}
                aria-invalid={!!errors.lines?.[index]?.quantity}
              />
            </div>
            <div className="space-y-1">
              {index === 0 && (
                <span className="text-xs text-muted-foreground">
                  Unit Price
                </span>
              )}
              <Input
                type="number"
                step="0.01"
                {...register(`lines.${index}.unitPricePesos`, {
                  valueAsNumber: true,
                })}
                placeholder="0.00"
                readOnly={readOnly}
              />
            </div>
            <div className="space-y-1">
              {index === 0 && (
                <span className="text-xs text-muted-foreground">
                  Line Total
                </span>
              )}
              <Input
                type="number"
                step="0.01"
                {...register(`lines.${index}.lineTotalPesos`, {
                  valueAsNumber: true,
                })}
                placeholder="0.00"
                readOnly={readOnly}
              />
            </div>
            {!readOnly && fields.length > 1 && (
              <div className={index === 0 ? "pt-5" : ""}>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => remove(index)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="subtotalPesos">Subtotal (&#8369;)</Label>
          <Input
            id="subtotalPesos"
            type="number"
            step="0.01"
            {...register("subtotalPesos", { valueAsNumber: true })}
            placeholder="0.00"
            readOnly={readOnly}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="taxPesos">Tax (&#8369;)</Label>
          <Input
            id="taxPesos"
            type="number"
            step="0.01"
            {...register("taxPesos", { valueAsNumber: true })}
            placeholder="0.00"
            readOnly={readOnly}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="totalPesos">Total (&#8369;)</Label>
          <Input
            id="totalPesos"
            type="number"
            step="0.01"
            {...register("totalPesos", { valueAsNumber: true })}
            placeholder="0.00"
            readOnly={readOnly}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          {...register("notes")}
          placeholder="Optional notes..."
          maxLength={500}
          readOnly={readOnly}
        />
      </div>

      {!readOnly && (
        <div className="flex items-center gap-2">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : "Save"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={isPending}
          >
            Cancel
          </Button>
        </div>
      )}

      {readOnly && (
        <Button type="button" variant="outline" onClick={onCancel}>
          Back to List
        </Button>
      )}
    </form>
  );
}
