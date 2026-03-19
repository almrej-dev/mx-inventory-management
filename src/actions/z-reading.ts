"use server";

import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { zReadingFormSchema } from "@/schemas/z-reading";
import { humanError } from "@/lib/errors";

export async function getZReadings() {
  await requireRole("viewer");

  try {
    const readings = await prisma.zReading.findMany({
      orderBy: { receiptDate: "desc" },
      include: {
        _count: {
          select: { lines: true },
        },
      },
    });
    return { readings };
  } catch (err) {
    return {
      error: humanError(err, "Failed to load Z-readings"),
      readings: [],
    };
  }
}

export async function getZReadingDetail(id: number) {
  await requireRole("viewer");

  try {
    const reading = await prisma.zReading.findUnique({
      where: { id },
      include: { lines: true },
    });

    if (!reading) return { error: "Z-reading not found" };

    // Generate a signed URL (1 hour expiry) from the stored path
    let signedImageUrl = "";
    if (reading.imageUrl) {
      const supabase = await createClient();
      const { data } = await supabase.storage
        .from("z-readings")
        .createSignedUrl(reading.imageUrl, 3600);
      signedImageUrl = data?.signedUrl || "";
    }

    return { reading: { ...reading, signedImageUrl } };
  } catch (err) {
    return {
      error: humanError(err, "Failed to load Z-reading"),
    };
  }
}

/** Validate that imagePath matches the expected `{timestamp}-{safeName}` format with no traversal */
const IMAGE_PATH_PATTERN = /^\d+-[\w._-]+$/;

export async function saveZReading(rawData: unknown, imagePath: string, rawText?: string) {
  const { user } = await requireRole("staff");

  // Server-side validation: reject paths with traversal or unexpected format
  if (imagePath && !IMAGE_PATH_PATTERN.test(imagePath)) {
    return { error: "Invalid image path." };
  }

  const parsed = zReadingFormSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: "Validation failed. Please check your input." };
  }

  const data = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const reading = await tx.zReading.create({
        data: {
          storeName: data.storeName || null,
          receiptNumber: data.receiptNumber || null,
          receiptDate: new Date(data.receiptDate),
          subtotal: data.subtotalPesos ? Math.round(data.subtotalPesos * 100) : 0,
          tax: data.taxPesos ? Math.round(data.taxPesos * 100) : 0,
          total: data.totalPesos ? Math.round(data.totalPesos * 100) : 0,
          paymentMethod: data.paymentMethod || null,
          imageUrl: imagePath,
          rawText: rawText || null,
          notes: data.notes || null,
          status: "completed",
          createdBy: user.id,
        },
      });

      if (data.lines.length > 0) {
        await tx.zReadingLine.createMany({
          data: data.lines.map((line) => ({
            readingId: reading.id,
            productName: line.productName,
            quantity: line.quantity,
            unitPriceCentavos: line.unitPricePesos
              ? Math.round(line.unitPricePesos * 100)
              : 0,
            lineTotalCentavos: line.lineTotalPesos
              ? Math.round(line.lineTotalPesos * 100)
              : 0,
          })),
        });
      }

      return reading;
    }, { timeout: 15000 });

    revalidatePath("/z-reading");
    return { success: true, readingId: result.id };
  } catch (err) {
    return {
      error: humanError(err, "Failed to save Z-reading"),
    };
  }
}

export async function updateZReading(id: number, rawData: unknown) {
  await requireRole("staff");

  const parsed = zReadingFormSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: "Validation failed. Please check your input." };
  }

  const data = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.zReading.update({
        where: { id },
        data: {
          storeName: data.storeName || null,
          receiptNumber: data.receiptNumber || null,
          receiptDate: new Date(data.receiptDate),
          subtotal: data.subtotalPesos ? Math.round(data.subtotalPesos * 100) : 0,
          tax: data.taxPesos ? Math.round(data.taxPesos * 100) : 0,
          total: data.totalPesos ? Math.round(data.totalPesos * 100) : 0,
          paymentMethod: data.paymentMethod || null,
          notes: data.notes || null,
          status: "completed",
        },
      });

      await tx.zReadingLine.deleteMany({ where: { readingId: id } });

      if (data.lines.length > 0) {
        await tx.zReadingLine.createMany({
          data: data.lines.map((line) => ({
            readingId: id,
            productName: line.productName,
            quantity: line.quantity,
            unitPriceCentavos: line.unitPricePesos
              ? Math.round(line.unitPricePesos * 100)
              : 0,
            lineTotalCentavos: line.lineTotalPesos
              ? Math.round(line.lineTotalPesos * 100)
              : 0,
          })),
        });
      }
    }, { timeout: 15000 });

    revalidatePath("/z-reading");
    return { success: true };
  } catch (err) {
    return {
      error: humanError(err, "Failed to update Z-reading"),
    };
  }
}

export async function deleteZReading(id: number) {
  await requireRole("admin");

  try {
    await prisma.zReading.delete({ where: { id } });
    revalidatePath("/z-reading");
    return { success: true };
  } catch (err) {
    return {
      error: humanError(err, "Failed to delete Z-reading"),
    };
  }
}
