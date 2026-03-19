'use client';

import { useTransition, useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray, type FieldPath } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { productSchema, type ProductFormData } from '@/schemas/product';
import { useFormPersistence } from '@/hooks/use-form-persistence';
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

interface ProductDraftMeta {
  productName?: string;
  productSku?: string;
}

function getDraftKey(props: ProductFormProps): string {
  if (props.mode === 'create') {
    return `product-create-${props.productType.toLowerCase()}`;
  }
  return `product-edit-${(props as ProductFormEditProps).parentItemId}`;
}

function loadProductMeta(key: string): ProductDraftMeta {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(`mx-draft-meta:${key}`);
    return raw ? (JSON.parse(raw) as ProductDraftMeta) : {};
  } catch {
    return {};
  }
}

function saveProductMeta(key: string, meta: ProductDraftMeta) {
  try {
    localStorage.setItem(`mx-draft-meta:${key}`, JSON.stringify(meta));
  } catch {
    // ignore
  }
}

function clearProductMeta(key: string) {
  try {
    localStorage.removeItem(`mx-draft-meta:${key}`);
  } catch {
    // ignore
  }
}

export function ProductForm(props: ProductFormProps) {
  const { mode, ingredientItems, returnTo, onDirtyChange } = props;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const isCreate = mode === 'create';
  const draftKey = getDraftKey(props);

  // Create mode extra fields
  const [productName, setProductName] = useState('');
  const [productSku, setProductSku] = useState('');

  // Restore product meta draft after hydration
  useEffect(() => {
    if (!isCreate) return;
    const meta = loadProductMeta(draftKey);
    if (meta.productName) setProductName(meta.productName);
    if (meta.productSku) setProductSku(meta.productSku);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist productName/productSku changes
  const metaTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const persistMeta = useCallback(
    (name: string, sku: string) => {
      if (!isCreate) return;
      if (metaTimerRef.current) clearTimeout(metaTimerRef.current);
      metaTimerRef.current = setTimeout(() => saveProductMeta(draftKey, { productName: name, productSku: sku }), 300);
    },
    [isCreate, draftKey]
  );
  useEffect(() => () => { if (metaTimerRef.current) clearTimeout(metaTimerRef.current); }, []);

  const createDefaults: ProductFormData = {
    ingredients: [{ childItemId: 0, quantityGrams: NaN, quantityPieces: NaN }]
  };

  const form = useForm<ProductFormData>({
    resolver: standardSchemaResolver(productSchema),
    defaultValues:
      mode === 'edit'
        ? (props as ProductFormEditProps).defaultValues
        : createDefaults
  });

  const {
    register,
    control,
    handleSubmit,
    watch,
    clearErrors,
    formState: { errors, isDirty }
  } = form;

  const { clearDraft } = useFormPersistence(draftKey, form, isCreate);

  function clearAllDrafts() {
    clearDraft();
    if (metaTimerRef.current) clearTimeout(metaTimerRef.current);
    clearProductMeta(draftKey);
  }

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
          clearAllDrafts();
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
      {mode === 'create' ? (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="productName">Product Name</Label>
            <Input
              id="productName"
              placeholder="e.g. Chocolate Cake"
              value={productName}
              onChange={(e) => { setProductName(e.target.value); persistMeta(e.target.value, productSku); }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="productSku">SKU</Label>
            <Input
              id="productSku"
              placeholder="e.g. FIN-001"
              value={productSku}
              onChange={(e) => { const v = e.target.value.toUpperCase(); setProductSku(v); persistMeta(productName, v); }}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">Product</p>
          <p className="text-base font-semibold">
            {(props as ProductFormEditProps).productName}{' '}
            <span className="font-mono text-sm font-normal text-muted-foreground">
              {(props as ProductFormEditProps).productSku}
            </span>
          </p>
        </div>
      )}

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
        <Link href={returnTo} onClick={() => { if (isCreate) clearAllDrafts(); }}>
          <Button type="button" variant="outline">
            Cancel
          </Button>
        </Link>
      </div>
    </form>
  );
}
