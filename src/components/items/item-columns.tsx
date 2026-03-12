"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ITEM_TYPES } from "@/lib/constants";
import { mgToGrams, centavosToPesos } from "@/lib/utils";
import { ArrowUpDown, Pencil, Trash2 } from "lucide-react";
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
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-2"
        >
          SKU
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.getValue("sku")}</span>
      ),
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-2"
        >
          Name
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
    },
    {
      accessorKey: "type",
      header: "Type",
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
      header: "Category",
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
      header: "Weight",
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
      header: "Pieces",
      cell: ({ row }) => {
        if (row.original.unitType !== "pcs") {
          return <span className="text-muted-foreground">--</span>;
        }
        return `${mgToGrams(row.original.unitWeightMg)} pcs`;
      },
    },
    {
      accessorKey: "cartonSize",
      header: "Carton Size",
      cell: ({ row }) => {
        const size = row.getValue("cartonSize") as number;
        return `${size} units`;
      },
    },
    {
      accessorKey: "costCentavos",
      header: "Carton Cost",
      cell: ({ row }) => {
        const centavos = row.getValue("costCentavos") as number;
        return `PHP ${centavosToPesos(centavos)}`;
      },
    },
    {
      id: "unitCost",
      header: "Unit Cost",
      cell: ({ row }) => {
        const cartonCost = row.original.costCentavos;
        const cartonSize = row.original.cartonSize;
        const unitCost = cartonSize > 0 ? Math.round(cartonCost / cartonSize) : cartonCost;
        return `PHP ${centavosToPesos(unitCost)}`;
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="flex items-center gap-1">
            <Link href={`/items/${item.id}/edit`}>
              <Button variant="ghost" size="icon-xs">
                <Pencil className="h-3 w-3" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => onDelete(item.id, item.name)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        );
      },
    },
  ];
}
