import { z } from "zod/v4";

export const zReadingLineSchema = z.object({
  productName: z.string().min(1, "Product name is required"),
  quantity: z.number().int().positive("Quantity must be at least 1"),
  unitPricePesos: z.number().nonnegative("Price cannot be negative").optional(),
  lineTotalPesos: z.number().nonnegative("Total cannot be negative").optional(),
});

export type ZReadingLineFormData = z.infer<typeof zReadingLineSchema>;

export const zReadingFormSchema = z.object({
  storeName: z.string().optional(),
  receiptNumber: z.string().optional(),
  receiptDate: z.string().min(1, "Receipt date is required"),
  subtotalPesos: z.number().nonnegative().optional(),
  taxPesos: z.number().nonnegative().optional(),
  totalPesos: z.number().nonnegative().optional(),
  paymentMethod: z.string().optional(),
  notes: z.string().max(500).optional(),
  lines: z.array(zReadingLineSchema).min(1, "At least one line item is required"),
});

export type ZReadingFormData = z.infer<typeof zReadingFormSchema>;
