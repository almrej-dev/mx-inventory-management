import { z } from "zod/v4";

const ingredientLineSchema = z.object({
  childItemId: z.number().int().positive("Select an ingredient"),
  quantityGrams: z.number().nonnegative("Quantity cannot be negative"),
  quantityPieces: z.number().int().nonnegative("Quantity cannot be negative"),
});

export const recipeSchema = z.object({
  parentItemId: z.number().int().positive("Select a product"),
  ingredients: z
    .array(ingredientLineSchema)
    .min(1, "At least one ingredient required"),
});

export type RecipeFormData = z.infer<typeof recipeSchema>;
