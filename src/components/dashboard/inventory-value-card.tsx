"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { formatPesos } from "@/lib/utils";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface CategoryData {
  category: string;
  valueCentavos: number;
}

interface InventoryValueCardProps {
  totalValueCentavos: number;
  categories: CategoryData[];
}

const COLORS = [
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-1)",
  "var(--chart-2)",
];

export function InventoryValueCard({
  totalValueCentavos,
  categories,
}: InventoryValueCardProps) {
  const pieData = categories.map((c) => ({
    name: c.category,
    value: c.valueCentavos,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          Inventory Value
        </CardTitle>
        <CardAction>
          <Link
            href="/reports"
            className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Full report
            <ChevronRight className="h-3 w-3" />
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-4">
          <div className="relative h-28 w-28 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={50}
                  paddingAngle={2}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {pieData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [formatPesos(Number(value)), "Value"]}
                  contentStyle={{
                    fontSize: 11,
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                    color: "var(--card-foreground)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Value</p>
            <p className="text-xl font-bold tracking-tight">
              {formatPesos(totalValueCentavos)}
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-md border">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">
                  Category
                </th>
                <th className="px-3 py-1.5 text-right font-medium text-muted-foreground">
                  Value
                </th>
                <th className="px-3 py-1.5 text-right font-medium text-muted-foreground">
                  Share
                </th>
              </tr>
            </thead>
            <tbody>
              {categories.slice(0, 6).map((cat, i) => {
                const share =
                  totalValueCentavos > 0
                    ? Math.round((cat.valueCentavos / totalValueCentavos) * 100)
                    : 0;
                return (
                  <tr key={cat.category} className="border-b last:border-0">
                    <td className="px-3 py-1.5">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{
                            backgroundColor: COLORS[i % COLORS.length],
                          }}
                        />
                        <span className="font-medium truncate max-w-[100px]">
                          {cat.category}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      {formatPesos(cat.valueCentavos)}
                    </td>
                    <td className="px-3 py-1.5 text-right text-muted-foreground">
                      {share}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
