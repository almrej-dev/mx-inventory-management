import { z } from 'zod/v4';

const coerceQuantity = z
  .any()
  .transform((v: unknown) => {
    const num = Number(v);
    return Number.isNaN(num) ? 0 : num;
  });

const ingredientLineSchema = z
  .object({
    childItemId: z.number().int().positive('Please select an item'),
    quantityGrams: coerceQuantity.pipe(
      z.number().min(0, 'Quantity cannot be negative')
    ),
    quantityPieces: coerceQuantity.pipe(
      z.number().int().min(0, 'Quantity cannot be negative')
    )
  })
  .refine(
    ({ quantityGrams, quantityPieces }) =>
      quantityGrams > 0 || quantityPieces > 0,
    { message: 'Quantity cannot be zero', path: ['quantityGrams'] }
  );

export const productSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  sku: z.string().min(1, 'SKU is required').optional(),
  ingredients: z
    .array(ingredientLineSchema)
    .min(1, 'At least one item required')
});

export type ProductFormData = z.infer<typeof productSchema>;
