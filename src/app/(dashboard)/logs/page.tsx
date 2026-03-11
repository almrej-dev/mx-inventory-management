import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth";
import { getLogs, getLatestLogDate, type LogFilter } from "@/actions/logs";
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
  const today = new Date().toISOString().slice(0, 10);

  // When no range params, default to the most recent log date.
  // If no logs exist at all, show the empty-system state.
  let activeFrom: string;
  let activeTo: string;
  let noLogsEver = false;

  if (rawFrom || rawTo) {
    activeFrom = rawFrom ?? today;
    activeTo = rawTo ?? today;
  } else {
    const latestDate = await getLatestLogDate();
    if (latestDate === null) {
      noLogsEver = true;
      activeFrom = today;
      activeTo = today;
    } else {
      activeFrom = latestDate;
      activeTo = latestDate;
    }
  }

  const { logs, error } = noLogsEver
    ? { logs: [], error: undefined }
    : await getLogs(filter, activeFrom, activeTo);

  return (
    <LogsClient
      initialLogs={logs}
      activeFilter={filter}
      activeFrom={activeFrom}
      activeTo={activeTo}
      today={today}
      noLogsEver={noLogsEver}
      error={error}
    />
  );
}
