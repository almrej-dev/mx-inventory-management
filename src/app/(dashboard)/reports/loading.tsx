import { Skeleton } from "@/components/ui/skeleton";

export default function ReportsLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="rounded-lg border p-4 space-y-4">
        <div className="flex flex-wrap gap-3">
          <Skeleton className="h-10 w-44" />
          <Skeleton className="h-10 w-44" />
          <Skeleton className="h-10 w-44" />
          <Skeleton className="h-10 w-28" />
        </div>
      </div>
      <div className="rounded-lg border p-6">
        <Skeleton className="h-5 w-36 mb-4" />
        <Skeleton className="h-72 w-full rounded" />
      </div>
    </div>
  );
}
