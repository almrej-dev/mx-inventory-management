import Link from "next/link";
import { getSalesUploadDetail } from "@/actions/sales";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { centavosToPesos } from "@/lib/utils";
import { ArrowLeft, Check, X } from "lucide-react";
import { format } from "date-fns";

interface SalesDetailPageProps {
  params: Promise<{ uploadId: string }>;
}

export default async function SalesDetailPage({ params }: SalesDetailPageProps) {
  const { uploadId } = await params;
  const id = parseInt(uploadId, 10);

  if (isNaN(id)) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">Invalid sales record ID.</p>
        <Link href="/sales/history">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to History
          </Button>
        </Link>
      </div>
    );
  }

  const result = await getSalesUploadDetail(id);

  if (result.error || !result.upload) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">Sales record not found.</p>
        <Link href="/sales/history">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to History
          </Button>
        </Link>
      </div>
    );
  }

  const upload = result.upload;
  const saleDate = format(new Date(upload.saleDate), "MMM d, yyyy");
  const title = upload.fileName || "Manual Entry";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Sales Details - {title} - {saleDate}
          </h1>
          <p className="text-muted-foreground">
            Recorded on{" "}
            {format(new Date(upload.createdAt), "MMM d, yyyy 'at' h:mm a")}
          </p>
        </div>
        <Link href="/sales/history">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to History
          </Button>
        </Link>
      </div>

      {/* Metadata */}
      <div className="flex flex-wrap gap-4">
        <div className="rounded-lg border px-4 py-2">
          <p className="text-xs text-muted-foreground">Source</p>
          <Badge variant={upload.source === "upload" ? "default" : "secondary"}>
            {upload.source === "upload" ? "Upload" : "Manual"}
          </Badge>
        </div>
        <div className="rounded-lg border px-4 py-2">
          <p className="text-xs text-muted-foreground">Date</p>
          <p className="font-medium">{saleDate}</p>
        </div>
        <div className="rounded-lg border px-4 py-2">
          <p className="text-xs text-muted-foreground">Status</p>
          <Badge
            variant={
              upload.status === "completed"
                ? "secondary"
                : upload.status === "failed"
                  ? "destructive"
                  : "outline"
            }
          >
            {upload.status}
          </Badge>
        </div>
        <div className="rounded-lg border px-4 py-2">
          <p className="text-xs text-muted-foreground">Total Lines</p>
          <p className="font-medium">{upload.lines.length}</p>
        </div>
        {upload.notes && (
          <div className="rounded-lg border px-4 py-2">
            <p className="text-xs text-muted-foreground">Notes</p>
            <p className="text-sm">{upload.notes}</p>
          </div>
        )}
      </div>

      {/* Sales Lines Table */}
      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-2 text-left font-medium">Product Name</th>
              <th className="px-4 py-2 text-left font-medium">Matched Item</th>
              <th className="px-4 py-2 text-right font-medium">Quantity</th>
              <th className="px-4 py-2 text-right font-medium">Unit Price</th>
              <th className="px-4 py-2 text-center font-medium">Deducted</th>
            </tr>
          </thead>
          <tbody>
            {upload.lines.map((line) => (
              <tr key={line.id} className="border-b last:border-0">
                <td className="px-4 py-2">{line.productName}</td>
                <td className="px-4 py-2">
                  {line.item ? (
                    <span>
                      {line.item.name}{" "}
                      <span className="font-mono text-xs text-muted-foreground">
                        ({line.item.sku})
                      </span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">--</span>
                  )}
                </td>
                <td className="px-4 py-2 text-right">{line.quantity}</td>
                <td className="px-4 py-2 text-right">
                  {line.unitPriceCentavos != null
                    ? `PHP ${centavosToPesos(line.unitPriceCentavos)}`
                    : "--"}
                </td>
                <td className="px-4 py-2 text-center">
                  {line.deducted ? (
                    <Check className="mx-auto h-4 w-4 text-green-600" />
                  ) : (
                    <X className="mx-auto h-4 w-4 text-red-500" />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
