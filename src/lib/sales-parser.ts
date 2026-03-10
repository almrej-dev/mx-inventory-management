/**
 * Column mapping types and row normalization utility for sales file parsing.
 *
 * Used by the upload UI to map CSV/Excel columns to expected fields
 * and normalize raw parsed rows into a consistent format.
 */

export interface ColumnMapping {
  productColumn: string;
  quantityColumn: string;
  dateColumn?: string;
  priceColumn?: string;
}

export interface NormalizedSalesRow {
  rowNumber: number;
  productIdentifier: string;
  quantity: number;
  saleDate: string;
  unitPrice?: number;
  errors: string[];
}

/**
 * Normalize a single raw parsed row into a structured sales row.
 *
 * Validates required fields (product identifier and quantity) and
 * collects errors for invalid data instead of throwing.
 *
 * @param raw - A single row from the parsed file as key-value pairs
 * @param rowNum - 1-based row number for error reporting
 * @param mapping - Column name mapping from file headers to expected fields
 * @returns A normalized row with any validation errors collected
 */
export function normalizeRow(
  raw: Record<string, unknown>,
  rowNum: number,
  mapping: ColumnMapping
): NormalizedSalesRow {
  const errors: string[] = [];

  // Extract product identifier
  const rawProduct = raw[mapping.productColumn];
  const productIdentifier =
    typeof rawProduct === "string" ? rawProduct.trim() : "";
  if (!productIdentifier) {
    errors.push(`Missing product name in column "${mapping.productColumn}"`);
  }

  // Extract and validate quantity
  const rawQty = raw[mapping.quantityColumn];
  let quantity = 0;
  if (rawQty === undefined || rawQty === null || rawQty === "") {
    errors.push(`Missing quantity in column "${mapping.quantityColumn}"`);
  } else {
    const parsed = Number(rawQty);
    if (isNaN(parsed) || !Number.isInteger(parsed) || parsed <= 0) {
      errors.push(
        `Invalid quantity "${rawQty}" — must be a positive integer`
      );
    } else {
      quantity = parsed;
    }
  }

  // Extract optional sale date
  let saleDate = "";
  if (mapping.dateColumn) {
    const rawDate = raw[mapping.dateColumn];
    if (typeof rawDate === "string" && rawDate.trim()) {
      saleDate = rawDate.trim();
    }
  }

  // Extract optional unit price
  let unitPrice: number | undefined;
  if (mapping.priceColumn) {
    const rawPrice = raw[mapping.priceColumn];
    if (rawPrice !== undefined && rawPrice !== null && rawPrice !== "") {
      const parsed = Number(rawPrice);
      if (isNaN(parsed) || parsed < 0) {
        errors.push(
          `Invalid price "${rawPrice}" — must be a non-negative number`
        );
      } else {
        unitPrice = parsed;
      }
    }
  }

  return {
    rowNumber: rowNum,
    productIdentifier,
    quantity,
    saleDate,
    unitPrice,
    errors,
  };
}

/**
 * Fuzzy-match column headers to suggest a column mapping.
 *
 * Checks common patterns for product name, quantity, date, and price columns.
 * Returns a partial mapping — the caller should prompt the user to confirm
 * or complete any unmatched columns.
 *
 * @param headers - Array of column header strings from the parsed file
 * @returns A partial column mapping with matched columns
 */
export function suggestMapping(headers: string[]): Partial<ColumnMapping> {
  const mapping: Partial<ColumnMapping> = {};

  const productPatterns = [
    "product",
    "item",
    "name",
    "product_name",
    "item_name",
    "description",
    "producto",
  ];
  const quantityPatterns = [
    "qty",
    "quantity",
    "count",
    "units",
    "sold",
    "cantidad",
  ];
  const datePatterns = [
    "date",
    "sale_date",
    "sold_date",
    "transaction_date",
    "fecha",
  ];
  const pricePatterns = [
    "price",
    "amount",
    "unit_price",
    "precio",
    "cost",
  ];

  for (const header of headers) {
    const lower = header.toLowerCase().trim();

    if (!mapping.productColumn && productPatterns.some((p) => lower.includes(p))) {
      mapping.productColumn = header;
    }
    if (!mapping.quantityColumn && quantityPatterns.some((p) => lower.includes(p))) {
      mapping.quantityColumn = header;
    }
    if (!mapping.dateColumn && datePatterns.some((p) => lower.includes(p))) {
      mapping.dateColumn = header;
    }
    if (!mapping.priceColumn && pricePatterns.some((p) => lower.includes(p))) {
      mapping.priceColumn = header;
    }
  }

  return mapping;
}
