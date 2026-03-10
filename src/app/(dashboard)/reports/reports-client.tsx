"use client";

import { useState, useTransition } from "react";
import { getSalesReport } from "@/actions/reports";
import type { SalesReportLine } from "@/actions/reports";
import { ReportFilters } from "@/components/reports/report-filters";
import { centavosToPesos } from "@/lib/utils";
import { format } from "date-fns";

interface ReportsClientProps {
  products: Array<{ id: number; name: string }>;
  categories: string[];
}

export function ReportsClient({ products, categories }: ReportsClientProps) {
  const [isPending, startTransition] = useTransition();
  const [lines, setLines] = useState<SalesReportLine[] | null>(null);

  function handleFilter(filters: {
    from?: string;
    to?: string;
    productId?: number;
    category?: string;
  }) {
    startTransition(async () => {
      const result = await getSalesReport(filters);
      setLines(result.lines);
    });
  }

  return (
    <div className="space-y-6">
      <ReportFilters
        products={products}
        categories={categories}
        onFilter={handleFilter}
        isPending={isPending}
      />

      {/* Results section */}
      {lines === null ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          Set filters and click Generate Report.
        </div>
      ) : lines.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          No sales found for the selected filters.
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Showing {lines.length} result{lines.length !== 1 ? "s" : ""}
          </p>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-2 text-left font-medium">Date</th>
                  <th className="px-4 py-2 text-left font-medium">Product</th>
                  <th className="px-4 py-2 text-left font-medium">SKU</th>
                  <th className="px-4 py-2 text-left font-medium">Category</th>
                  <th className="px-4 py-2 text-right font-medium">Quantity</th>
                  <th className="px-4 py-2 text-right font-medium">
                    Unit Price
                  </th>
                  <th className="px-4 py-2 text-left font-medium">Source</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr key={line.id} className="border-b last:border-0">
                    <td className="px-4 py-2">
                      {format(new Date(line.upload.saleDate), "MMM dd, yyyy")}
                    </td>
                    <td className="px-4 py-2">{line.item.name}</td>
                    <td className="px-4 py-2 font-mono text-xs">
                      {line.item.sku}
                    </td>
                    <td className="px-4 py-2">
                      {line.item.category ?? "--"}
                    </td>
                    <td className="px-4 py-2 text-right">{line.quantity}</td>
                    <td className="px-4 py-2 text-right">
                      {line.unitPriceCentavos !== null
                        ? `P${centavosToPesos(line.unitPriceCentavos)}`
                        : "--"}
                    </td>
                    <td className="px-4 py-2 capitalize">{line.upload.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
