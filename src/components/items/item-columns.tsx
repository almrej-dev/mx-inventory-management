"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ITEM_TYPES } from "@/lib/constants";
import { mgToGrams, centavosToPesos } from "@/lib/utils";
import { ArrowUp, ArrowDown, ArrowUpDown, MoreVertical, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import type { ItemWithDisplayValues } from "@/actions/items";

const typeLabels: Record<string, string> = {};
for (const t of ITEM_TYPES) {
  typeLabels[t.value] = t.label;
}

const typeBadgeVariants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  RAW_MATERIAL: "default",
  SEMI_FINISHED: "secondary",
  FINISHED: "outline",
  PACKAGING: "secondary",
};

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

export function getItemColumns({ onDelete }: ColumnOptions): ColumnDef<ItemWithDisplayValues>[] {
  return [
    {
      accessorKey: "sku",
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
        <span className="font-mono text-xs">{row.getValue("sku")}</span>
      ),
    },
    {
      accessorKey: "name",
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
          Name
          <SortIcon column={column} />
        </Button>
      ),
    },
    {
      accessorKey: "type",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => cycleSorting(column)}
          className="-ml-2 whitespace-nowrap"
        >
          Type
          <SortIcon column={column} />
        </Button>
      ),
      cell: ({ row }) => {
        const type = row.getValue("type") as string;
        return (
          <Badge variant={typeBadgeVariants[type] || "default"}>
            {typeLabels[type] || type}
          </Badge>
        );
      },
      filterFn: (row, _id, value: string) => {
        if (!value || value === "ALL") return true;
        return row.getValue("type") === value;
      },
    },
    {
      accessorKey: "category",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => cycleSorting(column)}
          className="-ml-2 whitespace-nowrap"
        >
          Category
          <SortIcon column={column} />
        </Button>
      ),
      cell: ({ row }) => {
        const category = row.getValue("category") as string | null;
        return category || <span className="text-muted-foreground">--</span>;
      },
      filterFn: (row, _id, value: string) => {
        if (!value || value === "ALL") return true;
        return row.getValue("category") === value;
      },
    },
    {
      accessorKey: "unitWeightMg",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => cycleSorting(column)}
          className="-ml-2 whitespace-nowrap"
        >
          Weight
          <SortIcon column={column} />
        </Button>
      ),
      cell: ({ row }) => {
        if (row.original.unitType === "pcs") {
          return <span className="text-muted-foreground">--</span>;
        }
        const mg = row.getValue("unitWeightMg") as number;
        return `${mgToGrams(mg)}g`;
      },
    },
    {
      id: "pieces",
      accessorFn: (row) => row.unitType === "pcs" ? row.unitWeightMg : 0,
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => cycleSorting(column)}
          className="-ml-2 whitespace-nowrap"
        >
          Pieces
          <SortIcon column={column} />
        </Button>
      ),
      cell: ({ row }) => {
        if (row.original.unitType !== "pcs") {
          return <span className="text-muted-foreground">--</span>;
        }
        return `${mgToGrams(row.original.unitWeightMg)} pcs`;
      },
    },
    {
      accessorKey: "cartonSize",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => cycleSorting(column)}
          className="-ml-2 whitespace-nowrap"
        >
          Carton Size
          <SortIcon column={column} />
        </Button>
      ),
      cell: ({ row }) => {
        const size = row.getValue("cartonSize") as number;
        return `${size} units`;
      },
    },
    {
      accessorKey: "costCentavos",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => cycleSorting(column)}
          className="-ml-2 whitespace-nowrap"
        >
          Carton Cost
          <SortIcon column={column} />
        </Button>
      ),
      cell: ({ row }) => {
        const centavos = row.getValue("costCentavos") as number;
        return `PHP ${centavosToPesos(centavos)}`;
      },
    },
    {
      id: "unitCost",
      accessorFn: (row) => row.cartonSize > 0 ? Math.round(row.costCentavos / row.cartonSize) : row.costCentavos,
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => cycleSorting(column)}
          className="-ml-2 whitespace-nowrap"
        >
          Unit Cost
          <SortIcon column={column} />
        </Button>
      ),
      cell: ({ row }) => {
        const cartonCost = row.original.costCentavos;
        const cartonSize = row.original.cartonSize;
        const unitCost = cartonSize > 0 ? Math.round(cartonCost / cartonSize) : cartonCost;
        return `PHP ${centavosToPesos(unitCost)}`;
      },
    },
    {
      id: "actions",
      size: 48,
      header: "",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="icon-xs" />}
            >
              <MoreVertical className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem render={<Link href={`/items/${item.id}/edit`} />}>
                <Pencil className="h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onDelete(item.id, item.name)}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}
