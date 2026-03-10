"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ITEM_TYPES } from "@/lib/constants";
import { ArrowUpDown, Eye, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import type { RecipeListItem } from "@/actions/recipes";

const typeLabels: Record<string, string> = {};
for (const t of ITEM_TYPES) {
  typeLabels[t.value] = t.label;
}

const typeBadgeVariants: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  RAW_MATERIAL: "default",
  SEMI_FINISHED: "secondary",
  FINISHED: "outline",
  PACKAGING: "secondary",
};

interface ColumnOptions {
  onDelete: (id: number, name: string) => void;
}

export function getRecipeColumns({
  onDelete,
}: ColumnOptions): ColumnDef<RecipeListItem>[] {
  return [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-2"
        >
          Product Name
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
    },
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
      accessorKey: "ingredientCount",
      header: "Ingredients",
      cell: ({ row }) => {
        const count = row.getValue("ingredientCount") as number;
        return `${count} item${count !== 1 ? "s" : ""}`;
      },
    },
    {
      accessorKey: "totalCostCentavos",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-2"
        >
          Cost
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => {
        const recipe = row.original;
        return `PHP ${recipe.costPesos}`;
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const recipe = row.original;
        return (
          <div className="flex items-center gap-1">
            <Link href={`/recipes/${recipe.id}`}>
              <Button variant="ghost" size="icon-xs">
                <Eye className="h-3 w-3" />
              </Button>
            </Link>
            <Link href={`/recipes/${recipe.id}/edit`}>
              <Button variant="ghost" size="icon-xs">
                <Pencil className="h-3 w-3" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => onDelete(recipe.id, recipe.name)}
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
