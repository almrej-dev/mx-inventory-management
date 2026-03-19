'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { submitReconciliation } from '@/actions/stock';
import { mgToGrams } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowUp, ArrowDown, ArrowUpDown, Search } from 'lucide-react';
import type { ItemTypeValue } from '@/types';

interface ReconciliationItem {
  id: number;
  name: string;
  sku: string;
  type: ItemTypeValue;
  unitType: string;
  stockQty: number;
}

interface ReconciliationFormProps {
  items: ReconciliationItem[];
}

type ItemTypeFilter = 'ALL' | ItemTypeValue;
type SortColumn = 'name' | 'type' | 'stockQty' | 'variance';
type SortDirection = 'asc' | 'desc';

/**
 * Convert storage units to display quantity.
 * pcs items: pieces (no conversion), grams items: mg -> grams
 */
function storageToDisplay(stockQty: number, unitType: string): number {
  if (unitType === 'pcs') return stockQty;
  return parseFloat(mgToGrams(stockQty));
}

/**
 * Unit label for an item.
 */
function unitLabel(unitType: string): string {
  return unitType === 'pcs' ? 'pcs' : 'g';
}

/**
 * Format a type value for readable display.
 */
function formatType(type: ItemTypeValue): string {
  return type
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const DRAFT_KEY = 'mx-draft:stock-reconciliation';

function loadReconciliationDraft(): {
  counts: Record<number, string>;
  notes: string;
} | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw
      ? (JSON.parse(raw) as { counts: Record<number, string>; notes: string })
      : null;
  } catch {
    return null;
  }
}

export function ReconciliationForm({ items }: ReconciliationFormProps) {
  // Map of itemId -> user-entered physical count string (empty string = not entered)
  const [counts, setCounts] = useState<Record<number, string>>({});
  const [notes, setNotes] = useState('');

  // Restore draft after hydration to avoid SSR mismatch
  useEffect(() => {
    const saved = loadReconciliationDraft();
    if (saved) {
      setCounts(saved.counts);
      setNotes(saved.notes);
    }
  }, []);
  const [typeFilter, setTypeFilter] = useState<ItemTypeFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Debounced persistence of counts + notes
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const persistDraft = useCallback((c: Record<number, string>, n: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({ counts: c, notes: n })
        );
      } catch {
        /* ignore */
      }
    }, 300);
  }, []);
  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }
  }, []);
  const [submitStatus, setSubmitStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 10;

  function handleSort(column: SortColumn) {
    if (sortColumn === column) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        // Third click: clear sort
        setSortColumn(null);
        setSortDirection('asc');
      }
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  }

  const filteredItems = useMemo(() => {
    let result = items;

    if (typeFilter !== 'ALL') {
      result = result.filter((item) => item.type === typeFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.sku.toLowerCase().includes(q)
      );
    }

    if (sortColumn) {
      result = [...result].sort((a, b) => {
        let cmp = 0;
        switch (sortColumn) {
          case 'name':
            cmp = a.name.localeCompare(b.name);
            break;
          case 'type':
            cmp = a.type.localeCompare(b.type);
            break;
          case 'stockQty':
            cmp =
              storageToDisplay(a.stockQty, a.unitType) -
              storageToDisplay(b.stockQty, b.unitType);
            break;
          case 'variance': {
            const varA = (() => {
              const raw = counts[a.id];
              if (raw === undefined || raw === '') return null;
              const physical = parseFloat(raw);
              if (isNaN(physical)) return null;
              return physical - storageToDisplay(a.stockQty, a.unitType);
            })();
            const varB = (() => {
              const raw = counts[b.id];
              if (raw === undefined || raw === '') return null;
              const physical = parseFloat(raw);
              if (isNaN(physical)) return null;
              return physical - storageToDisplay(b.stockQty, b.unitType);
            })();
            // Nulls sort last
            if (varA === null && varB === null) cmp = 0;
            else if (varA === null) cmp = 1;
            else if (varB === null) cmp = -1;
            else cmp = varA - varB;
            break;
          }
        }
        return sortDirection === 'desc' ? -cmp : cmp;
      });
    }

    return result;
  }, [items, typeFilter, searchQuery, sortColumn, sortDirection, counts]);

  const pageCount = Math.ceil(filteredItems.length / pageSize);

  const paginatedItems = useMemo(() => {
    const start = currentPage * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  // Reset to first page when filters change
  const filterKey = `${typeFilter}-${searchQuery}-${sortColumn}-${sortDirection}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setCurrentPage(0);
  }

  function handleCountChange(itemId: number, value: string) {
    setCounts((prev) => {
      const next = { ...prev, [itemId]: value };
      persistDraft(next, notes);
      return next;
    });
  }

  // Compute variance for a single item (in display units)
  function getVariance(item: ReconciliationItem): number | null {
    const raw = counts[item.id];
    if (raw === undefined || raw === '') return null;
    const physical = parseFloat(raw);
    if (isNaN(physical)) return null;
    const system = storageToDisplay(item.stockQty, item.unitType);
    return parseFloat((physical - system).toFixed(2));
  }

  // Count items that have a non-zero variance (would be adjusted on submit)
  const discrepantCount = useMemo(() => {
    return items.filter((item) => {
      const raw = counts[item.id];
      if (raw === undefined || raw === '') return false;
      const physical = parseFloat(raw);
      if (isNaN(physical)) return false;
      const system = storageToDisplay(item.stockQty, item.unitType);
      const variance = parseFloat((physical - system).toFixed(2));
      return variance !== 0;
    }).length;
  }, [counts, items]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitStatus(null);

    // Collect only items where user entered a physical count
    const enteredCounts = items
      .filter((item) => {
        const raw = counts[item.id];
        return raw !== undefined && raw !== '';
      })
      .map((item) => ({
        itemId: item.id,
        physicalCount: parseFloat(counts[item.id])
      }))
      .filter((c) => !isNaN(c.physicalCount));

    if (enteredCounts.length === 0) {
      setSubmitStatus({
        type: 'error',
        message: 'Please enter at least one physical count.'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await submitReconciliation({
        counts: enteredCounts,
        notes: notes || undefined
      });

      if (result.error) {
        setSubmitStatus({ type: 'error', message: result.error });
      } else {
        setSubmitStatus({
          type: 'success',
          message: result.message ?? 'Reconciliation submitted.'
        });
        // Clear entered counts on success
        setCounts({});
        setNotes('');
        clearDraft();
      }
    } catch {
      setSubmitStatus({
        type: 'error',
        message: 'An unexpected error occurred.'
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const itemTypeOptions: { value: ItemTypeFilter; label: string }[] = [
    { value: 'ALL', label: 'All Types' },
    { value: 'RAW_MATERIAL', label: 'Raw Material' },
    { value: 'SEMI_FINISHED', label: 'Semi-Finished' },
    { value: 'FINISHED', label: 'Finished' },
    { value: 'PACKAGING', label: 'Packaging' }
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Status message */}
      {submitStatus && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            submitStatus.type === 'success'
              ? 'border-success/30 bg-success-muted text-success-muted-foreground'
              : 'border-destructive/30 bg-destructive-muted text-destructive-muted-foreground'
          }`}
        >
          {submitStatus.message}
        </div>
      )}

      {/* Search & type filter */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-56 pl-8"
          />
        </div>
        <Label htmlFor="typeFilter" className="shrink-0">
          Filter by type:
        </Label>
        <div className="relative">
          <select
            id="typeFilter"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as ItemTypeFilter)}
            className="flex h-9 appearance-none rounded-lg border border-input bg-background px-2.5 py-2 pr-8 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {itemTypeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <svg
            className="pointer-events-none absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>
        <span className="text-sm text-muted-foreground">
          {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''}{' '}
          shown
        </span>
      </div>

      {/* Item table */}
      {filteredItems.length === 0 ? (
        <div className="rounded-lg border border-dashed px-6 py-10 text-center">
          <p className="text-muted-foreground">
            No items match the selected filter.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">
                  <button
                    type="button"
                    onClick={() => handleSort('name')}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    Item
                    {sortColumn === 'name' ? (
                      sortDirection === 'asc' ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-left font-medium">
                  <button
                    type="button"
                    onClick={() => handleSort('type')}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    Type
                    {sortColumn === 'type' ? (
                      sortDirection === 'asc' ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-right font-medium">
                  <button
                    type="button"
                    onClick={() => handleSort('stockQty')}
                    className="inline-flex w-full items-center justify-end gap-1 hover:text-foreground"
                  >
                    System Stock
                    {sortColumn === 'stockQty' ? (
                      sortDirection === 'asc' ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-right font-medium">
                  <button
                    type="button"
                    onClick={() => handleSort('variance')}
                    className="inline-flex w-full items-center justify-end gap-1 hover:text-foreground"
                  >
                    Variance
                    {sortColumn === 'variance' ? (
                      sortDirection === 'asc' ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-right font-medium">
                  Physical Count
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedItems.map((item) => {
                const systemDisplay = storageToDisplay(
                  item.stockQty,
                  item.unitType
                );
                const unit = unitLabel(item.unitType);
                const variance = getVariance(item);

                let varianceDisplay = '-';
                let varianceClass = 'text-muted-foreground';

                if (variance !== null) {
                  const sign = variance > 0 ? '+' : '';
                  varianceDisplay = `${sign}${variance} ${unit}`;
                  if (variance > 0) {
                    varianceClass = 'text-success font-medium';
                  } else if (variance < 0) {
                    varianceClass = 'text-destructive font-medium';
                  } else {
                    varianceClass = 'text-muted-foreground';
                  }
                }

                return (
                  <tr
                    key={item.id}
                    className="border-b last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-4 py-3">
                      <div>
                        <span className="font-medium">{item.name}</span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {item.sku}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatType(item.type)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {systemDisplay} {unit}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-mono ${varianceClass}`}
                    >
                      {varianceDisplay}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={counts[item.id] ?? ''}
                        onChange={(e) =>
                          handleCountChange(item.id, e.target.value)
                        }
                        placeholder={`e.g. ${systemDisplay}`}
                        className="w-32 rounded-md border border-input bg-transparent px-2.5 py-1 text-right font-mono text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                      />
                      <span className="ml-1 inline-block w-6 text-left text-xs text-muted-foreground">
                        {unit}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="flex items-center justify-end gap-2">
          <span className="text-sm text-muted-foreground">
            Page {currentPage + 1} of {pageCount}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => p - 1)}
            disabled={currentPage === 0}
          >
            Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => p + 1)}
            disabled={currentPage >= pageCount - 1}
          >
            Next
          </Button>
        </div>
      )}

      {/* Summary before submit */}
      {discrepantCount > 0 && (
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            {discrepantCount} item{discrepantCount !== 1 ? 's' : ''}
          </span>{' '}
          with discrepancies will be adjusted.
        </p>
      )}

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Reconciliation Notes (optional)</Label>
        <Textarea
          id="notes"
          placeholder="e.g. Month-end physical count, counted by warehouse staff"
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            persistDraft(counts, e.target.value);
          }}
          className="max-w-lg"
        />
      </div>

      {/* Submit */}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Submitting...' : 'Submit Reconciliation'}
      </Button>
    </form>
  );
}
