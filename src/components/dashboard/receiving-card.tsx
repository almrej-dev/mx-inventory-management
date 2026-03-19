import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card";
import Link from "next/link";
import { ChevronRight, PackageCheck } from "lucide-react";
import { formatPesos } from "@/lib/utils";

interface LowStockItem {
  id: number;
  name: string;
  sku: string;
  stockQty: number;
  minStockQty: number;
}

interface ReceivingCardProps {
  receivedValueCentavos: number;
  receivedCount: number;
  lowStockItems: LowStockItem[];
}

export function ReceivingCard({
  receivedValueCentavos,
  receivedCount,
  lowStockItems,
}: ReceivingCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          Receiving &amp; Stock
        </CardTitle>
        <CardAction>
          <Link
            href="/stock/receiving"
            className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Full report
            <ChevronRight className="h-3 w-3" />
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Received this week</p>
            <p className="text-lg font-bold tracking-tight">
              {formatPesos(receivedValueCentavos)}
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Receiving count</p>
            <p className="text-lg font-bold tracking-tight">{receivedCount}</p>
          </div>
        </div>

        {lowStockItems.length > 0 ? (
          <Link
            href="/stock/receiving"
            className="flex items-center gap-3 rounded-lg bg-success-muted p-3 text-sm font-medium text-success-muted-foreground transition-colors hover:bg-success-muted/80"
          >
            <PackageCheck className="h-5 w-5 shrink-0" />
            <span>
              {lowStockItems.length} item{lowStockItems.length !== 1 && "s"}{" "}
              need restocking
            </span>
            <ChevronRight className="ml-auto h-4 w-4" />
          </Link>
        ) : (
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
            <PackageCheck className="h-5 w-5 shrink-0" />
            All items well stocked
          </div>
        )}

        {lowStockItems.length > 0 && (
          <div className="space-y-2">
            {lowStockItems.slice(0, 4).map((item) => {
              const pct =
                item.minStockQty > 0
                  ? Math.min(
                      100,
                      Math.round((item.stockQty / item.minStockQty) * 100)
                    )
                  : 0;
              const isCritical = item.stockQty <= 0;

              let barColor = "bg-success";
              if (isCritical) barColor = "bg-destructive";
              else if (pct < 50) barColor = "bg-warning";

              return (
                <div key={item.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium truncate max-w-[180px]">
                      {item.name}
                    </span>
                    <span
                      className={
                        isCritical
                          ? "text-destructive font-semibold"
                          : "text-muted-foreground"
                      }
                    >
                      {item.stockQty.toLocaleString()} /{" "}
                      {item.minStockQty.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all ${barColor}`}
                      style={{ width: `${pct}%` }}
                    />
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
