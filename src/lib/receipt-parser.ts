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

const DATE_PATTERNS = [
  /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,
  /(\d{4})-(\d{2})-(\d{2})/,
  /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),?\s+(\d{4})/i,
];

const RECEIPT_NUMBER_PATTERNS = [
  /(?:receipt|rcpt|inv|invoice|trans(?:action)?|ref|or|si|dr)[#:\s-]*([A-Z0-9][\w-]{2,})/i,
  /#\s*([A-Z0-9][\w-]{2,})/i,
];

const TOTAL_KEYWORDS = [
  /\b(?:grand\s*)?total\b/i,
  /\btotal\s*(?:due|amount|sale)?\b/i,
];

const SUBTOTAL_KEYWORDS = [/\bsub\s*total\b/i, /\bnet\s*(?:amount|sale)?\b/i];

const TAX_KEYWORDS = [/\b(?:vat|tax|vatable)\b/i];

const PAYMENT_KEYWORDS = [
  /\b(cash|card|credit|debit|gcash|maya|paymaya|check|cheque)\b/i,
];

function extractNumber(text: string): number {
  const match = text.match(/([\d,]+\.?\d*)/);
  if (!match) return 0;
  return parseFloat(match[1].replace(/,/g, ""));
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

function parseLineItems(lines: string[]): ParsedReceiptLine[] {
  const items: ParsedReceiptLine[] = [];

  for (const line of lines) {
    if (
      matchesKeyword(line, TOTAL_KEYWORDS) ||
      matchesKeyword(line, SUBTOTAL_KEYWORDS) ||
      matchesKeyword(line, TAX_KEYWORDS) ||
      matchesKeyword(line, PAYMENT_KEYWORDS)
    ) {
      continue;
    }

    const lineItemMatch = line.match(
      /^(.+?)\s{2,}(\d+)\s*[xX×]\s*([\d,]+\.?\d*)\s+([\d,]+\.?\d*)$/
    );
    if (lineItemMatch) {
      const qty = parseInt(lineItemMatch[2], 10);
      const unitPrice = parseFloat(lineItemMatch[3].replace(/,/g, ""));
      const lineTotal = parseFloat(lineItemMatch[4].replace(/,/g, ""));
      items.push({
        productName: lineItemMatch[1].trim(),
        quantity: qty,
        unitPrice,
        lineTotal,
      });
      continue;
    }

    const qtyPriceMatch = line.match(
      /^(.+?)\s{2,}(\d+)\s+([\d,]+\.?\d*)$/
    );
    if (qtyPriceMatch) {
      const qty = parseInt(qtyPriceMatch[2], 10);
      const price = parseFloat(qtyPriceMatch[3].replace(/,/g, ""));
      items.push({
        productName: qtyPriceMatch[1].trim(),
        quantity: qty,
        unitPrice: price / qty,
        lineTotal: price,
      });
      continue;
    }

    const singlePriceMatch = line.match(/^(.+?)\s{2,}([\d,]+\.?\d*)$/);
    if (singlePriceMatch && singlePriceMatch[1].trim().length > 1) {
      const price = parseFloat(singlePriceMatch[2].replace(/,/g, ""));
      if (price > 0) {
        items.push({
          productName: singlePriceMatch[1].trim(),
          quantity: 1,
          unitPrice: price,
          lineTotal: price,
        });
      }
    }
  }

  return items;
}

export function parseReceiptText(rawText: string): ParsedReceipt {
  const allLines = rawText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let storeName = "";
  for (const line of allLines) {
    if (DATE_PATTERNS.some((p) => p.test(line))) break;
    if (/\d{3,}/.test(line)) break;
    if (line.length > 2) {
      storeName = storeName ? `${storeName} ${line}` : line;
      if (storeName.length > 60) break;
    }
  }

  const fullText = rawText;
  const receiptDate = extractDate(fullText);
  const receiptNumber = extractReceiptNumber(fullText);
  const paymentMethod = extractPaymentMethod(fullText);

  let subtotal = 0;
  let tax = 0;
  let total = 0;

  for (const line of allLines) {
    if (matchesKeyword(line, SUBTOTAL_KEYWORDS)) {
      subtotal = extractNumber(line);
    } else if (matchesKeyword(line, TAX_KEYWORDS) && !matchesKeyword(line, SUBTOTAL_KEYWORDS)) {
      tax = extractNumber(line);
    } else if (matchesKeyword(line, TOTAL_KEYWORDS) && !matchesKeyword(line, SUBTOTAL_KEYWORDS)) {
      total = extractNumber(line);
    }
  }

  const lines = parseLineItems(allLines);

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
