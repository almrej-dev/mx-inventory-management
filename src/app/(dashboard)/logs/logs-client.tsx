"use client";

import Link from "next/link";
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
  activeDate: string; // "YYYY-MM-DD"
  today: string;      // "YYYY-MM-DD"
  error?: string;
}

const FILTERS: { label: string; value: LogFilter }[] = [
  { label: "All", value: "all" },
  { label: "Items", value: "items" },
  { label: "Products", value: "products" },
  { label: "Stocks", value: "stocks" },
];

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

function filterHref(date: string, filter: LogFilter): string {
  if (filter === "all") return `/logs?date=${date}`;
  return `/logs?date=${date}&filter=${filter}`;
}

export function LogsClient({
  initialLogs,
  activeFilter,
  activeDate,
  today,
  error,
}: LogsClientProps) {
  const prevDate = shiftDate(activeDate, -1);
  const nextDate = shiftDate(activeDate, +1);
  const isToday = activeDate >= today;

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
          <Link key={f.value} href={filterHref(activeDate, f.value)}>
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

      {/* Date navigation */}
      <div className="flex items-center justify-between">
        <Link href={filterHref(prevDate, activeFilter)}>
          <Button variant="outline" size="sm">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Prev
          </Button>
        </Link>

        <span className="text-sm font-medium">
          {format(parseISO(activeDate), "MMMM d, yyyy")}
        </span>

        {isToday ? (
          <Button variant="outline" size="sm" disabled>
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Link href={filterHref(nextDate, activeFilter)}>
            <Button variant="outline" size="sm">
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
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
            for {format(parseISO(activeDate), "MMMM d, yyyy")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
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
                    No activity yet
                  </TableCell>
                </TableRow>
              ) : (
                initialLogs.map((entry) => {
                  const style =
                    ACTION_STYLES[entry.action] ?? ACTION_STYLES.ADJUSTMENT;
                  return (
                    <TableRow key={entry.id}>
                      <TableCell className="text-muted-foreground font-mono text-sm">
                        {format(new Date(entry.createdAt), "HH:mm:ss")}
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
