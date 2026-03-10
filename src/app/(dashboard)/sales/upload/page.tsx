import { UploadFlowClient } from "./upload-flow-client";

export default function UploadSalesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Upload Sales Data</h1>
        <p className="text-sm text-muted-foreground">
          Import sales from a CSV or Excel file exported from your POS system.
        </p>
      </div>
      <UploadFlowClient />
    </div>
  );
}
