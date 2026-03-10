"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { UploadForm } from "@/components/sales/upload-form";
import { UploadPreview } from "@/components/sales/upload-preview";
import { ArrowLeft } from "lucide-react";
import type { ColumnMapping } from "@/lib/sales-parser";

type Step = "upload" | "preview";

interface ParsedData {
  headers: string[];
  data: Record<string, unknown>[];
  mapping: ColumnMapping;
  saleDate: string;
  fileName: string;
}

export function UploadFlowClient() {
  const [step, setStep] = useState<Step>("upload");
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);

  function handleParsed(
    headers: string[],
    data: Record<string, unknown>[],
    mapping: ColumnMapping,
    saleDate: string,
    fileName: string
  ) {
    setParsedData({ headers, data, mapping, saleDate, fileName });
    setStep("preview");
  }

  function handleCancel() {
    setParsedData(null);
    setStep("upload");
  }

  return (
    <div className="space-y-4">
      {/* Back button on preview step */}
      {step === "preview" && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCancel}
          className="gap-1"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to file selection
        </Button>
      )}

      {/* Step 1: File selection + parsing (includes column mapper when needed) */}
      {step === "upload" && <UploadForm onParsed={handleParsed} />}

      {/* Step 2: Preview + confirm */}
      {step === "preview" && parsedData && (
        <UploadPreview
          rawData={parsedData.data}
          mapping={parsedData.mapping}
          saleDate={parsedData.saleDate}
          fileName={parsedData.fileName}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}
