"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowUpDown, Eye, MoreVertical } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

export interface SalesUploadRow {
  id: number;
  fileName: string | null;
  source: string;
  status: string;
  totalLines: number;
  matchedLines: number;
  saleDate: string | Date;
  notes: string | null;
  createdAt: string | Date;
  _count: {
    lines: number;
  };
}

const sourceBadgeVariants: Record<string, "default" | "secondary"> = {
  upload: "default",
  manual: "secondary",
};

const statusBadgeVariants: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  completed: "secondary",
  failed: "destructive",
  pending: "outline",
};

export function getSalesColumns(): ColumnDef<SalesUploadRow>[] {
  return [
    {
      accessorKey: "saleDate",
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
        const date = new Date(row.getValue("saleDate") as string);
        return format(date, "MMM d, yyyy");
      },
    },
    {
      accessorKey: "source",
      header: "Source",
      cell: ({ row }) => {
        const source = row.getValue("source") as string;
        return (
          <Badge variant={sourceBadgeVariants[source] || "default"}>
            {source === "upload" ? "Upload" : "Manual"}
          </Badge>
        );
      },
    },
    {
      accessorKey: "fileName",
      header: "File Name",
      cell: ({ row }) => {
        const fileName = row.getValue("fileName") as string | null;
        return fileName || (
          <span className="text-muted-foreground">Manual Entry</span>
        );
      },
    },
    {
      id: "lineCount",
      header: "Lines",
      cell: ({ row }) => {
        return row.original._count.lines;
      },
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
      cell: ({ row }) => {
        return (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="icon-xs" />}
            >
              <MoreVertical className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem render={<Link href={`/sales/${row.original.id}`} />}>
                <Eye className="h-4 w-4" />
                View
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}
