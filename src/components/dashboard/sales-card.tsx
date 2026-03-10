"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card";
import { formatPesos } from "@/lib/utils";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface SalesCardProps {
  yesterdayCentavos: number;
  weekCentavos: number;
  chartData: { date: string; label: string; totalCentavos: number }[];
}

export function SalesCard({
  yesterdayCentavos,
  weekCentavos,
  chartData,
}: SalesCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Sales</CardTitle>
        <CardAction>
          <Link
            href="/sales/history"
            className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Sales History
            <ChevronRight className="h-3 w-3" />
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Yesterday</p>
            <p className="text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {formatPesos(yesterdayCentavos)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">This week</p>
            <p className="text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {formatPesos(weekCentavos)}
            </p>
          </div>
        </div>

        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${(v / 100).toFixed(0)}`}
                width={40}
              />
              <Tooltip
                formatter={(value) => [formatPesos(Number(value)), "Sales"]}
                labelFormatter={(label) => label}
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "var(--card)",
                  color: "var(--card-foreground)",
                }}
              />
              <Bar
                dataKey="totalCentavos"
                fill="oklch(0.546 0.245 262.881)"
                radius={[3, 3, 0, 0]}
                maxBarSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
