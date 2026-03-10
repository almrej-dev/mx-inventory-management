"use client";

import { useState } from "react";
import { subDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/reports/date-range-picker";
import type { DateRange } from "react-day-picker";

interface ReportFiltersProps {
  products: Array<{ id: number; name: string }>;
  categories: string[];
  onFilter: (filters: {
    from?: string;
    to?: string;
    productId?: number;
    category?: string;
  }) => void;
  isPending: boolean;
}

export function ReportFilters({
  products,
  categories,
  onFilter,
  isPending,
}: ReportFiltersProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [productId, setProductId] = useState<number | undefined>();
  const [category, setCategory] = useState<string | undefined>();

  function handleGenerate() {
    onFilter({
      from: dateRange?.from?.toISOString(),
      to: dateRange?.to?.toISOString(),
      productId,
      category,
    });
  }

  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Date Range</label>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="product-filter" className="text-sm font-medium">
          Product
        </label>
        <select
          id="product-filter"
          className="h-8 rounded-lg border border-border bg-background px-3 text-sm"
          value={productId ?? ""}
          onChange={(e) =>
            setProductId(e.target.value ? Number(e.target.value) : undefined)
          }
        >
          <option value="">All Products</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="category-filter" className="text-sm font-medium">
          Category
        </label>
        <select
          id="category-filter"
          className="h-8 rounded-lg border border-border bg-background px-3 text-sm"
          value={category ?? ""}
          onChange={(e) =>
            setCategory(e.target.value || undefined)
          }
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <Button onClick={handleGenerate} disabled={isPending}>
        {isPending ? "Loading..." : "Generate Report"}
      </Button>
    </div>
  );
}
