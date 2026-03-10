import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertTriangle, CheckCircle } from "lucide-react";
import Link from "next/link";

interface LowStockItem {
  id: number;
  name: string;
  sku: string;
  type: string;
  stockQty: number;
  minStockQty: number;
}

interface LowStockAlertsProps {
  data: LowStockItem[];
}

export function LowStockAlerts({ data }: LowStockAlertsProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Low Stock Alerts</CardTitle>
        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex items-center gap-2 rounded-md bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
            <CheckCircle className="h-4 w-4" />
            All items are well stocked
          </div>
        ) : (
          <div className="space-y-2">
            {data.map((item) => {
              const isCritical = item.stockQty <= 0;
              return (
                <div
                  key={item.id}
                  className={`flex items-center justify-between rounded-md p-3 text-sm ${
                    isCritical
                      ? "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-300"
                      : "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                  }`}
                >
                  <div>
                    <Link
                      href="/items"
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {item.name}
                    </Link>
                    <p className="text-xs opacity-75">{item.sku}</p>
                  </div>
                  <div className="text-right text-xs">
                    <span className="font-semibold">
                      {item.stockQty.toLocaleString()}
                    </span>
                    {" / "}
                    {item.minStockQty.toLocaleString()}
                    <p className="opacity-75">
                      {isCritical ? "CRITICAL" : "Low"}
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
