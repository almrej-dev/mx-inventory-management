import { z } from "zod/v4";

export const itemSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  sku: z.string().min(1, "SKU is required").max(50, "SKU too long"),
  type: z.enum(["RAW_MATERIAL", "SEMI_FINISHED", "FINISHED", "PACKAGING"]),
  category: z.string().max(50, "Category too long").optional().or(z.literal("")),
  unitWeightGrams: z.number().positive("Weight must be positive"),
  cartonSize: z.number().int().positive("Carton size must be at least 1"),
  costPesos: z.number().nonnegative("Cost cannot be negative"),
  minStockQty: z.number().int().nonnegative("Minimum stock cannot be negative"),
});

export type ItemFormData = z.infer<typeof itemSchema>;
