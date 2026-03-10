import { ManualEntryForm } from "@/components/sales/manual-entry-form";

export default function ManualSalesEntryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Manual Sales Entry</h1>
        <p className="text-muted-foreground">
          Record individual sales when no POS export is available.
        </p>
      </div>
      <ManualEntryForm />
    </div>
  );
}
