"use client";

import { useState, useCallback, useTransition } from "react";
import { ScanLine, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RoleGate } from "@/components/layout/role-gate";
import { ZReadingTable } from "./z-reading-table";
import { ZReadingScanner } from "./z-reading-scanner";
import { ZReadingDetail } from "./z-reading-detail";
import { getZReadingDetail, deleteZReading } from "@/actions/z-reading";
import type { ParsedReceipt } from "@/lib/receipt-parser";
import type { ZReadingRow } from "./z-reading-columns";
import type { ZReadingFormData } from "@/schemas/z-reading";
import type { AppRole } from "@/types";

type View = "list" | "scan" | "detail";

interface ZReadingClientProps {
  initialData: ZReadingRow[];
  userRole: AppRole;
}

export function ZReadingClient({
  initialData,
  userRole,
}: ZReadingClientProps) {
  const [view, setView] = useState<View>("list");
  const [selectedReading, setSelectedReading] = useState<Awaited<
    ReturnType<typeof getZReadingDetail>
  >["reading"]>(null);
  const [scannedData, setScannedData] = useState<ZReadingFormData | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleView = useCallback(
    (id: number) => {
      startTransition(async () => {
        const result = await getZReadingDetail(id);
        if (result.reading) {
          setSelectedReading(result.reading);
          setScannedData(null);
          setImageFile(null);
          setView("detail");
        }
      });
    },
    []
  );

  const handleDelete = useCallback(
    (id: number) => {
      if (!confirm("Delete this Z-reading?")) return;
      startTransition(async () => {
        await deleteZReading(id);
      });
    },
    []
  );

  function handleScanned(parsed: ParsedReceipt, file: File) {
    setScannedData({
      storeName: parsed.storeName,
      receiptNumber: parsed.receiptNumber,
      receiptDate: parsed.receiptDate
        ? new Date(parsed.receiptDate).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      subtotalPesos: parsed.subtotal || undefined,
      taxPesos: parsed.tax || undefined,
      totalPesos: parsed.total || undefined,
      paymentMethod: parsed.paymentMethod,
      notes: "",
      lines:
        parsed.lines.length > 0
          ? parsed.lines.map((l) => ({
              productName: l.productName,
              quantity: l.quantity,
              unitPricePesos: l.unitPrice || undefined,
              lineTotalPesos: l.lineTotal || undefined,
            }))
          : [
              {
                productName: "",
                quantity: 1,
                unitPricePesos: undefined,
                lineTotalPesos: undefined,
              },
            ],
    });
    setImageFile(file);
    setSelectedReading(null);
    setView("detail");
  }

  function handleBack() {
    setView("list");
    setSelectedReading(null);
    setScannedData(null);
    setImageFile(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          {view !== "list" && (
            <Button
              variant="ghost"
              size="sm"
              className="mb-2"
              onClick={handleBack}
            >
              <ArrowLeft className="mr-1 h-3.5 w-3.5" />
              Back to list
            </Button>
          )}
          <h1 className="text-2xl font-bold">Z-Reading</h1>
          <p className="text-muted-foreground">
            {view === "list" && "Scanned receipt records."}
            {view === "scan" && "Upload a receipt image to scan."}
            {view === "detail" && (scannedData ? "Review scanned data." : "View receipt details.")}
          </p>
        </div>
        {view === "list" && (
          <RoleGate allowedRoles={["admin", "staff"]} userRole={userRole}>
            <Button onClick={() => setView("scan")}>
              <ScanLine className="mr-1 h-4 w-4" />
              Scan Receipt
            </Button>
          </RoleGate>
        )}
      </div>

      {view === "list" && (
        <ZReadingTable
          data={initialData}
          onView={handleView}
          onDelete={userRole === "admin" ? handleDelete : undefined}
        />
      )}

      {view === "scan" && (
        <ZReadingScanner
          onScanned={handleScanned}
          onCancel={handleBack}
        />
      )}

      {view === "detail" && (
        <ZReadingDetail
          reading={selectedReading ?? null}
          scannedData={scannedData ?? undefined}
          imageFile={imageFile ?? undefined}
          onBack={handleBack}
          userRole={userRole}
        />
      )}
    </div>
  );
}
