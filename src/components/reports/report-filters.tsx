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
        <div className="relative">
          <select
            id="product-filter"
            className="flex h-9 appearance-none rounded-lg border border-input bg-background px-2.5 py-2 pr-8 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
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
          <svg
            className="pointer-events-none absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="category-filter" className="text-sm font-medium">
          Category
        </label>
        <div className="relative">
          <select
            id="category-filter"
            className="flex h-9 appearance-none rounded-lg border border-input bg-background px-2.5 py-2 pr-8 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
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
          <svg
            className="pointer-events-none absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>
      </div>

      <Button onClick={handleGenerate} disabled={isPending}>
        {isPending ? "Loading..." : "Generate Report"}
      </Button>
    </div>
  );
}
