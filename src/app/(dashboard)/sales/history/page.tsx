import Link from "next/link";
import { getSalesUploads } from "@/actions/sales";
import { SalesHistoryTable } from "@/components/sales/sales-history-table";
import { Button } from "@/components/ui/button";
import { FileUp, PenLine } from "lucide-react";

export default async function SalesHistoryPage() {
  const result = await getSalesUploads();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sales History</h1>
          <p className="text-muted-foreground">
            View all recorded sales uploads and manual entries.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/sales/upload">
            <Button variant="outline" size="sm">
              <FileUp className="mr-1 h-4 w-4" />
              Upload File
            </Button>
          </Link>
          <Link href="/sales/manual">
            <Button variant="outline" size="sm">
              <PenLine className="mr-1 h-4 w-4" />
              Manual Entry
            </Button>
          </Link>
        </div>
      </div>

      {result.error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive-muted px-4 py-3 text-sm text-destructive-muted-foreground">
          {result.error}
        </div>
      )}

      <SalesHistoryTable data={result.uploads} />
    </div>
  );
}
