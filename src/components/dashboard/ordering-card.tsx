import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card";
import Link from "next/link";
import { ChevronRight, ShoppingCart } from "lucide-react";

interface ReorderItem {
  id: number;
  name: string;
  sku: string;
  type: string;
  stockQty: number;
  minStockQty: number;
}

interface OrderingCardProps {
  reorderItems: ReorderItem[];
  surplusCount: number;
}

export function OrderingCard({
  reorderItems,
  surplusCount,
}: OrderingCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Ordering</CardTitle>
        <CardAction>
          <Link
            href="/items"
            className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            All items
            <ChevronRight className="h-3 w-3" />
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Need reorder</p>
            <p className="text-xl font-bold text-red-600 dark:text-red-400">
              {reorderItems.length}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Surplus items</p>
            <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
              {surplusCount}
            </p>
          </div>
        </div>

        {reorderItems.length === 0 ? (
          <div className="flex items-center gap-2 rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
            <ShoppingCart className="h-4 w-4" />
            No items need reordering
          </div>
        ) : (
          <div className="overflow-hidden rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                    Item
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">
                    Stock
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">
                    Min
                  </th>
                </tr>
              </thead>
              <tbody>
                {reorderItems.slice(0, 5).map((item) => (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="px-3 py-2">
                      <p className="font-medium truncate max-w-[160px]">
                        {item.name}
                      </p>
                    </td>
                    <td
                      className={`px-3 py-2 text-right font-semibold ${
                        item.stockQty <= 0
                          ? "text-red-600 dark:text-red-400"
                          : "text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {item.stockQty.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right text-muted-foreground">
                      {item.minStockQty.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {reorderItems.length > 5 && (
              <div className="border-t bg-muted/20 px-3 py-1.5 text-center text-xs text-muted-foreground">
                +{reorderItems.length - 5} more items
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
