import { z } from 'zod/v4';

const ingredientLineSchema = z.object({
  childItemId: z.number().int().positive('Select an item'),
  quantityGrams: z.number().positive('Quantity must be greater than 0'),
  quantityPieces: z.number().int().positive('Quantity must be greater than 0')
});

export const productSchema = z.object({
  ingredients: z
    .array(ingredientLineSchema)
    .min(1, 'At least one item required')
});

export type ProductFormData = z.infer<typeof productSchema>;
