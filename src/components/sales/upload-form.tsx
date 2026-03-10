"use client";

import { useState, useCallback, useRef } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { suggestMapping, type ColumnMapping } from "@/lib/sales-parser";
import { ColumnMapper } from "@/components/sales/column-mapper";

interface UploadFormProps {
  onParsed: (
    headers: string[],
    data: Record<string, unknown>[],
    mapping: ColumnMapping,
    saleDate: string,
    fileName: string
  ) => void;
}

export function UploadForm({ onParsed }: UploadFormProps) {
  const [saleDate, setSaleDate] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 10);
  });
  const [isDragging, setIsDragging] = useState(false);
  const [parseResult, setParseResult] = useState<{
    headers: string[];
    data: Record<string, unknown>[];
    fileName: string;
    suggestedMapping: Partial<ColumnMapping>;
    needsMapping: boolean;
  } | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    (file: File) => {
      setParseError(null);
      setParseResult(null);

      const ext = file.name.split(".").pop()?.toLowerCase();

      if (ext === "csv") {
        Papa.parse<Record<string, unknown>>(file, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: true,
          complete: (results) => {
            if (!results.data.length) {
              setParseError("File contains no data rows.");
              return;
            }
            const headers = results.meta.fields || [];
            handleParsedData(headers, results.data, file.name);
          },
          error: (err) => {
            setParseError(`CSV parse error: ${err.message}`);
          },
        });
      } else if (ext === "xlsx" || ext === "xls") {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: "array" });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(
              firstSheet
            );
            if (!jsonData.length) {
              setParseError("File contains no data rows.");
              return;
            }
            const headers = Object.keys(jsonData[0]);
            handleParsedData(headers, jsonData, file.name);
          } catch {
            setParseError("Failed to parse Excel file. Please check the format.");
          }
        };
        reader.onerror = () => {
          setParseError("Failed to read file.");
        };
        reader.readAsArrayBuffer(file);
      } else {
        setParseError("Unsupported file type. Please upload a .csv, .xlsx, or .xls file.");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [saleDate]
  );

  function handleParsedData(
    headers: string[],
    data: Record<string, unknown>[],
    fileName: string
  ) {
    const suggested = suggestMapping(headers);
    const hasRequired = !!suggested.productColumn && !!suggested.quantityColumn;

    if (hasRequired) {
      // Auto-detection found all required fields -- skip to preview
      onParsed(
        headers,
        data,
        {
          productColumn: suggested.productColumn!,
          quantityColumn: suggested.quantityColumn!,
          dateColumn: suggested.dateColumn,
          priceColumn: suggested.priceColumn,
        },
        saleDate,
        fileName
      );
    } else {
      // Show column mapper
      setParseResult({
        headers,
        data,
        fileName,
        suggestedMapping: suggested,
        needsMapping: true,
      });
    }
  }

  function handleMappingConfirm(mapping: ColumnMapping) {
    if (!parseResult) return;
    onParsed(
      parseResult.headers,
      parseResult.data,
      mapping,
      saleDate,
      parseResult.fileName
    );
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  return (
    <div className="space-y-6">
      {/* Sale date */}
      <div className="space-y-2">
        <Label htmlFor="saleDate">Sale Date</Label>
        <input
          id="saleDate"
          type="date"
          value={saleDate}
          onChange={(e) => setSaleDate(e.target.value)}
          className="flex h-8 w-full max-w-xs rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <p className="text-xs text-muted-foreground">
          Used when the file does not contain a per-row sale date.
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 transition-colors ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50"
        }`}
      >
        <Upload className="mb-3 h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium">
          Drop a file here or click to browse
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Supports CSV, XLSX, and XLS files
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Parse error */}
      {parseError && (
        <div className="rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {parseError}
        </div>
      )}

      {/* File info + column mapper */}
      {parseResult && (
        <div className="space-y-4">
          <div className="rounded-md border border-border bg-muted/50 px-4 py-3 text-sm">
            <span className="font-medium">{parseResult.fileName}</span>
            <span className="ml-2 text-muted-foreground">
              ({parseResult.data.length} rows detected)
            </span>
          </div>

          {parseResult.needsMapping && (
            <ColumnMapper
              headers={parseResult.headers}
              suggestedMapping={parseResult.suggestedMapping}
              onConfirm={handleMappingConfirm}
            />
          )}
        </div>
      )}
    </div>
  );
}
