import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth";
import { getLogs, getLatestLogDate, type LogFilter } from "@/actions/logs";
import { LogsClient } from "./logs-client";

export default async function LogsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; date?: string }>;
}) {
  const { userRole } = await getAuth();
  if (userRole !== "admin") redirect("/");

  const { filter: rawFilter, date: rawDate } = await searchParams;
  const filter = (rawFilter ?? "all") as LogFilter;
  const today = new Date().toISOString().slice(0, 10);

  // When no date param, start on the most recent log date.
  // If no logs exist at all, show the empty-system state.
  let date: string;
  let noLogsEver = false;
  if (rawDate) {
    date = rawDate;
  } else {
    const latestDate = await getLatestLogDate();
    if (latestDate === null) {
      noLogsEver = true;
      date = today;
    } else {
      date = latestDate;
    }
  }

  const { logs, error } = noLogsEver
    ? { logs: [], error: undefined }
    : await getLogs(filter, date);

  return (
    <LogsClient
      initialLogs={logs}
      activeFilter={filter}
      activeDate={date}
      today={today}
      noLogsEver={noLogsEver}
      error={error}
    />
  );
}
