import { z } from "zod/v4";

export const itemSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  sku: z.string().min(1, "SKU is required").max(50, "SKU too long"),
  type: z.enum(["RAW_MATERIAL", "SEMI_FINISHED", "FINISHED", "PACKAGING"]),
  unitType: z.enum(["grams", "pcs"]),
  category: z.string().max(50, "Category too long").optional().or(z.literal("")),
  unitWeightGrams: z
    .number({ error: 'Unit weight is required' })
    .nonnegative('Weight cannot be negative'),
  cartonSize: z
    .number({ error: 'Carton size is required' })
    .int()
    .positive('Carton size must be at least 1'),
  costPesos: z
    .number({ error: 'Cost is required' })
    .nonnegative('Cost cannot be negative'),
  minStockQty: z
    .number({ error: 'Minimum stock quantity is required' })
    .int()
    .nonnegative('Minimum stock cannot be negative'),
});

export type ItemFormData = z.infer<typeof itemSchema>;
