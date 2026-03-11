"use server";

import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatPesos } from "@/lib/utils";

export type LogFilter = "all" | "items" | "products" | "stocks";

export type LogEntry = {
  id: string; // "audit-{n}" | "tx-{n}" — prefixed to avoid collisions
  entityType: "ITEM" | "PRODUCT" | "STOCK"; // STOCK only appears for InventoryTransaction (tx-*) entries
  entityName: string;
  entitySku: string;
  action: string; // CREATE | UPDATE | DELETE | RECEIVE | WASTE | ADJUSTMENT | SALE_DEDUCTION
  userName: string; // resolved from profiles; falls back to uuid.slice(0, 8)
  createdAt: Date;
  changes?: Record<string, unknown>; // field snapshot captured at write time
};

/** Returns the current date in Philippine Time (UTC+8) as "YYYY-MM-DD". */
function todayIso(): string {
  return toPhtDate(new Date());
}

/** Converts a UTC Date to its "YYYY-MM-DD" representation in Philippine Time (UTC+8). */
function toPhtDate(d: Date): string {
  return d.toLocaleString("sv-SE", { timeZone: "Asia/Manila" }).slice(0, 10);
}

/**
 * Returns the PHT date strings of the earliest and most recent log entries
 * across both AuditLog and InventoryTransaction, or null if no logs exist.
 */
export async function getLogDateBounds(): Promise<{
  earliest: string;
  latest: string;
} | null> {
  try {
    await requireRole("admin");
  } catch {
    return null;
  }

  try {
    const [earliestAudit, latestAudit, earliestTx, latestTx] =
      await Promise.all([
        prisma.auditLog.findFirst({
          orderBy: { createdAt: "asc" },
          select: { createdAt: true },
        }),
        prisma.auditLog.findFirst({
          orderBy: { createdAt: "desc" },
          select: { createdAt: true },
        }),
        prisma.inventoryTransaction.findFirst({
          orderBy: { createdAt: "asc" },
          select: { createdAt: true },
        }),
        prisma.inventoryTransaction.findFirst({
          orderBy: { createdAt: "desc" },
          select: { createdAt: true },
        }),
      ]);

    const allDates = [
      earliestAudit?.createdAt,
      latestAudit?.createdAt,
      earliestTx?.createdAt,
      latestTx?.createdAt,
    ].filter((d): d is Date => d != null);

    if (allDates.length === 0) return null;

    const ms = allDates.map((d) => d.getTime());
    return {
      earliest: toPhtDate(new Date(Math.min(...ms))),
      latest: toPhtDate(new Date(Math.max(...ms))),
    };
  } catch {
    return null;
  }
}

export async function getLogs(
  filter: LogFilter = "all",
  from: string = todayIso(),
  to: string = todayIso()
): Promise<{ logs: LogEntry[]; error?: string }> {
  try {
    await requireRole("admin");
  } catch {
    return { logs: [], error: "Unauthorized" };
  }

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(from) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(to)
  ) {
    return { logs: [], error: "Invalid date" };
  }
  if (from > to) {
    return { logs: [], error: "Start date must not be after end date" };
  }

  try {
    // Interpret from/to as PHT (UTC+8) days: midnight PHT = 16:00 UTC previous day
    const start = new Date(`${from}T00:00:00.000+08:00`);
    // end is the start of the PHT day AFTER `to`, making `to` inclusive
    const end = new Date(new Date(`${to}T00:00:00.000+08:00`).getTime() + 86_400_000);

    const dateWhere = { createdAt: { gte: start, lt: end } };

    const includeAudit =
      filter === "all" || filter === "items" || filter === "products";
    const includeStocks = filter === "all" || filter === "stocks";

    const auditQuery = includeAudit
      ? prisma.auditLog.findMany({
          where: {
            ...dateWhere,
            ...(filter === "items" ? { entityType: "ITEM" as const } : {}),
            ...(filter === "products"
              ? { entityType: "PRODUCT" as const }
              : {}),
          },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]);

    const stockQuery = includeStocks
      ? prisma.inventoryTransaction.findMany({
          where: dateWhere,
          include: { item: { select: { name: true, sku: true } } },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]);

    const [auditRows, stockRows] = await Promise.all([auditQuery, stockQuery]);

    // Bulk-resolve user names
    const userIds = [
      ...new Set([
        ...auditRows.map((r) => r.createdBy),
        ...stockRows.map((r) => r.createdBy),
      ]),
    ];

    const profiles =
      userIds.length > 0
        ? await prisma.profile.findMany({
            where: { id: { in: userIds } },
            select: { id: true, fullName: true },
          })
        : [];

    const profileMap = new Map(profiles.map((p) => [p.id, p.fullName]));
    const resolveName = (uuid: string) =>
      profileMap.get(uuid) ?? uuid.slice(0, 8);

    const auditEntries: LogEntry[] = auditRows.map((row) => ({
      id: `audit-${row.id}`,
      entityType: row.entityType as "ITEM" | "PRODUCT",
      entityName: row.entityName,
      entitySku: row.entitySku,
      action: row.action,
      userName: resolveName(row.createdBy),
      createdAt: row.createdAt,
      changes: row.changes as Record<string, unknown> | undefined,
    }));

    const stockEntries: LogEntry[] = stockRows.map((row) => {
      const changes: Record<string, unknown> = {
        "Quantity": row.quantity,
      };
      if (row.costCentavos != null) changes["Cost"] = formatPesos(row.costCentavos);
      if (row.notes) changes["Notes"] = row.notes;
      if (row.referenceId) changes["Reference"] = row.referenceId;
      return {
        id: `tx-${row.id}`,
        entityType: "STOCK",
        entityName: row.item.name,
        entitySku: row.item.sku,
        action: row.type,
        userName: resolveName(row.createdBy),
        createdAt: row.createdAt,
        changes,
      };
    });

    const logs = [...auditEntries, ...stockEntries].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );

    return { logs };
  } catch (err) {
    return {
      logs: [],
      error: err instanceof Error ? err.message : "Failed to load logs",
    };
  }
}
