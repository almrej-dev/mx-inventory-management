import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth";
import { getLogs, type LogFilter } from "@/actions/logs";
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
  const date = rawDate ?? today;

  const { logs, error } = await getLogs(filter, date);

  return (
    <LogsClient
      initialLogs={logs}
      activeFilter={filter}
      activeDate={date}
      today={today}
      error={error}
    />
  );
}
