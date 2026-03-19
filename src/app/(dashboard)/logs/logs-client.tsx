'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { ChevronDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import type { LogEntry, LogFilter } from '@/actions/logs';
import { cn } from '@/lib/utils';

interface LogsClientProps {
  initialLogs: LogEntry[];
  activeFilter: LogFilter;
  activeFrom: string; // "YYYY-MM-DD"
  activeTo: string; // "YYYY-MM-DD"
  today: string; // "YYYY-MM-DD"
  earliestDate: string; // "YYYY-MM-DD" — date of the very first log entry
  noLogsEver?: boolean;
  error?: string;
}

const FILTERS: { label: string; value: LogFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Items', value: 'items' },
  { label: 'Products', value: 'products' },
  { label: 'Stocks', value: 'stocks' }
];

const UNKNOWN_ACTION_STYLE = {
  label: 'Unknown',
  className: 'bg-muted text-muted-foreground'
};

const ACTION_STYLES: Record<string, { label: string; className: string }> = {
  CREATE: {
    label: 'Create',
    className: 'bg-success-muted text-success-muted-foreground'
  },
  UPDATE: {
    label: 'Update',
    className: 'bg-warning-muted text-warning-muted-foreground'
  },
  DELETE: {
    label: 'Delete',
    className: 'bg-destructive-muted text-destructive-muted-foreground'
  },
  RECEIVE: {
    label: 'Receive',
    className: 'bg-chart-2/10 text-chart-2'
  },
  WASTE: {
    label: 'Waste',
    className: 'bg-destructive-muted text-destructive-muted-foreground'
  },
  ADJUSTMENT: {
    label: 'Adjustment',
    className: 'bg-muted text-muted-foreground'
  },
  SALE_DEDUCTION: {
    label: 'Sale',
    className: 'bg-muted text-muted-foreground'
  }
};

const ENTITY_LABELS: Record<string, string> = {
  ITEM: 'Item',
  PRODUCT: 'Product',
  STOCK: 'Stock'
};


function rangeHref(from: string, to: string, filter: LogFilter): string {
  const base = `/logs?from=${from}&to=${to}`;
  if (filter === 'all') return base;
  return `${base}&filter=${filter}`;
}

function isDiff(value: unknown): value is { from: unknown; to: unknown } {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    'from' in value &&
    'to' in value
  );
}

function renderList(items: string[]) {
  return (
    <ul className="mt-0.5 list-none space-y-0.5 pl-2">
      {items.map((v, i) => (
        <li key={i}>{v}</li>
      ))}
    </ul>
  );
}

function DetailsPanel({ changes }: { changes: Record<string, unknown> }) {
  const entries = Object.entries(changes);
  if (entries.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-1 px-2 py-2 text-xs text-muted-foreground">
      {entries.map(([key, value]) => {
        if (isDiff(value)) {
          // Arrays (e.g. ingredient lists)
          if (Array.isArray(value.from) && Array.isArray(value.to)) {
            return (
              <div key={key} className="w-full">
                <span className="font-medium text-foreground">{key}:</span>
                <div className="mt-1 grid grid-cols-[1fr_auto_1fr] gap-x-3">
                  <div>{renderList(value.from as string[])}</div>
                  <span className="self-center text-muted-foreground">→</span>
                  <div>{renderList(value.to as string[])}</div>
                </div>
              </div>
            );
          }
          // Scalar values
          return (
            <div key={key}>
              <span className="font-medium text-foreground">{key}:</span>{' '}
              <span className="text-muted-foreground">
                {String(value.from)}
              </span>
              <span className="mx-1">→</span>
              <span className="text-foreground">{String(value.to)}</span>
            </div>
          );
        }
        if (Array.isArray(value)) {
          return (
            <div key={key} className="w-full">
              <span className="font-medium text-foreground">{key}:</span>{' '}
              {renderList(value as string[])}
            </div>
          );
        }
        return (
          <div key={key}>
            <span className="font-medium text-foreground">{key}:</span>{' '}
            {String(value)}
          </div>
        );
      })}
    </div>
  );
}

export function LogsClient({
  initialLogs,
  activeFilter,
  activeFrom,
  activeTo,
  today,
  earliestDate,
  noLogsEver,
  error
}: LogsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  function toggleRow(id: string) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }


  const isSingleDay = activeFrom === activeTo;
  const dateLabel = isSingleDay
    ? format(parseISO(activeFrom), 'MMMM d, yyyy')
    : `${format(parseISO(activeFrom), 'MMM d, yyyy')} – ${format(parseISO(activeTo), 'MMM d, yyyy')}`;

  function navigate(href: string) {
    startTransition(() => router.push(href));
  }

  function handleFromChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newFrom = e.target.value;
    const newTo = newFrom > activeTo ? newFrom : activeTo;
    navigate(rangeHref(newFrom, newTo, activeFilter));
  }

  function handleToChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newTo = e.target.value;
    const newFrom = newTo < activeFrom ? newTo : activeFrom;
    navigate(rangeHref(newFrom, newTo, activeFilter));
  }

  if (noLogsEver) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Activity Logs
          </h1>
          <p className="text-muted-foreground">
            All system activity — items, products, and stock movements
          </p>
        </div>
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground">No logs to show yet.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Activity will appear here once items, products, or stock movements
              are recorded.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Activity Logs
        </h1>
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
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Activity Logs
        </h1>
        <p className="text-muted-foreground">
          All system activity — items, products, and stock movements
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b">
        {FILTERS.map((f) => (
          <Button
            key={f.value}
            variant="ghost"
            size="sm"
            onClick={() => navigate(rangeHref(activeFrom, activeTo, f.value))}
            className={cn(
              'rounded-b-none border-b-2 border-transparent',
              activeFilter === f.value &&
                'border-primary font-medium text-primary'
            )}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {/* Date range navigation */}
      <div className="flex flex-col items-center gap-2 sm:flex-row sm:gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">from</span>
          <input
            type="date"
            value={activeFrom}
            min={earliestDate}
            max={today}
            onChange={handleFromChange}
            className="rounded-md border bg-background px-2 py-1 text-sm"
          />
          <span className="text-sm text-muted-foreground">to</span>
          <input
            type="date"
            value={activeTo}
            min={earliestDate}
            max={today}
            onChange={handleToChange}
            className="rounded-md border bg-background px-2 py-1 text-sm"
          />
        </div>
      </div>

      {/* Table */}
      <Card className="relative">
        {isPending && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/60">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        <CardHeader>
          <CardTitle>Log Entries</CardTitle>
          <CardDescription>
            {initialLogs.length} entr{initialLogs.length !== 1 ? 'ies' : 'y'}{' '}
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
                <TableHead className="w-6" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialLogs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-12 text-center text-muted-foreground"
                  >
                    No activity for this period
                  </TableCell>
                </TableRow>
              ) : (
                initialLogs.map((entry) => {
                  const style =
                    ACTION_STYLES[entry.action] ?? UNKNOWN_ACTION_STYLE;
                  const hasDetails =
                    entry.changes && Object.keys(entry.changes).length > 0;
                  const isExpanded = expandedRows.has(entry.id);
                  return (
                    <React.Fragment key={entry.id}>
                      <TableRow
                        onClick={() => hasDetails && toggleRow(entry.id)}
                        className={hasDetails ? 'cursor-pointer' : undefined}
                      >
                        <TableCell className="font-mono text-sm text-muted-foreground">
                          {/* Displayed in browser local time; log entries are filtered by UTC day boundaries */}
                          {format(
                            new Date(entry.createdAt),
                            isSingleDay ? 'HH:mm:ss' : 'MMM d HH:mm'
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {entry.userName}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {ENTITY_LABELS[entry.entityType] ?? entry.entityType}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={style.className}>
                            {style.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">
                            {entry.entityName}
                          </span>
                          <span className="ml-1 text-xs text-muted-foreground">
                            {entry.entitySku}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {hasDetails && (
                            <ChevronDown
                              className={cn(
                                'h-4 w-4 transition-transform',
                                isExpanded && 'rotate-180'
                              )}
                            />
                          )}
                        </TableCell>
                      </TableRow>
                      {isExpanded && hasDetails && (
                        <TableRow
                          key={`${entry.id}-details`}
                          className="bg-muted/30 hover:bg-muted/30"
                        >
                          <TableCell colSpan={6} className="py-0">
                            <DetailsPanel changes={entry.changes!} />
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
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
