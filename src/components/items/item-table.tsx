"use client";

import { useState, useMemo, useCallback } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  flexRender,
  type SortingState,
} from "@tanstack/react-table";
import { getItemColumns } from "@/components/items/item-columns";
import { deleteItem } from "@/actions/items";
import { ITEM_TYPES } from "@/lib/constants";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ItemWithDisplayValues } from "@/actions/items";

interface ItemTableProps {
  data: ItemWithDisplayValues[];
}

export function ItemTable({ data }: ItemTableProps) {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  // Extract unique categories for filter dropdown
  const categories = useMemo(() => {
    const cats = new Set<string>();
    for (const item of data) {
      if (item.category) cats.add(item.category);
    }
    return Array.from(cats).sort();
  }, [data]);

  const handleDelete = useCallback(async (id: number, name: string) => {
    if (!window.confirm(`Delete "${name}"? This is a soft-delete.`)) return;
    try {
      const result = await deleteItem(id);
      if (result.error) {
        console.error("Delete failed:", result.error);
      }
      router.refresh();
    } catch (err) {
      console.error("Delete failed:", err);
    }
  }, [router]);

  const columns = useMemo(() => getItemColumns({ onDelete: handleDelete }), [handleDelete]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter,
      columnFilters: [
        ...(typeFilter !== "ALL" ? [{ id: "type", value: typeFilter }] : []),
        ...(categoryFilter !== "ALL"
          ? [{ id: "category", value: categoryFilter }]
          : []),
      ],
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: (row, _columnId, filterValue: string) => {
      const search = filterValue.toLowerCase();
      const name = (row.getValue("name") as string).toLowerCase();
      const sku = (row.getValue("sku") as string).toLowerCase();
      return name.includes(search) || sku.includes(search);
    },
    initialState: {
      pagination: { pageSize: 10 },
    },
  });


  const filteredRowCount = table.getFilteredRowModel().rows.length;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search by name or SKU..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-xs"
        />

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="flex h-8 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="ALL">All Types</option>
          {ITEM_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="flex h-8 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="ALL">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        <span className="text-sm text-muted-foreground">
          Showing {filteredRowCount} of {data.length} items
        </span>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  <div className="space-y-2">
                    <p className="text-muted-foreground">No items found.</p>
                    <Link href="/items/new">
                      <Button variant="outline" size="sm">
                        Create your first item
                      </Button>
                    </Link>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Rows per page:</span>
            <select
              value={table.getState().pagination.pageSize}
              onChange={(e) => table.setPageSize(Number(e.target.value))}
              className="flex h-7 rounded-md border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {[10, 25, 50].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount()}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      )}

    </div>
  );
}
