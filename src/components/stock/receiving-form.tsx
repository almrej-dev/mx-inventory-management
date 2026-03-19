'use client';

import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { receiveStockBatch } from '@/actions/stock';
import { mgToGrams } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowUp, ArrowDown, ArrowUpDown, Search } from 'lucide-react';
import type { ItemTypeValue } from '@/types';

interface ItemOption {
  id: number;
  name: string;
  sku: string;
  type: ItemTypeValue;
  unitType: string;
  cartonSize: number;
  unitWeightMg: number;
  costPerCartonCentavos: number;
  stockQty: number;
}

interface ReceivingFormProps {
  items: ItemOption[];
}

type ItemTypeFilter = 'ALL' | ItemTypeValue;
type SortColumn = 'name' | 'type' | 'costPerCarton' | 'systemStock';
type SortDirection = 'asc' | 'desc';

interface RowData {
  quantity: string;
  date: string;
}

function storageToDisplay(stockQty: number, unitType: string): number {
  if (unitType === 'pcs') return stockQty;
  return parseFloat(mgToGrams(stockQty));
}

function unitLabel(unitType: string): string {
  return unitType === 'pcs' ? 'pcs' : 'g';
}

function formatType(type: ItemTypeValue): string {
  return type
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function loadReceivingDraft(): { rows: Record<number, RowData>; notes: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('mx-draft:stock-receiving');
    return raw ? (JSON.parse(raw) as { rows: Record<number, RowData>; notes: string }) : null;
  } catch {
    return null;
  }
}

export function ReceivingForm({ items }: ReceivingFormProps) {
  const today = new Date().toISOString().split('T')[0];

  const [rows, setRows] = useState<Record<number, RowData>>({});
  const [notes, setNotes] = useState('');

  // Restore draft after hydration to avoid SSR mismatch
  useEffect(() => {
    const saved = loadReceivingDraft();
    if (saved) {
      setRows(saved.rows);
      setNotes(saved.notes);
    }
  }, []);
  const [typeFilter, setTypeFilter] = useState<ItemTypeFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [submitStatus, setSubmitStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 10;

  // Draft persistence
  const DRAFT_KEY = 'mx-draft:stock-receiving';
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const persistDraft = useCallback(
    (r: Record<number, RowData>, n: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        try {
          localStorage.setItem(DRAFT_KEY, JSON.stringify({ rows: r, notes: n }));
        } catch { /* ignore */ }
      }, 300);
    },
    []
  );
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);
  const clearDraft = useCallback(() => {
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
  }, []);

  function updateRow(itemId: number, field: keyof RowData, value: string) {
    setRows((prev) => {
      const next = {
        ...prev,
        [itemId]: {
          quantity: prev[itemId]?.quantity ?? '',
          date: prev[itemId]?.date ?? today,
          [field]: value
        }
      };
      persistDraft(next, notes);
      return next;
    });
  }

  function handleSort(column: SortColumn) {
    if (sortColumn === column) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
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
          case 'costPerCarton':
            cmp = a.costPerCartonCentavos - b.costPerCartonCentavos;
            break;
          case 'systemStock':
            cmp = a.stockQty - b.stockQty;
            break;
        }
        return sortDirection === 'desc' ? -cmp : cmp;
      });
    }

    return result;
  }, [items, typeFilter, searchQuery, sortColumn, sortDirection]);

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

  const entryCount = useMemo(() => {
    return items.filter((item) => {
      const qty = rows[item.id]?.quantity;
      return qty !== undefined && qty !== '' && parseFloat(qty) > 0;
    }).length;
  }, [rows, items]);

  const totalCost = useMemo(() => {
    let total = 0;
    for (const item of items) {
      const qty = parseFloat(rows[item.id]?.quantity ?? '');
      if (!qty || qty <= 0) continue;
      const costPesos = item.costPerCartonCentavos / 100;
      total += qty * costPesos;
    }
    return total;
  }, [rows, items]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitStatus(null);

    const entries = items
      .filter((item) => {
        const qty = rows[item.id]?.quantity;
        return qty !== undefined && qty !== '' && parseFloat(qty) > 0;
      })
      .map((item) => {
        const row = rows[item.id];
        return {
          itemId: item.id,
          quantityCartons: parseFloat(row.quantity),
          receivedDate: row.date || today,
          costPesos: item.costPerCartonCentavos / 100
        };
      })
      .filter((e) => !isNaN(e.quantityCartons));

    if (entries.length === 0) {
      setSubmitStatus({
        type: 'error',
        message: 'Please enter a quantity for at least one item.'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await receiveStockBatch({
        entries,
        notes: notes || undefined
      });

      if (result.error) {
        setSubmitStatus({ type: 'error', message: result.error });
      } else {
        setSubmitStatus({
          type: 'success',
          message: result.message ?? 'Stock received successfully.'
        });
        setRows({});
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
                    onClick={() => handleSort('costPerCarton')}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    Cost/Carton (PHP)
                    {sortColumn === 'costPerCarton' ? (
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
                    onClick={() => handleSort('systemStock')}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    System Stock
                    {sortColumn === 'systemStock' ? (
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
                  Quantity (Cartons)
                </th>
                <th className="px-4 py-3 text-left font-medium">
                  Received Date
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedItems.map((item) => {
                const row = rows[item.id];
                const quantity = row?.quantity ?? '';
                const date = row?.date ?? today;
                const costPesos = item.costPerCartonCentavos / 100;

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
                      {costPesos.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {storageToDisplay(
                        item.stockQty,
                        item.unitType
                      ).toLocaleString()}{' '}
                      <span className="text-xs text-muted-foreground">
                        {unitLabel(item.unitType)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <input
                        type="number"
                        step="1"
                        min="1"
                        value={quantity}
                        onChange={(e) =>
                          updateRow(item.id, 'quantity', e.target.value)
                        }
                        placeholder="0"
                        className="w-24 rounded-md border border-input bg-transparent px-2.5 py-1 text-right font-mono text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="date"
                        value={date}
                        onChange={(e) =>
                          updateRow(item.id, 'date', e.target.value)
                        }
                        className="rounded-md border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                      />
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
      {entryCount > 0 && (
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">
              {entryCount} item{entryCount !== 1 ? 's' : ''}
            </span>{' '}
            to receive.
          </p>
          {totalCost > 0 && (
            <p>
              Total cost:{' '}
              <span className="font-medium text-foreground">
                PHP{' '}
                {totalCost.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </span>
            </p>
          )}
        </div>
      )}

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea
          id="notes"
          placeholder="Supplier name, invoice number, etc."
          value={notes}
          onChange={(e) => { setNotes(e.target.value); persistDraft(rows, e.target.value); }}
          className="max-w-lg"
        />
      </div>

      {/* Submit */}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Recording...' : 'Record Receiving'}
      </Button>
    </form>
  );
}
