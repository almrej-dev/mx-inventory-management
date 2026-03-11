"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { LogEntry, LogFilter } from "@/actions/logs";
import { cn } from "@/lib/utils";

interface LogsClientProps {
  initialLogs: LogEntry[];
  activeFilter: LogFilter;
  activeFrom: string; // "YYYY-MM-DD"
  activeTo: string;   // "YYYY-MM-DD"
  today: string;      // "YYYY-MM-DD"
  noLogsEver?: boolean;
  error?: string;
}

const FILTERS: { label: string; value: LogFilter }[] = [
  { label: "All", value: "all" },
  { label: "Items", value: "items" },
  { label: "Products", value: "products" },
  { label: "Stocks", value: "stocks" },
];

const UNKNOWN_ACTION_STYLE = { label: "Unknown", className: "bg-muted text-muted-foreground" };

const ACTION_STYLES: Record<string, { label: string; className: string }> = {
  CREATE: {
    label: "Create",
    className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  },
  UPDATE: {
    label: "Update",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  },
  DELETE: {
    label: "Delete",
    className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  },
  RECEIVE: {
    label: "Receive",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  },
  WASTE: {
    label: "Waste",
    className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  },
  ADJUSTMENT: {
    label: "Adjustment",
    className: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  },
  SALE_DEDUCTION: {
    label: "Sale",
    className: "bg-muted text-muted-foreground",
  },
};

const ENTITY_LABELS: Record<string, string> = {
  ITEM: "Item",
  PRODUCT: "Product",
  STOCK: "Stock",
};

function shiftDate(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function rangeHref(from: string, to: string, filter: LogFilter): string {
  const base = `/logs?from=${from}&to=${to}`;
  if (filter === "all") return base;
  return `${base}&filter=${filter}`;
}

export function LogsClient({
  initialLogs,
  activeFilter,
  activeFrom,
  activeTo,
  today,
  noLogsEver,
  error,
}: LogsClientProps) {
  const router = useRouter();

  const prevFrom = shiftDate(activeFrom, -1);
  const prevTo = shiftDate(activeTo, -1);
  const nextFrom = shiftDate(activeFrom, +1);
  const nextTo = shiftDate(activeTo, +1);
  const isAtToday = activeTo >= today;

  const isSingleDay = activeFrom === activeTo;
  const dateLabel = isSingleDay
    ? format(parseISO(activeFrom), "MMMM d, yyyy")
    : `${format(parseISO(activeFrom), "MMM d, yyyy")} – ${format(parseISO(activeTo), "MMM d, yyyy")}`;

  function handleFromChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newFrom = e.target.value;
    // Clamp to: if newFrom > activeTo, collapse range to newFrom
    const newTo = newFrom > activeTo ? newFrom : activeTo;
    router.push(rangeHref(newFrom, newTo, activeFilter));
  }

  function handleToChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newTo = e.target.value;
    // Clamp from: if newTo < activeFrom, collapse range to newTo
    const newFrom = newTo < activeFrom ? newTo : activeFrom;
    router.push(rangeHref(newFrom, newTo, activeFilter));
  }

  if (noLogsEver) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Activity Logs</h1>
          <p className="text-muted-foreground">
            All system activity — items, products, and stock movements
          </p>
        </div>
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground">No logs to show yet.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Activity will appear here once items, products, or stock movements are recorded.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Activity Logs</h1>
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Activity Logs</h1>
        <p className="text-muted-foreground">
          All system activity — items, products, and stock movements
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b">
        {FILTERS.map((f) => (
          <Link key={f.value} href={rangeHref(activeFrom, activeTo, f.value)}>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "rounded-b-none border-b-2 border-transparent",
                activeFilter === f.value &&
                  "border-primary text-primary font-medium"
              )}
            >
              {f.label}
            </Button>
          </Link>
        ))}
      </div>

      {/* Date range navigation */}
      <div className="flex items-center gap-3">
        <Link href={rangeHref(prevFrom, prevTo, activeFilter)}>
          <Button variant="outline" size="sm">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </Link>

        <div className="flex items-center gap-2 flex-1 justify-center">
          <input
            type="date"
            value={activeFrom}
            max={today}
            onChange={handleFromChange}
            className="rounded-md border bg-background px-2 py-1 text-sm"
          />
          <span className="text-sm text-muted-foreground">to</span>
          <input
            type="date"
            value={activeTo}
            max={today}
            onChange={handleToChange}
            className="rounded-md border bg-background px-2 py-1 text-sm"
          />
        </div>

        {isAtToday ? (
          <Button variant="outline" size="sm" disabled>
            <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Link href={rangeHref(nextFrom, nextTo, activeFilter)}>
            <Button variant="outline" size="sm">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Log Entries</CardTitle>
          <CardDescription>
            {initialLogs.length} entr{initialLogs.length !== 1 ? "ies" : "y"}{" "}
            for {dateLabel}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Name / SKU</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialLogs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-12 text-center text-muted-foreground"
                  >
                    No activity for this period
                  </TableCell>
                </TableRow>
              ) : (
                initialLogs.map((entry) => {
                  const style =
                    ACTION_STYLES[entry.action] ?? UNKNOWN_ACTION_STYLE;
                  return (
                    <TableRow key={entry.id}>
                      <TableCell className="text-muted-foreground font-mono text-sm">
                        {/* Displayed in browser local time; log entries are filtered by UTC day boundaries */}
                        {format(new Date(entry.createdAt), isSingleDay ? "HH:mm:ss" : "MMM d HH:mm")}
                      </TableCell>
                      <TableCell className="text-sm">{entry.userName}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {ENTITY_LABELS[entry.entityType] ?? entry.entityType}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={style.className}
                        >
                          {style.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{entry.entityName}</span>
                        <span className="ml-1 text-xs text-muted-foreground">
                          {entry.entitySku}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
