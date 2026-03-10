import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

interface BestsellersTableProps {
  data: Array<{
    item: { name: string; sku: string };
    totalSold: number;
  }>;
}

export function BestsellersTable({ data }: BestsellersTableProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Top Sellers</CardTitle>
        <TrendingUp className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sales data yet</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-2 font-medium">#</th>
                <th className="pb-2 pr-2 font-medium">Product</th>
                <th className="pb-2 pr-2 font-medium">SKU</th>
                <th className="pb-2 text-right font-medium">Units Sold</th>
              </tr>
            </thead>
            <tbody>
              {data.map((entry, index) => (
                <tr key={entry.item.sku} className="border-b last:border-0">
                  <td className="py-2 pr-2 text-muted-foreground">
                    {index + 1}
                  </td>
                  <td className="py-2 pr-2 font-medium">{entry.item.name}</td>
                  <td className="py-2 pr-2 text-muted-foreground">
                    {entry.item.sku}
                  </td>
                  <td className="py-2 text-right">
                    {entry.totalSold.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
