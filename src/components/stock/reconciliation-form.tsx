"use client";

import { useState, useMemo } from "react";
import { submitReconciliation } from "@/actions/stock";
import { mgToGrams } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { ItemTypeValue } from "@/types";

interface ReconciliationItem {
  id: number;
  name: string;
  sku: string;
  type: ItemTypeValue;
  stockQty: number;
}

interface ReconciliationFormProps {
  items: ReconciliationItem[];
}

type ItemTypeFilter = "ALL" | ItemTypeValue;

/**
 * Convert storage units to display quantity string.
 * PACKAGING: pieces, all others: grams
 */
function storageToDisplay(stockQty: number, type: ItemTypeValue): number {
  if (type === "PACKAGING") return stockQty;
  return parseFloat(mgToGrams(stockQty));
}

/**
 * Unit label for an item type.
 */
function unitLabel(type: ItemTypeValue): string {
  return type === "PACKAGING" ? "pcs" : "g";
}

/**
 * Format a type value for readable display.
 */
function formatType(type: ItemTypeValue): string {
  return type.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ReconciliationForm({ items }: ReconciliationFormProps) {
  // Map of itemId -> user-entered physical count string (empty string = not entered)
  const [counts, setCounts] = useState<Record<number, string>>({});
  const [notes, setNotes] = useState("");
  const [typeFilter, setTypeFilter] = useState<ItemTypeFilter>("ALL");
  const [submitStatus, setSubmitStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredItems = useMemo(() => {
    if (typeFilter === "ALL") return items;
    return items.filter((item) => item.type === typeFilter);
  }, [items, typeFilter]);

  function handleCountChange(itemId: number, value: string) {
    setCounts((prev) => ({ ...prev, [itemId]: value }));
  }

  // Compute variance for a single item (in display units)
  function getVariance(item: ReconciliationItem): number | null {
    const raw = counts[item.id];
    if (raw === undefined || raw === "") return null;
    const physical = parseFloat(raw);
    if (isNaN(physical)) return null;
    const system = storageToDisplay(item.stockQty, item.type);
    return parseFloat((physical - system).toFixed(2));
  }

  // Count items that have a non-zero variance (would be adjusted on submit)
  const discrepantCount = useMemo(() => {
    return items.filter((item) => {
      const variance = getVariance(item);
      return variance !== null && variance !== 0;
    }).length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [counts, items]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitStatus(null);

    // Collect only items where user entered a physical count
    const enteredCounts = items
      .filter((item) => {
        const raw = counts[item.id];
        return raw !== undefined && raw !== "";
      })
      .map((item) => ({
        itemId: item.id,
        physicalCount: parseFloat(counts[item.id]),
      }))
      .filter((c) => !isNaN(c.physicalCount));

    if (enteredCounts.length === 0) {
      setSubmitStatus({
        type: "error",
        message: "Please enter at least one physical count.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await submitReconciliation({
        counts: enteredCounts,
        notes: notes || undefined,
      });

      if (result.error) {
        setSubmitStatus({ type: "error", message: result.error });
      } else {
        setSubmitStatus({
          type: "success",
          message: result.message ?? "Reconciliation submitted.",
        });
        // Clear entered counts on success
        setCounts({});
        setNotes("");
      }
    } catch {
      setSubmitStatus({
        type: "error",
        message: "An unexpected error occurred.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const itemTypeOptions: { value: ItemTypeFilter; label: string }[] = [
    { value: "ALL", label: "All Types" },
    { value: "RAW_MATERIAL", label: "Raw Material" },
    { value: "SEMI_FINISHED", label: "Semi-Finished" },
    { value: "FINISHED", label: "Finished" },
    { value: "PACKAGING", label: "Packaging" },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Status message */}
      {submitStatus && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            submitStatus.type === "success"
              ? "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200"
              : "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
          }`}
        >
          {submitStatus.message}
        </div>
      )}

      {/* Type filter */}
      <div className="flex items-center gap-3">
        <Label htmlFor="typeFilter" className="shrink-0">
          Filter by type:
        </Label>
        <select
          id="typeFilter"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as ItemTypeFilter)}
          className="flex h-8 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        >
          {itemTypeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <span className="text-sm text-muted-foreground">
          {filteredItems.length} item{filteredItems.length !== 1 ? "s" : ""} shown
        </span>
      </div>

      {/* Item table */}
      {filteredItems.length === 0 ? (
        <div className="rounded-lg border border-dashed px-6 py-10 text-center">
          <p className="text-muted-foreground">No items match the selected filter.</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Item</th>
                <th className="px-4 py-3 text-left font-medium">Type</th>
                <th className="px-4 py-3 text-right font-medium">System Stock</th>
                <th className="px-4 py-3 text-right font-medium">Physical Count</th>
                <th className="px-4 py-3 text-right font-medium">Variance</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => {
                const systemDisplay = storageToDisplay(item.stockQty, item.type);
                const unit = unitLabel(item.type);
                const variance = getVariance(item);

                let varianceDisplay = "-";
                let varianceClass = "text-muted-foreground";

                if (variance !== null) {
                  const sign = variance > 0 ? "+" : "";
                  varianceDisplay = `${sign}${variance} ${unit}`;
                  if (variance > 0) {
                    varianceClass = "text-green-600 dark:text-green-400 font-medium";
                  } else if (variance < 0) {
                    varianceClass = "text-red-600 dark:text-red-400 font-medium";
                  } else {
                    varianceClass = "text-muted-foreground";
                  }
                }

                return (
                  <tr key={item.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div>
                        <span className="font-medium">{item.name}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{item.sku}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatType(item.type)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {systemDisplay} {unit}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={counts[item.id] ?? ""}
                        onChange={(e) => handleCountChange(item.id, e.target.value)}
                        placeholder={`e.g. ${systemDisplay}`}
                        className="w-32 rounded-md border border-input bg-transparent px-2.5 py-1 text-right text-sm font-mono outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                      />
                      <span className="ml-1 text-xs text-muted-foreground">{unit}</span>
                    </td>
                    <td className={`px-4 py-3 text-right font-mono ${varianceClass}`}>
                      {varianceDisplay}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary before submit */}
      {discrepantCount > 0 && (
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{discrepantCount} item{discrepantCount !== 1 ? "s" : ""}</span> with discrepancies will be adjusted.
        </p>
      )}

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Reconciliation Notes (optional)</Label>
        <Textarea
          id="notes"
          placeholder="e.g. Month-end physical count, counted by warehouse staff"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="max-w-lg"
        />
      </div>

      {/* Submit */}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Submitting..." : "Submit Reconciliation"}
      </Button>
    </form>
  );
}
