'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ITEM_TYPES } from '@/lib/constants';
import { ArrowUp, ArrowDown, ArrowUpDown, Eye, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import type { ProductListItem } from '@/actions/products';
import { mgToGrams } from '@/lib/utils';

const typeLabels: Record<string, string> = {};
for (const t of ITEM_TYPES) {
  typeLabels[t.value] = t.label;
}

function cycleSorting(column: { getIsSorted: () => false | "asc" | "desc"; toggleSorting: (desc: boolean) => void; clearSorting: () => void }) {
  const sorted = column.getIsSorted();
  if (sorted === false) column.toggleSorting(false);
  else if (sorted === "asc") column.toggleSorting(true);
  else column.clearSorting();
}

function SortIcon({ column }: { column: { getIsSorted: () => false | "asc" | "desc" } }) {
  const sorted = column.getIsSorted();
  if (sorted === "asc") return <ArrowUp className="ml-1 h-3 w-3" />;
  if (sorted === "desc") return <ArrowDown className="ml-1 h-3 w-3" />;
  return <ArrowUpDown className="ml-1 h-3 w-3 text-muted-foreground/50" />;
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
      sortingFn: (rowA, rowB) =>
        (rowA.getValue("name") as string).localeCompare(
          rowB.getValue("name") as string,
          undefined,
          { numeric: true, sensitivity: "base" }
        ),
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => cycleSorting(column)}
          className="-ml-2 whitespace-nowrap"
        >
          Product Name
          <SortIcon column={column} />
        </Button>
      )
    },
    {
      accessorKey: 'sku',
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => cycleSorting(column)}
          className="-ml-2 whitespace-nowrap"
        >
          SKU
          <SortIcon column={column} />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.getValue('sku')}</span>
      )
    },
    {
      accessorKey: 'ingredients',
      sortingFn: (rowA, rowB) => {
        const a = (rowA.getValue('ingredients') as { name: string }[]).length;
        const b = (rowB.getValue('ingredients') as { name: string }[]).length;
        return a - b;
      },
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => cycleSorting(column)}
          className="-ml-2 whitespace-nowrap"
        >
          Items
          <SortIcon column={column} />
        </Button>
      ),
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
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => cycleSorting(column)}
          className="-ml-2 whitespace-nowrap"
        >
          Total Weight
          <SortIcon column={column} />
        </Button>
      ),
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
          onClick={() => cycleSorting(column)}
          className="-ml-2 whitespace-nowrap"
        >
          Cost
          <SortIcon column={column} />
        </Button>
      ),
      cell: ({ row }) => {
        const product = row.original;
        return `PHP ${product.costPesos}`;
      }
    },
    {
      id: 'actions',
      size: 48,
      header: '',
      cell: ({ row }) => {
        const product = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="icon-xs" />}
            >
              <MoreVertical className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem render={<Link href={`/products/${product.id}`} />}>
                <Eye className="h-4 w-4" />
                View
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link href={`/products/${product.id}/edit`} />}>
                <Pencil className="h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onDelete(product.id, product.name)}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      }
    }
  ];
}
