"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { ArrowUpDown, MoreVertical, Eye, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatPesos } from "@/lib/utils";

export interface ZReadingRow {
  id: number;
  storeName: string | null;
  receiptNumber: string | null;
  receiptDate: string | Date;
  total: number;
  status: string;
  createdAt: string | Date;
  _count: {
    lines: number;
  };
}

const statusBadgeVariants: Record<string, "secondary" | "outline"> = {
  completed: "secondary",
  pending: "outline",
};

export function getZReadingColumns(
  onView: (id: number) => void,
  onDelete?: (id: number) => void
): ColumnDef<ZReadingRow>[] {
  return [
    {
      accessorKey: "receiptDate",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-2"
        >
          Date
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => {
        const date = new Date(row.getValue("receiptDate") as string);
        return format(date, "MMM d, yyyy");
      },
    },
    {
      accessorKey: "storeName",
      header: "Store",
      cell: ({ row }) => row.getValue("storeName") || "\u2014",
    },
    {
      accessorKey: "receiptNumber",
      header: "Receipt #",
      cell: ({ row }) => row.getValue("receiptNumber") || "\u2014",
    },
    {
      id: "lines",
      header: "Items",
      cell: ({ row }) => row.original._count.lines,
    },
    {
      accessorKey: "total",
      header: "Total",
      cell: ({ row }) => formatPesos(row.getValue("total") as number),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return (
          <Badge variant={statusBadgeVariants[status] || "outline"}>
            {status}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      size: 48,
      header: "",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-xs" />}>
            <MoreVertical className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onView(row.original.id)}>
              <Eye className="h-4 w-4" />
              View
            </DropdownMenuItem>
            {onDelete && (
              <DropdownMenuItem onSelect={() => onDelete(row.original.id)}>
                <Trash2 className="h-4 w-4" />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];
}
