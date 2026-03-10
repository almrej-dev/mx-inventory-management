import { z } from "zod/v4";

export const receivingSchema = z.object({
  itemId: z.number().int().positive("Select an item"),
  quantityCartons: z.number().positive("Quantity must be positive"),
  receivedDate: z.string().min(1, "Date is required"),
  costPesos: z.number().nonnegative("Cost cannot be negative"),
  notes: z.string().max(500).optional(),
});

export type ReceivingFormData = z.infer<typeof receivingSchema>;

export const wasteSchema = z.object({
  itemId: z.number().int().positive("Select an item"),
  quantity: z.number().positive("Quantity must be positive"),
  reasonCode: z.string().min(1, "Select a reason"),
  notes: z.string().max(500).optional(),
});

export type WasteFormData = z.infer<typeof wasteSchema>;

export const reconciliationCountSchema = z.object({
  itemId: z.number().int().positive(),
  physicalCount: z.number().nonnegative("Count cannot be negative"),
});

export const reconciliationSchema = z.object({
  counts: z.array(reconciliationCountSchema).min(1, "Enter at least one count"),
  notes: z.string().max(500).optional(),
});

export type ReconciliationFormData = z.infer<typeof reconciliationSchema>;
