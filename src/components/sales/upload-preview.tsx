"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { normalizeRow, type ColumnMapping, type NormalizedSalesRow } from "@/lib/sales-parser";
import { getFinishedItems } from "@/actions/sales";
import { processSalesLines } from "@/actions/sales";

interface FinishedItem {
  id: number;
  name: string;
  sku: string | null;
}

interface MatchedRow extends NormalizedSalesRow {
  matchedItem: FinishedItem | null;
}

interface UploadPreviewProps {
  rawData: Record<string, unknown>[];
  mapping: ColumnMapping;
  saleDate: string;
  fileName: string;
  onCancel: () => void;
}

export function UploadPreview({
  rawData,
  mapping,
  saleDate,
  fileName,
  onCancel,
}: UploadPreviewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [matchedRows, setMatchedRows] = useState<MatchedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function matchProducts() {
      setLoading(true);
      setError(null);

      try {
        const result = await getFinishedItems();
        if (result.error) {
          setError(result.error);
          setLoading(false);
          return;
        }

        const items = result.items || [];

        // Normalize rows using the parser utility
        const normalizedRows = rawData.map((row, idx) =>
          normalizeRow(row, idx + 1, mapping)
        );

        // Match each normalized row against finished items
        const matched: MatchedRow[] = normalizedRows.map((row) => {
          if (row.errors.length > 0 || !row.productIdentifier) {
            return { ...row, matchedItem: null };
          }

          const identifier = row.productIdentifier.toLowerCase();

          // Try exact SKU match (case-insensitive)
          let match = items.find(
            (item) => item.sku && item.sku.toLowerCase() === identifier
          );

          // Try exact name match (case-insensitive)
          if (!match) {
            match = items.find(
              (item) => item.name.toLowerCase() === identifier
            );
          }

          if (!match) {
            return {
              ...row,
              matchedItem: null,
              errors: [...row.errors, "Product not found in system"],
            };
          }

          return { ...row, matchedItem: match };
        });

        setMatchedRows(matched);
      } catch {
        setError("Failed to load products for matching.");
      } finally {
        setLoading(false);
      }
    }

    matchProducts();
  }, [rawData, mapping]);

  const validRows = matchedRows.filter(
    (r) => r.errors.length === 0 && r.matchedItem
  );
  const errorRows = matchedRows.filter(
    (r) => r.errors.length > 0 || !r.matchedItem
  );

  function handleConfirm() {
    setError(null);

    startTransition(async () => {
      const lines = validRows.map((row) => ({
        itemId: row.matchedItem!.id,
        productName: row.productIdentifier,
        quantity: row.quantity,
        unitPriceCentavos: row.unitPrice
          ? Math.round(row.unitPrice * 100)
          : undefined,
      }));

      const result = await processSalesLines({
        fileName,
        source: "upload" as const,
        saleDate,
        notes: undefined,
        lines,
      });

      if (result && "error" in result && result.error) {
        setError(typeof result.error === "string" ? result.error : "Failed to process sales.");
        return;
      }

      router.push("/sales/history");
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        Matching products...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-4 rounded-md border border-border bg-muted/50 px-4 py-3 text-sm">
        <span>
          <span className="font-semibold text-success">
            {validRows.length}
          </span>{" "}
          matched
        </span>
        <span>
          <span className="font-semibold text-destructive">
            {errorRows.length}
          </span>{" "}
          with errors
        </span>
        <span>
          <span className="font-semibold">{matchedRows.length}</span> total
        </span>
        <span className="text-muted-foreground">
          from <span className="font-medium">{fileName}</span>
        </span>
      </div>

      {/* Error message */}
      {error && (
        <div className="rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Preview table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-3 py-2 text-left font-medium">Row</th>
              <th className="px-3 py-2 text-left font-medium">Product (CSV)</th>
              <th className="px-3 py-2 text-left font-medium">Matched Item</th>
              <th className="px-3 py-2 text-right font-medium">Qty</th>
              <th className="px-3 py-2 text-left font-medium">Errors</th>
            </tr>
          </thead>
          <tbody>
            {matchedRows.map((row) => {
              const hasErrors = row.errors.length > 0 || !row.matchedItem;
              return (
                <tr
                  key={row.rowNumber}
                  className={
                    hasErrors
                      ? "border-b bg-destructive-muted/50"
                      : "border-b"
                  }
                >
                  <td className="px-3 py-2 text-muted-foreground">
                    {row.rowNumber}
                  </td>
                  <td className="px-3 py-2">{row.productIdentifier || "—"}</td>
                  <td className="px-3 py-2">
                    {row.matchedItem ? (
                      <span className="inline-flex items-center gap-1">
                        <Check className="h-3.5 w-3.5 text-success" />
                        {row.matchedItem.name}
                        {row.matchedItem.sku && (
                          <span className="text-muted-foreground">
                            ({row.matchedItem.sku})
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-destructive">
                        Not found
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">{row.quantity || "—"}</td>
                  <td className="px-3 py-2">
                    {row.errors.length > 0 ? (
                      <span className="inline-flex items-start gap-1 text-destructive">
                        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>{row.errors.join("; ")}</span>
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Skipped rows info */}
      {errorRows.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {errorRows.length} row(s) with errors will be skipped on confirm.
        </p>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button
          onClick={handleConfirm}
          disabled={validRows.length === 0 || isPending}
        >
          {isPending
            ? "Processing..."
            : `Confirm and Process (${validRows.length} rows)`}
        </Button>
        <Button variant="outline" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
