import { z } from 'zod/v4';

const ingredientLineSchema = z.object({
  childItemId: z.number().int().positive('Select an item'),
  quantityGrams: z.number().nonnegative('Quantity cannot be negative'),
  quantityPieces: z.number().int().nonnegative('Quantity cannot be negative')
});

export const productSchema = z.object({
  ingredients: z
    .array(ingredientLineSchema)
    .min(1, 'At least one item required')
});

export type ProductFormData = z.infer<typeof productSchema>;
