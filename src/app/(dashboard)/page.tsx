import {
  getDashboardSummary,
  getBestsellers,
  getLowStockItems,
  getReorderRecommendations,
  getSalesSummary,
  getWeeklySalesChart,
  getReceivingSummary,
  getInventoryByCategory,
  getWasteSummary,
  getRecentTransactions,
  getWeeklyTransactionTrends,
} from "@/actions/dashboard";
import { SalesCard } from "@/components/dashboard/sales-card";
import { OrderingCard } from "@/components/dashboard/ordering-card";
import { RecentTransactionsCard } from "@/components/dashboard/recent-transactions-card";
import { ReceivingCard } from "@/components/dashboard/receiving-card";
import { InventoryTrendsCard } from "@/components/dashboard/inventory-trends-card";
import { TopSellersCard } from "@/components/dashboard/top-sellers-card";
import { InventoryValueCard } from "@/components/dashboard/inventory-value-card";
import { WasteCard } from "@/components/dashboard/waste-card";

export default async function DashboardPage() {
  const [
    summary,
    bestsellers,
    lowStock,
    reorderRecs,
    salesSummary,
    salesChart,
    receiving,
    categories,
    waste,
    recentTx,
    trends,
  ] = await Promise.all([
    getDashboardSummary(),
    getBestsellers(5),
    getLowStockItems(),
    getReorderRecommendations(),
    getSalesSummary(),
    getWeeklySalesChart(),
    getReceivingSummary(),
    getInventoryByCategory(),
    getWasteSummary(),
    getRecentTransactions(5),
    getWeeklyTransactionTrends(),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Inventory overview and stock alerts
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.2fr_1fr]">
        {/* Left column */}
        <div className="space-y-4">
          <SalesCard
            yesterdayCentavos={salesSummary.yesterdayCentavos}
            weekCentavos={salesSummary.weekCentavos}
            chartData={salesChart}
          />
          <OrderingCard
            reorderItems={reorderRecs.reorder}
            surplusCount={reorderRecs.surplus.length}
          />
          <RecentTransactionsCard transactions={recentTx} />
        </div>

        {/* Center column */}
        <div className="space-y-4">
          <ReceivingCard
            receivedValueCentavos={receiving.receivedValueCentavos}
            receivedCount={receiving.receivedCount}
            lowStockItems={lowStock}
          />
          <InventoryTrendsCard
            data={trends}
            totalItems={summary.totalItems}
            transactionCount={summary.transactionCount}
          />
          <TopSellersCard data={bestsellers} />
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <InventoryValueCard
            totalValueCentavos={summary.totalValueCentavos}
            categories={categories}
          />
          <WasteCard
            todayCentavos={waste.todayCentavos}
            yesterdayCentavos={waste.yesterdayCentavos}
            weekCentavos={waste.weekCentavos}
            recentItems={waste.recentItems}
          />
        </div>
      </div>
    </div>
  );
}
