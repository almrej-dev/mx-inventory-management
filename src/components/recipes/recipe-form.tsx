"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { recipeSchema, type RecipeFormData } from "@/schemas/recipe";
import { createRecipe, updateRecipe } from "@/actions/recipes";
import { IngredientRow } from "@/components/recipes/ingredient-row";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

interface ParentItem {
  id: number;
  name: string;
  sku: string;
  type: string;
}

interface IngredientItem {
  id: number;
  name: string;
  sku: string;
  type: string;
  unitWeightMg: number;
  costCentavos: number;
}

interface RecipeFormProps {
  mode: "create" | "edit";
  defaultValues?: RecipeFormData;
  parentItems: ParentItem[];
  ingredientItems: IngredientItem[];
  parentItemId?: number;
}

export function RecipeForm({
  mode,
  defaultValues,
  parentItems,
  ingredientItems,
  parentItemId,
}: RecipeFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RecipeFormData>({
    resolver: standardSchemaResolver(recipeSchema),
    defaultValues: defaultValues || {
      parentItemId: parentItemId || 0,
      ingredients: [{ childItemId: 0, quantityGrams: 0, quantityPieces: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "ingredients",
  });

  function onSubmit(data: RecipeFormData) {
    setFormError(null);

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createRecipe(data)
          : await updateRecipe(parentItemId!, data);

      if ("success" in result && result.success) {
        router.push("/recipes");
        return;
      }

      if ("error" in result && result.error) {
        const err = result.error as Record<string, string[]>;
        if (err._form) {
          setFormError(err._form[0]);
        } else {
          const messages = Object.entries(err)
            .map(([field, msgs]) => `${field}: ${msgs.join(", ")}`)
            .join("; ");
          setFormError(messages);
        }
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl space-y-6">
      {/* Form-level error */}
      {formError && (
        <div className="rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {formError}
        </div>
      )}

      {/* Parent Product Selector */}
      <div className="space-y-2">
        <Label htmlFor="parentItemId">Product</Label>
        {mode === "edit" ? (
          <>
            <select
              id="parentItemId"
              disabled
              className="flex h-8 w-full rounded-lg border border-input bg-muted px-2.5 py-1 text-sm outline-none"
              {...register("parentItemId", { valueAsNumber: true })}
            >
              {parentItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.sku})
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Product cannot be changed when editing a recipe.
            </p>
          </>
        ) : (
          <select
            id="parentItemId"
            className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            {...register("parentItemId", { valueAsNumber: true })}
          >
            <option value={0}>Select a product...</option>
            {parentItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({item.sku})
              </option>
            ))}
          </select>
        )}
        {errors.parentItemId && (
          <p className="text-sm text-destructive">
            {errors.parentItemId.message}
          </p>
        )}
      </div>

      {/* Ingredients Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Ingredients</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              append({ childItemId: 0, quantityGrams: 0, quantityPieces: 0 })
            }
          >
            <Plus className="mr-1 h-3 w-3" />
            Add Ingredient
          </Button>
        </div>

        {errors.ingredients?.root && (
          <p className="text-sm text-destructive">
            {errors.ingredients.root.message}
          </p>
        )}

        <div className="space-y-2">
          {fields.map((field, index) => (
            <IngredientRow
              key={field.id}
              index={index}
              control={control}
              register={register}
              onRemove={() => remove(index)}
              ingredientItems={ingredientItems}
              errors={errors.ingredients}
              canRemove={fields.length > 1}
            />
          ))}
        </div>
      </div>

      {/* Submit / Cancel */}
      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending
            ? mode === "create"
              ? "Creating..."
              : "Updating..."
            : mode === "create"
              ? "Create Recipe"
              : "Update Recipe"}
        </Button>
        <Link href="/recipes">
          <Button type="button" variant="outline">
            Cancel
          </Button>
        </Link>
      </div>
    </form>
  );
}
