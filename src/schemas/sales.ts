import { z } from "zod/v4";

export const salesLineInputSchema = z.object({
  itemId: z.number().int().positive("Please select an item"),
  productName: z.string().min(1, "Product name is required"),
  quantity: z.number().int().positive("Quantity must be at least 1"),
  unitPriceCentavos: z.number().int().nonnegative("Price cannot be negative").optional(),
});

export type SalesLineInput = z.infer<typeof salesLineInputSchema>;

export const processSalesSchema = z.object({
  fileName: z.string().optional(),
  source: z.enum(["upload", "manual"]),
  saleDate: z.string().min(1, "Sale date is required"),
  notes: z.string().max(500).optional(),
  lines: z.array(salesLineInputSchema).min(1, "At least one sales line is required"),
});

export type ProcessSalesData = z.infer<typeof processSalesSchema>;

export const manualEntryLineSchema = z.object({
  itemId: z.number().int().positive("Please select a product"),
  quantity: z.number().int().positive("Quantity must be at least 1"),
  unitPricePesos: z.number().nonnegative("Price cannot be negative").optional(),
});

export const manualEntrySchema = z.object({
  saleDate: z.string().min(1, "Sale date is required"),
  lines: z.array(manualEntryLineSchema).min(1, "At least one sales line is required"),
  notes: z.string().max(500).optional(),
});

export type ManualEntryFormData = z.infer<typeof manualEntrySchema>;
