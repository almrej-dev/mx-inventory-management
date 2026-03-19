'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { itemSchema, type ItemFormData } from '@/schemas/item';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ITEM_TYPES } from '@/lib/constants';
import Link from 'next/link';

interface ItemFormProps {
  initialData?: {
    name: string;
    sku: string;
    type: 'RAW_MATERIAL' | 'SEMI_FINISHED' | 'FINISHED' | 'PACKAGING';
    unitType: 'grams' | 'pcs';
    category: string | null;
    unitWeightMg: number;
    cartonSize: number;
    costPerCartonCentavos: number;
    minStockQty: number;
  };
  onSubmit: (data: ItemFormData) => Promise<{
    success?: boolean;
    error?: Record<string, string[]>;
  }>;
  mode: 'create' | 'edit';
  onDirtyChange?: (isDirty: boolean) => void;
}

const typePrefixes = [
  { prefix: 'RM', meaning: 'Raw Material' },
  { prefix: 'PK', meaning: 'Packaging' }
];

const categoryCodes = [
  { code: 'DC', meaning: 'Dairy & Cream' },
  { code: 'FL', meaning: 'Flavorings' },
  { code: 'FR', meaning: 'Fruits' },
  { code: 'SW', meaning: 'Sweeteners' },
  { code: 'IC', meaning: 'Ice Cream' },
  { code: 'BK', meaning: 'Bakery' },
  { code: 'TP', meaning: 'Toppings' },
  { code: 'CP', meaning: 'Cups & Containers' },
  { code: 'SP', meaning: 'Spoons & Utensils' },
  { code: 'LB', meaning: 'Labels & Stickers' }
];

export function ItemForm({ initialData, onSubmit, mode, onDirtyChange }: ItemFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    clearErrors,
    formState: { errors, isSubmitting, isDirty }
  } = useForm<ItemFormData>({
    resolver: standardSchemaResolver(itemSchema),
    defaultValues: initialData
      ? {
          name: initialData.name,
          sku: initialData.sku,
          type: initialData.type,
          unitType: initialData.unitType,
          category: initialData.category || '',
          unitWeightGrams: initialData.unitWeightMg / 1000,
          cartonSize: initialData.cartonSize,
          costPesos: initialData.costPerCartonCentavos / 100,
          minStockQty: initialData.minStockQty
        }
      : {
          type: 'RAW_MATERIAL',
          unitType: 'grams',
          unitWeightGrams: 0,
          cartonSize: 1,
          costPesos: 0,
          minStockQty: 0
        }
  });

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const unitType = watch('unitType') ?? 'grams';

  const unitWeightGrams = watch('unitWeightGrams');
  const cartonSize = watch('cartonSize');
  const costPesos = watch('costPesos');

  const cartonTotal =
    unitWeightGrams && cartonSize ? cartonSize * unitWeightGrams : 0;

  async function handleFormSubmit(data: ItemFormData) {
    setServerError(null);
    const result = await onSubmit(data);

    if (result.error) {
      if (result.error._form) {
        setServerError(result.error._form[0]);
      } else {
        const allMsgs = Object.values(result.error).flat();
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
        setServerError(parts.join('; '));
      }
    }
  }

  return (
    <div className="flex flex-col-reverse items-start gap-8 lg:flex-row">
      <form
        noValidate
        onSubmit={handleSubmit(handleFormSubmit)}
        onFocus={(e) => {
          const name = (e.target as HTMLElement).getAttribute('name');
          if (name && name in errors) clearErrors(name as keyof ItemFormData);
        }}
        className="w-full max-w-lg space-y-4"
      >
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" placeholder="e.g., Sugar" aria-invalid={!!errors.name} {...register('name')} />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="sku">SKU</Label>
          <Input id="sku" placeholder="e.g., RM-DC-001" aria-invalid={!!errors.sku} {...register('sku')} />
          {errors.sku && (
            <p className="text-sm text-destructive">{errors.sku.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="type">Type</Label>
          <div className="relative">
            <select
              id="type"
              className="flex h-9 w-full appearance-none rounded-lg border border-input bg-background px-2.5 py-2 pr-8 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20"
              aria-invalid={!!errors.type}
              {...register('type')}
            >
              {ITEM_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <svg
              className="pointer-events-none absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </div>
          {errors.type && (
            <p className="text-sm text-destructive">{errors.type.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Category (optional)</Label>
          <Input
            id="category"
            placeholder="e.g., Dairy & Cream"
            aria-invalid={!!errors.category}
            {...register('category')}
          />
          {errors.category && (
            <p className="text-sm text-destructive">
              {errors.category.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="unitWeightGrams">
              Unit {unitType === 'grams' ? 'Weight' : 'Count'}
            </Label>
            <div className="flex overflow-hidden rounded-md border text-xs">
              <button
                type="button"
                className={`px-2.5 py-0.5 transition-colors ${
                  unitType === 'grams'
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
                onClick={() => setValue('unitType', 'grams')}
              >
                g
              </button>
              <button
                type="button"
                className={`px-2.5 py-0.5 transition-colors ${
                  unitType === 'pcs'
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
                onClick={() => setValue('unitType', 'pcs')}
              >
                pcs
              </button>
            </div>
          </div>
          <input type="hidden" {...register('unitType')} />
          <Input
            id="unitWeightGrams"
            type="number"
            min="0"
            step={unitType === 'grams' ? '0.1' : '1'}
            placeholder={unitType === 'grams' ? 'e.g., 850' : 'e.g., 50'}
            aria-invalid={!!errors.unitWeightGrams}
            {...register('unitWeightGrams', { valueAsNumber: true })}
          />
          {errors.unitWeightGrams && (
            <p className="text-sm text-destructive">
              {errors.unitWeightGrams.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="cartonSize">Carton Size (units per carton)</Label>
          <Input
            id="cartonSize"
            type="number"
            min="1"
            step="1"
            placeholder="e.g., 8"
            aria-invalid={!!errors.cartonSize}
            {...register('cartonSize', { valueAsNumber: true })}
          />
          {errors.cartonSize && (
            <p className="text-sm text-destructive">
              {errors.cartonSize.message}
            </p>
          )}
        </div>

        {cartonTotal > 0 && (
          <div className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
            1 carton = {cartonSize} units ={' '}
            {unitType === 'grams'
              ? `${cartonTotal.toLocaleString()}g`
              : `${cartonTotal.toLocaleString()} pcs`}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="costPesos">Cost per Carton (PHP)</Label>
          <Input
            id="costPesos"
            type="number"
            min="0"
            step="0.01"
            placeholder="e.g., 45.50"
            aria-invalid={!!errors.costPesos}
            {...register('costPesos', { valueAsNumber: true })}
          />
          {errors.costPesos && (
            <p className="text-sm text-destructive">
              {errors.costPesos.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="unitCost">Unit Cost (PHP)</Label>
          <Input
            id="unitCost"
            type="text"
            readOnly
            value={
              cartonSize > 0 && costPesos != null && !isNaN(costPesos)
                ? (costPesos / cartonSize).toFixed(2)
                : ''
            }
            placeholder="—"
            className="bg-muted text-muted-foreground pointer-events-none"
            tabIndex={-1}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="minStockQty">
            Minimum Stock Quantity{' '}
            {unitType === 'grams' ? '(in grams)' : '(in pieces)'}
          </Label>
          <Input
            id="minStockQty"
            type="number"
            min="0"
            step="1"
            placeholder="e.g., 10"
            aria-invalid={!!errors.minStockQty}
            {...register('minStockQty', { valueAsNumber: true })}
          />
          {errors.minStockQty && (
            <p className="text-sm text-destructive">
              {errors.minStockQty.message}
            </p>
          )}
        </div>

        {serverError && (
          <p className="text-sm text-destructive">{serverError}</p>
        )}

        <div className="flex gap-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? mode === 'create'
                ? 'Creating...'
                : 'Updating...'
              : mode === 'create'
                ? 'Create Item'
                : 'Update Item'}
          </Button>
          <Link href="/items">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
        </div>
      </form>

      {/* SKU Format Guide sidebar */}
      <aside className="sticky top-4 min-w-0 flex-1 space-y-4 rounded-lg border bg-muted/50 p-4 text-sm">
        <div>
          <h3 className="text-base font-semibold">SKU Format Guide</h3>
          <p className="mt-1 font-mono text-muted-foreground">
            {'{TYPE}'}-{'{CATEGORY}'}-{'{SEQ}'}
          </p>
        </div>

        <div>
          <h4 className="mb-1 font-medium">Type Prefixes</h4>
          <ul className="space-y-0.5 text-muted-foreground">
            {typePrefixes.map((t) => (
              <li key={t.prefix}>
                <span className="font-mono font-semibold text-foreground">
                  {t.prefix}
                </span>{' '}
                = {t.meaning}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="mb-1 font-medium">Category Codes</h4>
          <ul className="space-y-0.5 text-muted-foreground">
            {categoryCodes.map((c) => (
              <li key={c.code}>
                <span className="font-mono font-semibold text-foreground">
                  {c.code}
                </span>{' '}
                = {c.meaning}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="mb-1 font-medium">Sequence</h4>
          <p className="text-muted-foreground">
            3-digit zero-padded number (001-999)
          </p>
        </div>

        <div className="rounded-md border bg-muted/50 p-2 text-xs text-muted-foreground">
          <p>
            SKUs are editable and not auto-generated. Use your own codes if you
            prefer.
          </p>
        </div>
      </aside>
    </div>
  );
}
