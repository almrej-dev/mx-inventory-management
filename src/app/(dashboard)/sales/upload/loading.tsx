import { Skeleton } from "@/components/ui/skeleton";

export default function UploadSalesLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-4 w-80" />
      </div>
      <Skeleton className="h-48 w-full rounded-lg" />
    </div>
  );
}
