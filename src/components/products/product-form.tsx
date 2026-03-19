'use client';

import { useTransition, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray, type FieldPath } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { productSchema, type ProductFormData } from '@/schemas/product';
import { createProduct, updateProduct } from '@/actions/products';
import { ItemRow } from '@/components/products/item-row';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import Link from 'next/link';

interface IngredientItem {
  id: number;
  name: string;
  sku: string;
  type: string;
  unitType: 'grams' | 'pcs';
  unitWeightMg: number;
  costCentavos: number;
}

interface ProductFormCreateProps {
  mode: 'create';
  productType: 'FINISHED' | 'SEMI_FINISHED';
  ingredientItems: IngredientItem[];
  returnTo: string;
  onDirtyChange?: (isDirty: boolean) => void;
}

interface ProductFormEditProps {
  mode: 'edit';
  defaultValues: ProductFormData;
  parentItemId: number;
  productName: string;
  productSku: string;
  ingredientItems: IngredientItem[];
  returnTo: string;
  onDirtyChange?: (isDirty: boolean) => void;
}

type ProductFormProps = ProductFormCreateProps | ProductFormEditProps;

export function ProductForm(props: ProductFormProps) {
  const { mode, ingredientItems, returnTo, onDirtyChange } = props;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const [productName, setProductName] = useState(
    mode === 'edit' ? (props as ProductFormEditProps).productName : ''
  );
  const [productSku, setProductSku] = useState(
    mode === 'edit' ? (props as ProductFormEditProps).productSku : ''
  );

  const {
    register,
    control,
    handleSubmit,
    watch,
    clearErrors,
    formState: { errors, isDirty }
  } = useForm<ProductFormData>({
    resolver: standardSchemaResolver(productSchema),
    defaultValues:
      mode === 'edit'
        ? (props as ProductFormEditProps).defaultValues
        : {
            ingredients: [
              { childItemId: 0, quantityGrams: NaN, quantityPieces: NaN }
            ]
          }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'ingredients'
  });

  const isNameDirty = mode === 'edit'
    ? productName !== (props as ProductFormEditProps).productName ||
      productSku !== (props as ProductFormEditProps).productSku
    : productName !== '' || productSku !== '';

  useEffect(() => {
    onDirtyChange?.(isDirty || isNameDirty);
  }, [isDirty, isNameDirty, onDirtyChange]);

  const watchedIngredients = watch('ingredients');

  function onSubmit(data: ProductFormData) {
    setFormError(null);

    startTransition(async () => {
      if (mode === 'create') {
        const { productType } = props as ProductFormCreateProps;
        const result = await createProduct(
          productType,
          productName,
          productSku,
          data
        );

        if ('success' in result && result.success) {
          router.push(returnTo);
          return;
        }

        if ('error' in result && result.error) {
          const err = result.error as Record<string, string[]>;
          if (err._form) {
            setFormError(err._form[0]);
          } else {
            const allMsgs = Object.values(err).flat();
            const requiredFields: string[] = [];
            const otherMsgs: string[] = [];
            for (const msg of allMsgs) {
              const match = msg.match(/^(.+?) is required$/);
              if (match) requiredFields.push(match[1]);
              else otherMsgs.push(msg);
            }
            const parts: string[] = [];
            if (requiredFields.length) parts.push(`${requiredFields.join(', ')} is required`);
            parts.push(...otherMsgs);
            setFormError(parts.join('; '));
          }
        }
      } else {
        const { parentItemId } = props as ProductFormEditProps;
        const result = await updateProduct(parentItemId, {
          ...data,
          name: productName,
          sku: productSku,
        });

        if ('success' in result && result.success) {
          router.push(returnTo);
          return;
        }

        if ('error' in result && result.error) {
          const err = result.error as Record<string, string[]>;
          if (err._form) {
            setFormError(err._form[0]);
          } else {
            const allMsgs = Object.values(err).flat();
            const requiredFields: string[] = [];
            const otherMsgs: string[] = [];
            for (const msg of allMsgs) {
              const match = msg.match(/^(.+?) is required$/);
              if (match) requiredFields.push(match[1]);
              else otherMsgs.push(msg);
            }
            const parts: string[] = [];
            if (requiredFields.length) parts.push(`${requiredFields.join(', ')} is required`);
            parts.push(...otherMsgs);
            setFormError(parts.join('; '));
          }
        }
      }
    });
  }

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} onFocus={(e) => { const name = (e.target as HTMLElement).getAttribute('name'); if (name) clearErrors(name as FieldPath<ProductFormData>); }} className="max-w-2xl space-y-6">
      {/* Form-level error */}
      {formError && (
        <div className="rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {formError}
        </div>
      )}

      {/* Product Identity */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="productName">Product Name</Label>
          <Input
            id="productName"
            placeholder="e.g. Chocolate Cake"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="productSku">SKU</Label>
          <Input
            id="productSku"
            placeholder="e.g. FIN-001"
            value={productSku}
            onChange={(e) => setProductSku(e.target.value.toUpperCase())}
          />
        </div>
      </div>

      {/* Items Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Items</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              append({ childItemId: 0, quantityGrams: NaN, quantityPieces: NaN })
            }
          >
            <Plus className="mr-1 h-3 w-3" />
            Add Item
          </Button>
        </div>

        {errors.ingredients?.root && (
          <p className="text-sm text-destructive">
            {errors.ingredients.root.message}
          </p>
        )}

        <div className="space-y-2">
          {fields.map((field, index) => {
            const childItemId = Number(
              watchedIngredients?.[index]?.childItemId ?? 0
            );
            const selectedItem = ingredientItems.find(
              (item) => item.id === childItemId
            );
            const unitType = selectedItem?.unitType ?? 'grams';
            return (
              <ItemRow
                key={field.id}
                index={index}
                unitType={unitType}
                register={register}
                onRemove={() => remove(index)}
                ingredientItems={ingredientItems}
                errors={errors.ingredients}
                canRemove={fields.length > 1}
              />
            );
          })}
        </div>
      </div>

      {/* Submit / Cancel */}
      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending
            ? mode === 'create'
              ? 'Creating...'
              : 'Updating...'
            : mode === 'create'
              ? 'Create Product'
              : 'Update Product'}
        </Button>
        <Link href={returnTo}>
          <Button type="button" variant="outline">
            Cancel
          </Button>
        </Link>
      </div>
    </form>
  );
}
