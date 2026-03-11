'use client';

import { type UseFormRegister, type FieldErrors } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import type { ProductFormData } from '@/schemas/product';

interface IngredientItem {
  id: number;
  name: string;
  sku: string;
}

interface IngredientRowProps {
  index: number;
  unitType: 'grams' | 'pcs';
  register: UseFormRegister<ProductFormData>;
  onRemove: () => void;
  ingredientItems: IngredientItem[];
  errors?: FieldErrors<ProductFormData>['ingredients'];
  canRemove: boolean;
}

export function ItemRow({
  index,
  unitType,
  register,
  onRemove,
  ingredientItems,
  errors,
  canRemove
}: IngredientRowProps) {
  const isGrams = unitType === 'grams';
  const rowErrors = errors?.[index];

  return (
    <div className="flex items-start gap-3">
      {/* Item Select */}
      <div className="flex-1 space-y-1">
        <select
          className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          {...register(`ingredients.${index}.childItemId`, {
            setValueAs: Number
          })}
        >
          <option value={0}>Select item...</option>
          {ingredientItems.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} ({item.sku})
            </option>
          ))}
        </select>
        {rowErrors?.childItemId && (
          <p className="text-xs text-destructive">
            {rowErrors.childItemId.message}
          </p>
        )}
      </div>

      {/* Quantity Input */}
      <div className="w-32 space-y-1">
        {!isGrams ? (
          <>
            <Input
              type="number"
              step="1"
              min="0"
              placeholder="Qty"
              className="h-8"
              {...register(`ingredients.${index}.quantityPieces`, {
                valueAsNumber: true
              })}
            />
            {rowErrors?.quantityPieces && (
              <p className="text-xs text-destructive">
                {rowErrors.quantityPieces.message}
              </p>
            )}
          </>
        ) : (
          <>
            <Input
              type="number"
              step="0.1"
              min="0"
              placeholder="Qty"
              className="h-8"
              {...register(`ingredients.${index}.quantityGrams`, {
                valueAsNumber: true
              })}
            />
            {rowErrors?.quantityGrams && (
              <p className="text-xs text-destructive">
                {rowErrors.quantityGrams.message}
              </p>
            )}
          </>
        )}
      </div>

      {/* Unit Label */}
      <div className="flex h-8 w-10 items-center text-sm text-muted-foreground">
        {isGrams ? 'g' : 'pcs'}
      </div>

      {/* Remove Button */}
      {canRemove && (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={onRemove}
          className="mt-1 text-destructive hover:text-destructive"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
