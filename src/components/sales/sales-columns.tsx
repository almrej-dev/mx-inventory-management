"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Eye } from "lucide-react";
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
      header: "",
      cell: ({ row }) => {
        return (
          <Link href={`/sales/${row.original.id}`}>
            <Button variant="ghost" size="sm">
              <Eye className="mr-1 h-3 w-3" />
              View
            </Button>
          </Link>
        );
      },
    },
  ];
}
