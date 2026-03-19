"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Wifi, Server, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

const troubleshootingTips = [
  {
    icon: Wifi,
    title: "Check your internet connection",
    description: "Make sure you are connected to a stable network.",
  },
  {
    icon: Server,
    title: "Database may be temporarily unavailable",
    description:
      "The server could be undergoing maintenance. Wait a moment and try again.",
  },
  {
    icon: Globe,
    title: "Firewall or VPN interference",
    description:
      "If you're on a restricted network, try disabling your VPN or adjusting firewall settings.",
  },
];

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
    <div className="flex flex-col items-center justify-center px-4 py-20">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <AlertTriangle className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold tracking-tight">
              There was a problem loading this page
            </h2>
            <p className="text-sm text-muted-foreground">
              This is usually temporary. Here are some things you can check:
            </p>
          </div>
        </div>

        <ul className="space-y-3">
          {troubleshootingTips.map((tip) => (
            <li
              key={tip.title}
              className="flex gap-3 rounded-lg border border-border/50 bg-muted/40 p-3"
            >
              <tip.icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="space-y-0.5">
                <p className="text-sm font-medium leading-tight">
                  {tip.title}
                </p>
                <p className="text-xs text-muted-foreground leading-snug">
                  {tip.description}
                </p>
              </div>
            </li>
          ))}
        </ul>

        {process.env.NODE_ENV === "development" && (
          <pre className="overflow-auto rounded-lg bg-muted p-3 text-xs text-muted-foreground">
            {error.message}
          </pre>
        )}

        <div className="flex justify-center">
          <Button onClick={() => reset()} variant="outline" size="sm">
            <RefreshCw className="h-3 w-3" />
            Try again
          </Button>
        </div>
      </div>
    </div>
  );
}
