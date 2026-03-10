"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { ColumnMapping } from "@/lib/sales-parser";

interface ColumnMapperProps {
  headers: string[];
  suggestedMapping: Partial<ColumnMapping>;
  onConfirm: (mapping: ColumnMapping) => void;
}

export function ColumnMapper({
  headers,
  suggestedMapping,
  onConfirm,
}: ColumnMapperProps) {
  const [productColumn, setProductColumn] = useState(
    suggestedMapping.productColumn || ""
  );
  const [quantityColumn, setQuantityColumn] = useState(
    suggestedMapping.quantityColumn || ""
  );
  const [dateColumn, setDateColumn] = useState(
    suggestedMapping.dateColumn || ""
  );
  const [priceColumn, setPriceColumn] = useState(
    suggestedMapping.priceColumn || ""
  );

  const isValid = productColumn !== "" && quantityColumn !== "";

  function handleConfirm() {
    if (!isValid) return;
    onConfirm({
      productColumn,
      quantityColumn,
      dateColumn: dateColumn || undefined,
      priceColumn: priceColumn || undefined,
    });
  }

  const selectClassName =
    "flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4">
      <div>
        <h3 className="text-sm font-semibold">Map Columns</h3>
        <p className="text-xs text-muted-foreground">
          We could not auto-detect all required columns. Please map your file
          headers to the expected fields.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Product column (required) */}
        <div className="space-y-1.5">
          <Label htmlFor="map-product">
            Product Name / SKU <span className="text-destructive">*</span>
          </Label>
          <select
            id="map-product"
            value={productColumn}
            onChange={(e) => setProductColumn(e.target.value)}
            className={selectClassName}
          >
            <option value="">-- Select column --</option>
            {headers.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </div>

        {/* Quantity column (required) */}
        <div className="space-y-1.5">
          <Label htmlFor="map-quantity">
            Quantity <span className="text-destructive">*</span>
          </Label>
          <select
            id="map-quantity"
            value={quantityColumn}
            onChange={(e) => setQuantityColumn(e.target.value)}
            className={selectClassName}
          >
            <option value="">-- Select column --</option>
            {headers.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </div>

        {/* Date column (optional) */}
        <div className="space-y-1.5">
          <Label htmlFor="map-date">Sale Date (optional)</Label>
          <select
            id="map-date"
            value={dateColumn}
            onChange={(e) => setDateColumn(e.target.value)}
            className={selectClassName}
          >
            <option value="">Use file-level date</option>
            {headers.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </div>

        {/* Price column (optional) */}
        <div className="space-y-1.5">
          <Label htmlFor="map-price">Unit Price (optional)</Label>
          <select
            id="map-price"
            value={priceColumn}
            onChange={(e) => setPriceColumn(e.target.value)}
            className={selectClassName}
          >
            <option value="">-- None --</option>
            {headers.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Button onClick={handleConfirm} disabled={!isValid}>
        Confirm Mapping
      </Button>
    </div>
  );
}
