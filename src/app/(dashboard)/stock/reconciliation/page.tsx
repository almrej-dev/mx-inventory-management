import { getItemsForReconciliation } from "@/actions/stock";
import { ReconciliationForm } from "@/components/stock/reconciliation-form";

export default async function ReconciliationPage() {
  const { items, error } = await getItemsForReconciliation();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Physical Count Reconciliation
        </h1>
        <p className="text-muted-foreground">
          Enter actual counted quantities to reconcile system stock with
          reality. Only items with discrepancies will be adjusted.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          {error}
        </div>
      )}

      <ReconciliationForm items={items} />
    </div>
  );
}
