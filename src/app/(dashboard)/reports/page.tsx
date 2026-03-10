import { getReportFilterOptions } from "@/actions/reports";
import { ReportsClient } from "./reports-client";

export default async function ReportsPage() {
  const { products, categories } = await getReportFilterOptions();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Sales Reports</h1>
        <p className="text-muted-foreground">
          Filter and analyze sales data by date range, product, and category.
        </p>
      </div>

      <ReportsClient products={products} categories={categories} />
    </div>
  );
}
