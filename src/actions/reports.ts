"use server";

import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay } from "date-fns";
import type { Prisma } from "@prisma/client";

/**
 * Return shape for each sales report line, used by the client component.
 */
export type SalesReportLine = {
  id: number;
  productName: string;
  quantity: number;
  unitPriceCentavos: number | null;
  item: {
    name: string;
    sku: string;
    type: string;
    category: string | null;
  };
  upload: {
    saleDate: Date;
    source: string;
  };
};

/**
 * Get filter options for the reports page.
 * Returns finished products and unique categories.
 */
export async function getReportFilterOptions() {
  await requireRole("viewer");

  const products = await prisma.item.findMany({
    where: { type: "FINISHED" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const categoryResults = await prisma.item.findMany({
    where: { category: { not: null } },
    select: { category: true },
    distinct: ["category"],
    orderBy: { category: "asc" },
  });

  const categories = categoryResults
    .map((r) => r.category)
    .filter((c): c is string => c !== null);

  return { products, categories };
}

/**
 * Get filtered sales report data.
 * Supports date range, product, and category filters.
 * Uses endOfDay() for upper date bound to avoid off-by-one.
 */
export async function getSalesReport(filters: {
  from?: string;
  to?: string;
  productId?: number;
  category?: string;
}) {
  await requireRole("viewer");

  // Build dynamic where clause
  const where: Prisma.SalesLineWhereInput = {};

  // Date range filter on the related SalesUpload.saleDate
  if (filters.from || filters.to) {
    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (filters.from) dateFilter.gte = startOfDay(new Date(filters.from));
    if (filters.to) dateFilter.lte = endOfDay(new Date(filters.to));
    where.upload = { saleDate: dateFilter };
  }

  // Product filter
  if (filters.productId) {
    where.itemId = filters.productId;
  }

  // Category filter via related Item
  if (filters.category) {
    where.item = { category: filters.category };
  }

  const lines = await prisma.salesLine.findMany({
    where,
    include: {
      item: { select: { name: true, sku: true, type: true, category: true } },
      upload: { select: { saleDate: true, source: true } },
    },
    orderBy: { upload: { saleDate: "desc" } },
  });

  return { lines };
}
