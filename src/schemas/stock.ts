import { z } from "zod/v4";

export const receivingSchema = z.object({
  itemId: z.number().int().positive("Select an item"),
  quantityCartons: z.number().positive("Quantity must be positive"),
  receivedDate: z.string().min(1, "Date is required"),
  costPesos: z.number().nonnegative("Cost cannot be negative"),
  notes: z.string().max(500).optional(),
});

export type ReceivingFormData = z.infer<typeof receivingSchema>;
