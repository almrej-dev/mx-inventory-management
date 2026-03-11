"use server";

import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type LogFilter = "all" | "items" | "products" | "stocks";

export type LogEntry = {
  id: string; // "audit-{n}" | "tx-{n}" — prefixed to avoid collisions
  entityType: "ITEM" | "PRODUCT" | "STOCK"; // STOCK only appears for InventoryTransaction (tx-*) entries
  entityName: string;
  entitySku: string;
  action: string; // CREATE | UPDATE | DELETE | RECEIVE | WASTE | ADJUSTMENT | SALE_DEDUCTION
  userName: string; // resolved from profiles; falls back to uuid.slice(0, 8)
  createdAt: Date;
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

/**
 * Returns the UTC date string ("YYYY-MM-DD") of the most recent log entry
 * across both AuditLog and InventoryTransaction, or null if no logs exist.
 */
export async function getLatestLogDate(): Promise<string | null> {
  try {
    await requireRole("admin");
  } catch {
    return null;
  }

  try {
    const [latestAudit, latestTx] = await Promise.all([
      prisma.auditLog.findFirst({
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
      prisma.inventoryTransaction.findFirst({
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
    ]);

    const dates = [latestAudit?.createdAt, latestTx?.createdAt].filter(
      (d): d is Date => d != null
    );
    if (dates.length === 0) return null;

    const latest = new Date(Math.max(...dates.map((d) => d.getTime())));
    return latest.toISOString().slice(0, 10);
  } catch {
    return null;
  }
}

export async function getLogs(
  filter: LogFilter = "all",
  date: string = todayIso()
): Promise<{ logs: LogEntry[]; error?: string }> {
  try {
    await requireRole("admin");
  } catch {
    return { logs: [], error: "Unauthorized" };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { logs: [], error: "Invalid date" };
  }

  try {
    const start = new Date(`${date}T00:00:00.000Z`);
    const end = new Date(start.getTime() + 86_400_000); // +1 UTC day

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
    }));

    const stockEntries: LogEntry[] = stockRows.map((row) => ({
      id: `tx-${row.id}`,
      entityType: "STOCK",
      entityName: row.item.name,
      entitySku: row.item.sku,
      action: row.type,
      userName: resolveName(row.createdBy),
      createdAt: row.createdAt,
    }));

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
