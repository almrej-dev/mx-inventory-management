import { z } from "zod/v4";

export const salesLineInputSchema = z.object({
  itemId: z.number().int().positive("Select an item"),
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
