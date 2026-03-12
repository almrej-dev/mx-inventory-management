import { z } from 'zod/v4';

const ingredientLineSchema = z
  .object({
    childItemId: z.number().int().positive('Select an item'),
    quantityGrams: z
      .number()
      .transform((v) => (isNaN(v) ? 0 : v))
      .pipe(z.number().min(0)),
    quantityPieces: z
      .number()
      .transform((v) => (isNaN(v) ? 0 : v))
      .pipe(z.number().int().min(0))
  })
  .refine(
    ({ quantityGrams, quantityPieces }) =>
      quantityGrams > 0 || quantityPieces > 0,
    { message: 'Enter a quantity greater than 0', path: ['quantityGrams'] }
  );

export const productSchema = z.object({
  ingredients: z
    .array(ingredientLineSchema)
    .min(1, 'At least one item required')
});

export type ProductFormData = z.infer<typeof productSchema>;
