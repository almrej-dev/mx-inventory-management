"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="text-sm text-muted-foreground">
        Failed to load the page. Please try again.
      </p>
      {process.env.NODE_ENV === "development" && (
        <pre className="max-w-lg overflow-auto rounded-md bg-muted p-4 text-xs">
          {error.message}
        </pre>
      )}
      <Button onClick={() => reset()}>Try again</Button>
    </div>
  );
}
