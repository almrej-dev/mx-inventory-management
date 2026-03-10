import {
  getDashboardSummary,
  getBestsellers,
  getLowStockItems,
  getReorderRecommendations,
} from "@/actions/dashboard";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { BestsellersTable } from "@/components/dashboard/bestsellers-table";
import { LowStockAlerts } from "@/components/dashboard/low-stock-alerts";
import { ReorderRecommendations } from "@/components/dashboard/reorder-recommendations";

export default async function DashboardPage() {
  const [summary, bestsellers, lowStock, reorderRecs] = await Promise.all([
    getDashboardSummary(),
    getBestsellers(5),
    getLowStockItems(),
    getReorderRecommendations(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Inventory overview and stock alerts
        </p>
      </div>

      <SummaryCards
        totalItems={summary.totalItems}
        totalValueCentavos={summary.totalValueCentavos}
        lowStockCount={summary.lowStockCount}
        transactionCount={summary.transactionCount}
      />

      <div className="grid gap-6 md:grid-cols-2">
        <BestsellersTable data={bestsellers} />
        <LowStockAlerts data={lowStock} />
      </div>

      <ReorderRecommendations
        reorder={reorderRecs.reorder}
        surplus={reorderRecs.surplus}
      />
    </div>
  );
}
