import { z } from "zod/v4";

export const receivingSchema = z.object({
  itemId: z.number().int().positive("Please select an item"),
  quantityCartons: z.number().positive("Quantity must be positive"),
  receivedDate: z.string().min(1, "Date is required"),
  costPesos: z.number().nonnegative("Cost cannot be negative"),
  notes: z.string().max(500).optional(),
});

export type ReceivingFormData = z.infer<typeof receivingSchema>;

export const batchReceivingEntrySchema = z.object({
  itemId: z.number().int().positive(),
  quantityCartons: z.number().positive("Quantity must be positive"),
  receivedDate: z.string().min(1, "Date is required"),
  costPesos: z.number().nonnegative("Cost cannot be negative"),
});

export const batchReceivingSchema = z.object({
  entries: z.array(batchReceivingEntrySchema).min(1, "Enter at least one item"),
  notes: z.string().max(500).optional(),
});

export type BatchReceivingFormData = z.infer<typeof batchReceivingSchema>;

export const wasteSchema = z.object({
  itemId: z.number().int().positive("Please select an item"),
  quantity: z.number().positive("Quantity must be positive"),
  reasonCode: z.string().min(1, "Please select a reason"),
  notes: z.string().max(500).optional(),
});

export type WasteFormData = z.infer<typeof wasteSchema>;

export const batchWasteEntrySchema = z.object({
  itemId: z.number().int().positive(),
  quantity: z.number().positive("Quantity must be positive"),
  reasonCode: z.string().min(1, "Please select a reason"),
});

export const batchWasteSchema = z.object({
  entries: z.array(batchWasteEntrySchema).min(1, "Enter at least one item"),
  notes: z.string().max(500).optional(),
});

export type BatchWasteFormData = z.infer<typeof batchWasteSchema>;

export const reconciliationCountSchema = z.object({
  itemId: z.number().int().positive(),
  physicalCount: z.number().nonnegative("Count cannot be negative"),
});

export const reconciliationSchema = z.object({
  counts: z.array(reconciliationCountSchema).min(1, "Enter at least one count"),
  notes: z.string().max(500).optional(),
});

export type ReconciliationFormData = z.infer<typeof reconciliationSchema>;
