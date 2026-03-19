"use client";

import { useState, useTransition } from "react";
import { RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { parseReceiptText } from "@/lib/receipt-parser";
import { saveZReading, updateZReading } from "@/actions/z-reading";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import { cn } from "@/lib/utils";
import type { ZReadingFormData } from "@/schemas/z-reading";
import type { AppRole } from "@/types";

interface ZReadingDetailProps {
  reading: {
    id: number;
    storeName: string | null;
    receiptNumber: string | null;
    receiptDate: string | Date;
    subtotal: number;
    tax: number;
    total: number;
    paymentMethod: string | null;
    imageUrl: string;
    signedImageUrl: string;
    rawText: string | null;
    notes: string | null;
    status: string;
    lines: {
      id: number;
      productName: string;
      quantity: number;
      unitPriceCentavos: number;
      lineTotalCentavos: number;
    }[];
  } | null;
  scannedData?: ZReadingFormData;
  rawText?: string;
  imageFile?: File;
  onBack: () => void;
  userRole: AppRole;
}

function buildFormData(text: string): ZReadingFormData {
  const parsed = parseReceiptText(text);
  return {
    storeName: parsed.storeName,
    receiptNumber: parsed.receiptNumber,
    receiptDate: parsed.receiptDate
      ? new Date(parsed.receiptDate).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0],
    subtotalPesos: parsed.subtotal || undefined,
    taxPesos: parsed.tax || undefined,
    totalPesos: parsed.total || undefined,
    paymentMethod: parsed.paymentMethod,
    notes: "",
    lines:
      parsed.lines.length > 0
        ? parsed.lines.map((l) => ({
            productName: l.productName,
            quantity: l.quantity,
            unitPricePesos: l.unitPrice || undefined,
            lineTotalPesos: l.lineTotal || undefined,
          }))
        : [{ productName: "", quantity: 1, unitPricePesos: undefined, lineTotalPesos: undefined }],
  };
}

export function ZReadingDetail({
  reading,
  scannedData,
  rawText,
  imageFile,
  onBack,
  userRole,
}: ZReadingDetailProps) {
  const [imagePreviewUrl] = useState(() => {
    if (imageFile) return URL.createObjectURL(imageFile);
    return reading?.signedImageUrl || "";
  });
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const initialText = rawText || reading?.rawText || "";
  const [editableText, setEditableText] = useState(initialText);

  const isNew = !reading;
  const isReadOnly = userRole === "viewer";

  function handleSave() {
    setFormError(null);
    startTransition(async () => {
      try {
        const data = scannedData ?? buildFormData(editableText);

        if (isNew && imageFile) {
          const supabase = createClient();
          const timestamp = Date.now();
          const safeName = imageFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
          const path = `${timestamp}-${safeName}`;

          const { error: uploadError } = await supabase.storage
            .from("z-readings")
            .upload(path, imageFile);

          if (uploadError)
            throw new Error(`Image upload failed: ${uploadError.message}`);

          const result = await saveZReading(data, path, editableText || undefined);
          if (result.error) throw new Error(result.error);
          setSuccessMessage("Z-reading saved successfully!");
          setTimeout(onBack, 1000);
        } else if (reading) {
          const result = await updateZReading(reading.id, data);
          if (result.error) throw new Error(result.error);
          setSuccessMessage("Z-reading updated successfully!");
          setTimeout(onBack, 1000);
        }
      } catch (err) {
        setFormError(err instanceof Error ? err.message : "Failed to save");
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Left — Receipt image */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">
          Receipt Image
        </p>
        <div className="overflow-hidden rounded-lg border">
          {imagePreviewUrl ? (
            <Image
              src={imagePreviewUrl}
              alt="Receipt"
              width={600}
              height={800}
              className="h-auto w-full object-contain"
              unoptimized
            />
          ) : (
            <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
              No image available
            </div>
          )}
        </div>
      </div>

      {/* Right — Receipt-formatted text */}
      <div className="space-y-4">
        {successMessage && (
          <div className="rounded-lg border border-success/30 bg-success-muted px-4 py-3 text-sm text-success-muted-foreground">
            {successMessage}
          </div>
        )}
        {formError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive-muted px-4 py-3 text-sm text-destructive-muted-foreground">
            {formError}
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">
              OCR Text
            </p>
            {!isReadOnly && editableText !== initialText && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setEditableText(initialText)}
              >
                <RotateCcw className="mr-1 h-3 w-3" />
                Reset
              </Button>
            )}
          </div>

          <div className="rounded-lg border bg-card">
            <textarea
              value={editableText}
              onChange={(e) => setEditableText(e.target.value)}
              readOnly={isReadOnly}
              placeholder="No OCR text available"
              className={cn(
                "block w-full resize-none bg-transparent px-6 py-5 font-mono text-xs leading-relaxed text-card-foreground outline-none",
                "min-h-[400px] whitespace-pre-wrap",
                isReadOnly && "cursor-default"
              )}
            />
          </div>
        </div>

        {!isReadOnly && (
          <div className="flex items-center justify-center gap-2">
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={onBack}
              disabled={isPending}
            >
              Cancel
            </Button>
          </div>
        )}

        {isReadOnly && (
          <div className="flex justify-center">
            <Button type="button" variant="outline" onClick={onBack}>
              Back to List
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
