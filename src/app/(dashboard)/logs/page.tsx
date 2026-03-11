import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth";
import { getLogs, getLogDateBounds, type LogFilter } from "@/actions/logs";
import { LogsClient } from "./logs-client";

export default async function LogsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; from?: string; to?: string }>;
}) {
  const { userRole } = await getAuth();
  if (userRole !== "admin") redirect("/");

  const { filter: rawFilter, from: rawFrom, to: rawTo } = await searchParams;
  const filter = (rawFilter ?? "all") as LogFilter;
  const today = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Manila" }).slice(0, 10);

  const bounds = await getLogDateBounds();

  // No logs exist at all — show empty state
  if (!bounds) {
    return (
      <LogsClient
        initialLogs={[]}
        activeFilter={filter}
        activeFrom={today}
        activeTo={today}
        today={today}
        earliestDate={today}
        noLogsEver
      />
    );
  }

  // When no range params, default to the most recent log date (single-day view)
  const activeFrom = rawFrom ?? bounds.latest;
  const activeTo = rawTo ?? bounds.latest;

  const { logs, error } = await getLogs(filter, activeFrom, activeTo);

  return (
    <LogsClient
      initialLogs={logs}
      activeFilter={filter}
      activeFrom={activeFrom}
      activeTo={activeTo}
      today={today}
      earliestDate={bounds.earliest}
      error={error}
    />
  );
}
