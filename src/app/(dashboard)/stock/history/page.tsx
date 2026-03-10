import { getTransactionHistory } from "@/actions/stock";
import { format } from "date-fns";
import { centavosToPesos, mgToGrams } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

/**
 * Transaction type display configuration.
 * Color classes use inline Tailwind for badge styling since shadcn Badge
 * uses cva variants that don't map directly to arbitrary colors.
 */
const TRANSACTION_TYPE_STYLES: Record<
  string,
  { label: string; className: string }
> = {
  RECEIVE: {
    label: "Receive",
    className:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  },
  SALE_DEDUCTION: {
    label: "Sale",
    className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  },
  WASTE: {
    label: "Waste",
    className:
      "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  },
  ADJUSTMENT: {
    label: "Adjustment",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  },
};

/**
 * Format quantity for display based on item type.
 * - PACKAGING items: display as pieces (e.g., "24 pcs")
 * - All other items: display milligrams as grams (e.g., "150,000 mg (150.0g)")
 *
 * Positive quantities get a "+" prefix, negative quantities are displayed as-is.
 */
function formatQuantity(quantity: number, itemType: string): string {
  const sign = quantity > 0 ? "+" : "";

  if (itemType === "PACKAGING") {
    return `${sign}${quantity.toLocaleString()} pcs`;
  }

  // Weight items: stored as milligrams, display with gram equivalent
  const grams = mgToGrams(Math.abs(quantity));
  return `${sign}${quantity.toLocaleString()} mg (${grams}g)`;
}

export default async function TransactionHistoryPage() {
  const { transactions, error } = await getTransactionHistory({ limit: 50 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Transaction History
        </h1>
        <p className="text-muted-foreground">
          All stock movements recorded in the inventory ledger.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          {error}
        </div>
      )}

      {transactions.length === 0 ? (
        <div className="rounded-lg border border-dashed px-6 py-12 text-center">
          <p className="text-muted-foreground">
            No transactions recorded yet.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Record incoming stock from the{" "}
            <a
              href="/stock/receiving"
              className="underline underline-offset-2 hover:text-foreground"
            >
              Stock Receiving
            </a>{" "}
            page.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Ref</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => {
                const typeStyle =
                  TRANSACTION_TYPE_STYLES[tx.type] ||
                  TRANSACTION_TYPE_STYLES.ADJUSTMENT;

                return (
                  <TableRow key={tx.id}>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(tx.createdAt), "MMM d, yyyy HH:mm")}
                    </TableCell>
                    <TableCell className="text-sm">
                      {tx.userName}
                    </TableCell>
                    <TableCell>
                      <div>
                        <span className="font-medium">{tx.item.name}</span>
                        <span className="ml-1 text-xs text-muted-foreground">
                          {tx.item.sku}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={typeStyle.className}
                      >
                        {typeStyle.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {formatQuantity(tx.quantity, tx.item.type)}
                    </TableCell>
                    <TableCell>
                      {tx.costCentavos != null
                        ? `PHP ${centavosToPesos(tx.costCentavos)}`
                        : "-"}
                    </TableCell>
                    <TableCell
                      className="max-w-[200px] truncate text-muted-foreground"
                      title={tx.notes || undefined}
                    >
                      {tx.notes || "-"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {tx.referenceId || "-"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
