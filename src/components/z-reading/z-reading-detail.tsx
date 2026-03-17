"use client";

import { useState } from "react";
import { ZReadingForm } from "./z-reading-form";
import { saveZReading, updateZReading } from "@/actions/z-reading";
import { createClient } from "@/lib/supabase/client";
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
  imageFile?: File;
  onBack: () => void;
  userRole: AppRole;
}

export function ZReadingDetail({
  reading,
  scannedData,
  imageFile,
  onBack,
  userRole,
}: ZReadingDetailProps) {
  const [imagePreviewUrl] = useState(() => {
    if (imageFile) return URL.createObjectURL(imageFile);
    return reading?.imageUrl || "";
  });
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isReadOnly = userRole === "viewer";
  const isNew = !reading;

  const defaultValues: ZReadingFormData = scannedData || {
    storeName: reading?.storeName || "",
    receiptNumber: reading?.receiptNumber || "",
    receiptDate: reading
      ? new Date(reading.receiptDate).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0],
    subtotalPesos: reading ? reading.subtotal / 100 : undefined,
    taxPesos: reading ? reading.tax / 100 : undefined,
    totalPesos: reading ? reading.total / 100 : undefined,
    paymentMethod: reading?.paymentMethod || "",
    notes: reading?.notes || "",
    lines:
      reading?.lines.map((l) => ({
        productName: l.productName,
        quantity: l.quantity,
        unitPricePesos: l.unitPriceCentavos / 100,
        lineTotalPesos: l.lineTotalCentavos / 100,
      })) || [],
  };

  async function handleSubmit(data: ZReadingFormData) {
    if (isNew && imageFile) {
      const supabase = createClient();
      const timestamp = Date.now();
      const safeName = imageFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${timestamp}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("z-readings")
        .upload(path, imageFile);

      if (uploadError) {
        throw new Error(`Image upload failed: ${uploadError.message}`);
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("z-readings").getPublicUrl(path);

      const result = await saveZReading(data, publicUrl);
      if (result.error) throw new Error(result.error);
      setSuccessMessage("Z-reading saved successfully!");
      setTimeout(onBack, 1000);
    } else if (reading) {
      const result = await updateZReading(reading.id, data);
      if (result.error) throw new Error(result.error);
      setSuccessMessage("Z-reading updated successfully!");
      setTimeout(onBack, 1000);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">
          Receipt Image
        </p>
        <div className="overflow-hidden rounded-lg border">
          {imagePreviewUrl ? (
            <img
              src={imagePreviewUrl}
              alt="Receipt"
              className="h-auto w-full object-contain"
            />
          ) : (
            <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
              No image available
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {successMessage && (
          <div className="rounded-lg border border-success/30 bg-success-muted px-4 py-3 text-sm text-success-muted-foreground">
            {successMessage}
          </div>
        )}

        <ZReadingForm
          defaultValues={defaultValues}
          onSubmit={handleSubmit}
          onCancel={onBack}
          readOnly={isReadOnly}
        />
      </div>
    </div>
  );
}
