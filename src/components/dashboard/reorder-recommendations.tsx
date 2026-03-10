import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ShoppingCart, TrendingDown } from "lucide-react";

interface ReorderItem {
  id: number;
  name: string;
  sku: string;
  type: string;
  stockQty: number;
  minStockQty: number;
  unitWeightMg: number;
  cartonSize: number;
}

interface ReorderRecommendationsProps {
  reorder: ReorderItem[];
  surplus: ReorderItem[];
}

export function ReorderRecommendations({
  reorder,
  surplus,
}: ReorderRecommendationsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Reorder Recommendations</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Reorder Now section */}
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-red-700 dark:text-red-400">
              <ShoppingCart className="h-4 w-4" />
              Reorder Now
            </div>
            {reorder.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No items need reordering
              </p>
            ) : (
              <div className="space-y-2">
                {reorder.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-md border p-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.sku}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-semibold ${
                          item.stockQty <= 0
                            ? "text-red-600 dark:text-red-400"
                            : "text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        {item.stockQty.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        min: {item.minStockQty.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Limit Buying section */}
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-blue-700 dark:text-blue-400">
              <TrendingDown className="h-4 w-4" />
              Limit Buying
            </div>
            {surplus.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No surplus items detected
              </p>
            ) : (
              <div className="space-y-2">
                {surplus.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-md border p-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.sku}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-blue-600 dark:text-blue-400">
                        {item.stockQty.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        min: {item.minStockQty.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
