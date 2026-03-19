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
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface TrendData {
  label: string;
  receives: number;
  sales: number;
  waste: number;
}

interface InventoryTrendsCardProps {
  data: TrendData[];
  totalItems: number;
  transactionCount: number;
}

export function InventoryTrendsCard({
  data,
  totalItems,
  transactionCount,
}: InventoryTrendsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          Transaction Trends
        </CardTitle>
        <CardAction>
          <Link
            href="/reports"
            className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Reports
            <ChevronRight className="h-3 w-3" />
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-baseline gap-4">
          <div>
            <span className="text-2xl font-bold">
              {transactionCount.toLocaleString()}
            </span>
            <span className="ml-1 text-xs text-muted-foreground">
              this month
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            {totalItems.toLocaleString()} total items tracked
          </div>
        </div>

        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={30}
              />
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "var(--card)",
                  color: "var(--card-foreground)",
                }}
              />
              <Legend
                iconType="circle"
                iconSize={6}
                wrapperStyle={{ fontSize: 11 }}
              />
              <Bar
                dataKey="receives"
                name="Receives"
                fill="var(--success)"
                radius={[2, 2, 0, 0]}
                maxBarSize={20}
              />
              <Bar
                dataKey="sales"
                name="Sales"
                fill="var(--chart-2)"
                radius={[2, 2, 0, 0]}
                maxBarSize={20}
              />
              <Bar
                dataKey="waste"
                name="Waste"
                fill="var(--destructive)"
                radius={[2, 2, 0, 0]}
                maxBarSize={20}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="overflow-hidden rounded-md border">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">
                  Period
                </th>
                <th className="px-3 py-1.5 text-right font-medium text-muted-foreground">
                  Receives
                </th>
                <th className="px-3 py-1.5 text-right font-medium text-muted-foreground">
                  Sales
                </th>
                <th className="px-3 py-1.5 text-right font-medium text-muted-foreground">
                  Waste
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.label} className="border-b last:border-0">
                  <td className="px-3 py-1.5 font-medium">{row.label}</td>
                  <td className="px-3 py-1.5 text-right">{row.receives}</td>
                  <td className="px-3 py-1.5 text-right">{row.sales}</td>
                  <td className="px-3 py-1.5 text-right">{row.waste}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
