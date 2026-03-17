"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, Loader2, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { parseReceiptText, type ParsedReceipt } from "@/lib/receipt-parser";
import { cn } from "@/lib/utils";

interface ZReadingScannerProps {
  onScanned: (result: ParsedReceipt, imageFile: File) => void;
  onCancel: () => void;
}

type ScanStep = "upload" | "processing";

export function ZReadingScanner({ onScanned, onCancel }: ZReadingScannerProps) {
  const [step, setStep] = useState<ScanStep>("upload");
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processImage = useCallback(
    async (file: File) => {
      setStep("processing");
      setError(null);
      setProgress(0);

      try {
        const { createWorker } = await import("tesseract.js");

        const worker = await createWorker("eng", undefined, {
          logger: (m: { progress: number }) => {
            if (m.progress) {
              setProgress(Math.round(m.progress * 100));
            }
          },
        });

        const {
          data: { text },
        } = await worker.recognize(file);

        await worker.terminate();

        const parsed = parseReceiptText(text);
        onScanned(parsed, file);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "OCR processing failed"
        );
        setStep("upload");
      }
    },
    [onScanned]
  );

  function handleFile(file: File) {
    const validTypes = ["image/jpeg", "image/png", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      setError("Please upload a JPG or PNG image.");
      return;
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setError("File size must be under 10MB.");
      return;
    }

    processImage(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(true);
  }

  function handleDragLeave() {
    setDragActive(false);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  if (step === "processing") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <div className="space-y-1 text-center">
          <p className="text-sm font-medium">Scanning receipt...</p>
          <p className="text-sm text-muted-foreground">{progress}% complete</p>
        </div>
        <div className="h-1.5 w-48 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-foreground/20 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed py-16 transition-colors",
          dragActive
            ? "border-foreground/30 bg-muted/50"
            : "border-foreground/10"
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <div className="rounded-full bg-muted p-3">
          <ImageIcon className="h-6 w-6 text-muted-foreground" />
        </div>
        <div className="space-y-1 text-center">
          <p className="text-sm font-medium">
            Drop a receipt image here, or click to browse
          </p>
          <p className="text-xs text-muted-foreground">
            JPG or PNG, max 10MB
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="mr-1 h-3 w-3" />
          Choose File
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png"
          className="hidden"
          onChange={handleInputChange}
        />
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive-muted px-4 py-3 text-sm text-destructive-muted-foreground">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
