export interface ParsedReceipt {
  storeName: string;
  receiptNumber: string;
  receiptDate: string;
  lines: ParsedReceiptLine[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
}

export interface ParsedReceiptLine {
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

// ---------------------------------------------------------------------------
// Date extraction
// ---------------------------------------------------------------------------

const DATE_PATTERNS = [
  // "Mar 18 2026 (Wed)" — month name with optional day-of-week
  /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),?\s+(\d{4})/i,
  // ISO 2024-03-18
  /(\d{4})-(\d{2})-(\d{2})/,
  // DD/MM/YYYY or MM-DD-YYYY
  /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,
];

// ---------------------------------------------------------------------------
// Receipt number patterns
// ---------------------------------------------------------------------------

const RECEIPT_NUMBER_PATTERNS = [
  // SI#101141, OR#123, INV-456, etc.
  /(?:receipt|rcpt|inv|invoice|trans(?:action)?|ref|or|si|dr)[#:\s-]*([A-Z0-9][\w-]{2,})/i,
  // Standalone # reference
  /#\s*([A-Z0-9][\w-]{2,})/i,
];

// ---------------------------------------------------------------------------
// Keyword matchers for totals, tax, and payment
// ---------------------------------------------------------------------------

const TOTAL_KEYWORDS = [
  /\b(?:grand\s*)?total\b/i,
  /\btotal\s*(?:due|amount|sale)?\b/i,
  /\bamount\s*payable\b/i,
];

const SUBTOTAL_KEYWORDS = [
  /\bsub\s*total\b/i,
  /\bnet\s*(?:amount|sale)?\b/i,
];

const TAX_KEYWORDS = [
  /\bvat\s*\(\s*12\s*%?\s*\)/i, // "VAT (12%)" — most specific, match first
  /\bvat\s+(?:amount|due)\b/i,
  /\btax\b/i,
];

// Lines that mention VAT but are NOT the VAT amount line
const TAX_EXEMPT_KEYWORDS = [
  /\bvat\s*(?:sales|exempt|zero[- ]?rated)\b/i,
  /\bvatable\s*sales\b/i,
  /\bnon[- ]?taxable\b/i,
];

const PAYMENT_KEYWORDS = [
  /\b(cash|credit|debit|gcash|maya|paymaya|check|cheque|visa|mastercard|amex)\b/i,
];

// Lines to skip entirely — metadata, headers, addresses, etc.
const SKIP_LINE_PATTERNS = [
  /^\s*[-=_*.]{3,}\s*$/, // separator lines
  /\b(?:vat\s*reg|tin|permit|ptu|pos\s*sn|min)\b/i,
  /\b(?:sold\s*to|address|signature|business\s*style)\b/i,
  /\b(?:cashier|customer|card\s*(?:no|name)|expiry|approval)\b/i,
  /\b(?:door|bldg|street|city|acc:)\b/i,
  /\b(?:date\s*issued|valid\s*until)\b/i,
  /\btransaction\s*#?\b/i,
  /\bs\.?\s*charge\b/i,
];

// ---------------------------------------------------------------------------
// OCR text normalization
// ---------------------------------------------------------------------------

/**
 * Fix common OCR misreads in receipt text.
 * Applied to the full text before structured parsing.
 */
function normalizeOcrText(raw: string): string {
  let text = raw;

  // Normalize whitespace: tabs → spaces, collapse multiple spaces (but preserve \n)
  text = text.replace(/\t/g, "  ");
  text = text.replace(/[^\S\n]+/g, (m) => (m.length > 3 ? "  " : m));

  // Fix common OCR character substitutions in number contexts:
  // "580. 00" → "580.00" (spurious space around decimal)
  text = text.replace(/(\d)\s*\.\s*(\d)/g, "$1.$2");

  // "O" or "o" surrounded by digits → "0"
  text = text.replace(/(\d)[Oo](\d)/g, "$10$2");
  text = text.replace(/(\d)[Oo]$/gm, "$10");
  text = text.replace(/^[Oo](\d)/gm, "0$1");

  // "l" or "I" between digits → "1"
  text = text.replace(/(\d)[lI](\d)/g, "$11$2");

  // "S" between digits → "5"
  text = text.replace(/(\d)S(\d)/g, "$15$2");

  // "B" between digits → "8"
  text = text.replace(/(\d)B(\d)/g, "$18$2");

  // Strip trailing "V" after prices — VAT indicator on POS receipts
  // e.g. "500.00V" → "500.00"
  text = text.replace(/(\d+\.\d{2})\s*[Vv]\b/g, "$1");

  return text;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractNumber(text: string): number {
  // Match the rightmost number on the line (receipt totals are right-aligned)
  const matches = [...text.matchAll(/([\d,]+\.?\d*)/g)];
  if (matches.length === 0) return 0;
  const last = matches[matches.length - 1][1];
  return parseFloat(last.replace(/,/g, ""));
}

function extractDate(text: string): string {
  for (const pattern of DATE_PATTERNS) {
    const match = text.match(pattern);
    if (match) return match[0];
  }
  return "";
}

function extractReceiptNumber(text: string): string {
  for (const pattern of RECEIPT_NUMBER_PATTERNS) {
    const match = text.match(pattern);
    if (match) return match[1];
  }
  return "";
}

function extractPaymentMethod(text: string): string {
  for (const pattern of PAYMENT_KEYWORDS) {
    const match = text.match(pattern);
    if (match) return match[1];
  }
  return "";
}

function matchesKeyword(line: string, keywords: RegExp[]): boolean {
  return keywords.some((kw) => kw.test(line));
}

function shouldSkipLine(line: string): boolean {
  return SKIP_LINE_PATTERNS.some((p) => p.test(line));
}

// ---------------------------------------------------------------------------
// Line item parsing
// ---------------------------------------------------------------------------

/**
 * Parse line items from receipt text.
 *
 * Handles multiple formats:
 *   "Product Name    500.00"              → qty 1, unit 500, total 500
 *   "Product Name    2 x 250.00  500.00"  → qty 2, unit 250, total 500
 *   "  2 PCS x @250.00"                   → continuation line (qty detail)
 *   "Product Name    2  500.00"           → qty 2, total 500
 */
function parseLineItems(lines: string[]): ParsedReceiptLine[] {
  const items: ParsedReceiptLine[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip keyword lines
    if (
      matchesKeyword(line, TOTAL_KEYWORDS) ||
      matchesKeyword(line, SUBTOTAL_KEYWORDS) ||
      matchesKeyword(line, TAX_KEYWORDS) ||
      matchesKeyword(line, TAX_EXEMPT_KEYWORDS) ||
      matchesKeyword(line, PAYMENT_KEYWORDS) ||
      shouldSkipLine(line)
    ) {
      continue;
    }

    // Skip continuation/quantity-detail lines — these are absorbed below
    if (/^\s*\d+\s*(?:PCS|pcs|pc|PC)\s*[xX×@]/i.test(line)) {
      continue;
    }

    // Pattern 1: "Name   QTY x PRICE   TOTAL"
    const fullMatch = line.match(
      /^(.+?)\s{2,}(\d+)\s*[xX×]\s*@?([\d,]+\.?\d*)\s+([\d,]+\.?\d*)$/
    );
    if (fullMatch) {
      items.push({
        productName: fullMatch[1].trim(),
        quantity: parseInt(fullMatch[2], 10),
        unitPrice: parseFloat(fullMatch[3].replace(/,/g, "")),
        lineTotal: parseFloat(fullMatch[4].replace(/,/g, "")),
      });
      continue;
    }

    // Pattern 2: "Name   TOTAL" with optional next-line "QTY PCS x @PRICE"
    const singlePriceMatch = line.match(/^(.+?)\s{2,}([\d,]+\.?\d*)$/);
    if (singlePriceMatch && singlePriceMatch[1].trim().length > 1) {
      const productName = singlePriceMatch[1].trim();
      const lineTotal = parseFloat(singlePriceMatch[2].replace(/,/g, ""));

      if (lineTotal <= 0) continue;

      // Check next line for quantity detail: "2 PCS x @250.00"
      const nextLine = i + 1 < lines.length ? lines[i + 1] : "";
      const qtyDetailMatch = nextLine.match(
        /^\s*(\d+)\s*(?:PCS|pcs|pc|PC)?\s*[xX×]\s*@?([\d,]+\.?\d*)/i
      );

      if (qtyDetailMatch) {
        const qty = parseInt(qtyDetailMatch[1], 10);
        const unitPrice = parseFloat(qtyDetailMatch[2].replace(/,/g, ""));
        items.push({ productName, quantity: qty, unitPrice, lineTotal });
        i++; // skip the detail line
      } else {
        items.push({
          productName,
          quantity: 1,
          unitPrice: lineTotal,
          lineTotal,
        });
      }
      continue;
    }

    // Pattern 3: "Name   QTY   TOTAL"
    const qtyTotalMatch = line.match(
      /^(.+?)\s{2,}(\d+)\s+([\d,]+\.?\d*)$/
    );
    if (qtyTotalMatch) {
      const qty = parseInt(qtyTotalMatch[2], 10);
      const total = parseFloat(qtyTotalMatch[3].replace(/,/g, ""));
      items.push({
        productName: qtyTotalMatch[1].trim(),
        quantity: qty,
        unitPrice: total / qty,
        lineTotal: total,
      });
    }
  }

  return items;
}

// ---------------------------------------------------------------------------
// Main parser
// ---------------------------------------------------------------------------

export function parseReceiptText(rawText: string): ParsedReceipt {
  const normalized = normalizeOcrText(rawText);

  const allLines = normalized
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // --- Store name: first non-numeric lines before date or long numbers ---
  let storeName = "";
  for (const line of allLines) {
    if (DATE_PATTERNS.some((p) => p.test(line))) break;
    if (/\d{3,}/.test(line)) break;
    if (line.length > 2) {
      storeName = storeName ? `${storeName} ${line}` : line;
      if (storeName.length > 60) break;
    }
  }

  // --- Global extractions ---
  const fullText = normalized;
  const receiptDate = extractDate(fullText);
  const receiptNumber = extractReceiptNumber(fullText);
  const paymentMethod = extractPaymentMethod(fullText);

  // --- Totals: scan lines for keyword matches ---
  let subtotal = 0;
  let tax = 0;
  let total = 0;

  for (const line of allLines) {
    // Skip VAT breakdown lines (VAT Sales, VAT Exempt, etc.)
    if (matchesKeyword(line, TAX_EXEMPT_KEYWORDS)) continue;

    if (matchesKeyword(line, SUBTOTAL_KEYWORDS)) {
      subtotal = extractNumber(line);
    } else if (matchesKeyword(line, TAX_KEYWORDS)) {
      const val = extractNumber(line);
      // Only take the VAT amount, not the 12% rate itself
      if (val > 0) tax = val;
    } else if (matchesKeyword(line, TOTAL_KEYWORDS)) {
      const val = extractNumber(line);
      // Take the largest total value found (TOTAL may appear multiple times)
      if (val > total) total = val;
    }
  }

  // --- Line items ---
  const lines = parseLineItems(allLines);

  // --- Validation: if total is 0 but lines exist, sum them ---
  if (total === 0 && lines.length > 0) {
    total = lines.reduce((sum, l) => sum + l.lineTotal, 0);
  }

  return {
    storeName: storeName.trim(),
    receiptNumber,
    receiptDate,
    lines,
    subtotal,
    tax,
    total,
    paymentMethod,
  };
}
