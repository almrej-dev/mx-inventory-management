import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card";
import Link from "next/link";
import {
  ChevronRight,
  ArrowDownToLine,
  ArrowUpFromLine,
  Trash2,
  Settings2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Transaction {
  id: number;
  type: string;
  itemName: string;
  quantity: number;
  costCentavos: number | null;
  notes: string | null;
  createdAt: Date;
}

interface RecentTransactionsCardProps {
  transactions: Transaction[];
}

const typeConfig: Record<
  string,
  { icon: typeof ArrowDownToLine; label: string; color: string }
> = {
  RECEIVE: {
    icon: ArrowDownToLine,
    label: "Received",
    color: "text-success",
  },
  SALE_DEDUCTION: {
    icon: ArrowUpFromLine,
    label: "Sold",
    color: "text-chart-2",
  },
  WASTE: {
    icon: Trash2,
    label: "Waste",
    color: "text-destructive",
  },
  ADJUSTMENT: {
    icon: Settings2,
    label: "Adjusted",
    color: "text-warning",
  },
};

export function RecentTransactionsCard({
  transactions,
}: RecentTransactionsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          Recent Activity
        </CardTitle>
        <CardAction>
          <Link
            href="/logs"
            className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Logs
            <ChevronRight className="h-3 w-3" />
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No recent transactions
          </p>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => {
              const config = typeConfig[tx.type] || typeConfig.ADJUSTMENT;
              const Icon = config.icon;
              return (
                <div key={tx.id} className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 rounded-md bg-muted/50 p-1.5 ${config.color}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {tx.itemName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {config.label} · qty {tx.quantity.toLocaleString()}{" "}
                      ·{" "}
                      {formatDistanceToNow(new Date(tx.createdAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
