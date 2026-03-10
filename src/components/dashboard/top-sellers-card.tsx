import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card";
import Link from "next/link";
import { ChevronRight, Trophy } from "lucide-react";

interface TopSellersCardProps {
  data: Array<{
    item: { name: string; sku: string };
    totalSold: number;
  }>;
}

export function TopSellersCard({ data }: TopSellersCardProps) {
  const maxSold = data.length > 0 ? Math.max(...data.map((d) => d.totalSold)) : 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Top Sellers</CardTitle>
        <CardAction>
          <Link
            href="/sales/history"
            className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Sales history
            <ChevronRight className="h-3 w-3" />
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex items-center gap-2 rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
            <Trophy className="h-4 w-4" />
            No sales data yet
          </div>
        ) : (
          <div className="space-y-3">
            {data.map((entry, index) => {
              const pct = Math.round((entry.totalSold / maxSold) * 100);
              return (
                <div key={entry.item.sku} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-bold text-muted-foreground w-4 shrink-0">
                        {index + 1}
                      </span>
                      <span className="font-medium truncate">
                        {entry.item.name}
                      </span>
                    </div>
                    <span className="text-sm font-semibold shrink-0 ml-2">
                      {entry.totalSold.toLocaleString()}
                    </span>
                  </div>
                  <div className="ml-6 h-1.5 w-full rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-chart-3 transition-all"
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
