'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { ITEM_TYPES } from '@/lib/constants';
import { ArrowUpDown, Eye, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import type { ProductListItem } from '@/actions/products';
import { mgToGrams } from '@/lib/utils';

const typeLabels: Record<string, string> = {};
for (const t of ITEM_TYPES) {
  typeLabels[t.value] = t.label;
}

interface ColumnOptions {
  onDelete: (id: number, name: string) => void;
}

export function getProductColumns({
  onDelete
}: ColumnOptions): ColumnDef<ProductListItem>[] {
  return [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="-ml-2"
        >
          Product Name
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      )
    },
    {
      accessorKey: 'sku',
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="-ml-2"
        >
          SKU
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.getValue('sku')}</span>
      )
    },
    {
      accessorKey: 'ingredients',
      header: 'Items',
      cell: ({ row }) => {
        const ingredients = row.getValue('ingredients') as { name: string; sku: string; quantityMg: number }[];
        if (!ingredients.length) return <span className="text-muted-foreground">—</span>;
        return ingredients.map((i) =>
          i.quantityMg > 0 ? `${i.name} (${mgToGrams(i.quantityMg)}g)` : i.name
        ).join(', ');
      }
    },
    {
      accessorKey: 'totalWeightMg',
      header: 'Total Weight',
      cell: ({ row }) => {
        const totalWeightMg = row.getValue('totalWeightMg') as number;
        if (!totalWeightMg) return <span className="text-muted-foreground">—</span>;
        return `${mgToGrams(totalWeightMg)}g`;
      }
    },
    {
      accessorKey: 'totalCostCentavos',
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="-ml-2"
        >
          Cost
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => {
        const product = row.original;
        return `PHP ${product.costPesos}`;
      }
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const product = row.original;
        return (
          <div className="flex items-center gap-1">
            <Link href={`/products/${product.id}`}>
              <Button variant="ghost" size="icon-xs">
                <Eye className="h-3 w-3" />
              </Button>
            </Link>
            <Link href={`/products/${product.id}/edit`}>
              <Button variant="ghost" size="icon-xs">
                <Pencil className="h-3 w-3" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => onDelete(product.id, product.name)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        );
      }
    }
  ];
}
