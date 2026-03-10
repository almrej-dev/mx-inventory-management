# Phase 3: Sales and Auto-Deduction - Research

**Researched:** 2026-03-10
**Domain:** File upload/parsing (CSV + Excel), BOM-based inventory deduction, sales tracking
**Confidence:** HIGH

## Summary

Phase 3 adds sales recording (CSV/Excel upload and manual entry) and automatic inventory deduction via recipe BOM explosion. The core challenge is orchestrating the flow: parse file -> validate rows -> preview with error highlighting -> confirm -> explode each sold item through its BOM -> atomically deduct all raw materials and packaging from inventory via the existing ledger pattern.

The project already has all foundational pieces in place: the `explodeBom()` function (src/lib/bom.ts) recursively resolves recipes to leaf-level raw materials and packaging, the atomic ledger pattern (`prisma.$transaction` wrapping ledger insert + stock_qty decrement) is established in stock receiving, and the `SALE_DEDUCTION` transaction type already exists in the Prisma enum. New models are needed for `SalesUpload` (file metadata/status tracking) and `SalesLine` (individual product lines within an upload or manual entry), plus new Prisma schema additions, RLS migration, and two new page groups (upload/manual entry and sales history).

The technical risk is moderate: CSV parsing is well-solved by PapaParse, Excel parsing by SheetJS (xlsx). The deduction logic is the critical path -- it must explode each sold finished product through potentially multiple BOM levels, aggregate all raw material quantities across all sold products, and execute a single atomic transaction that creates ledger entries and decrements stock for every affected item. Negative stock must be allowed (the user needs to see variance, not be blocked from recording real sales), but warned about visually.

**Primary recommendation:** Parse files client-side for instant preview (PapaParse for CSV, SheetJS xlsx for Excel), validate against known finished-product SKUs, then send parsed+validated rows to a server action that performs BOM explosion and atomic multi-item deduction in a single Prisma interactive transaction.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SALE-01 | User can upload sales data via CSV or Excel file with validation and preview | PapaParse (CSV) + SheetJS xlsx (Excel) for client-side parsing; preview table with row-level validation errors; file stored as SalesUpload record |
| SALE-02 | User can manually enter sales when no export is available | Manual sales entry form with product selector + quantity; reuses same processSalesLines server action as upload flow |
| SALE-03 | System auto-deducts raw materials from inventory based on recipe breakdowns | explodeBom() called per sold product; aggregated deductions across all BOM lines; atomic Prisma interactive transaction creating SALE_DEDUCTION ledger entries + stock_qty decrements |
| SALE-04 | User can view sales history and past uploaded files | SalesUpload list page (file name, date, status, line count); SalesLine detail view per upload; transaction history already supports SALE_DEDUCTION type with red badge |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| papaparse | ^5.5 | CSV parsing (client-side) | Fastest CSV parser, no dependencies, auto-detects delimiters, handles malformed input gracefully |
| xlsx (SheetJS CE) | 0.20.3 | Excel (.xlsx/.xls) parsing (client-side) | De facto standard for spreadsheet parsing in JS ecosystem, 36k+ GitHub stars |
| @types/papaparse | ^5.3 | TypeScript definitions for PapaParse | Required for TypeScript project |

### Supporting (already in project)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zod (v4) | ^4.3.6 | Row-level validation of parsed sales data | Validate each parsed row has required fields (product identifier, quantity) |
| react-hook-form | ^7.71 | Manual sales entry form | Same form pattern as receiving form |
| @tanstack/react-table | ^8.21 | Sales history table display | Already used for items table, reuse for sales history |
| date-fns | ^4.1.0 | Date formatting in sales history | Already in project, use for upload dates and sale dates |
| lucide-react | ^0.577 | Icons for upload, file, entry UI | Already in project |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| PapaParse (client-side) | csv-parse (server-side) | csv-parse is Node-only; client-side parsing enables instant preview without server round-trip |
| SheetJS xlsx | exceljs | exceljs is heavier (streaming focus, write-heavy); xlsx is lighter for read-only parsing |
| Client-side parsing | Server-side parsing via FormData | Server-side adds latency before preview; client-side gives instant feedback |

**Installation:**
```bash
pnpm add papaparse
pnpm add -D @types/papaparse
pnpm add https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz
```

**IMPORTANT:** SheetJS xlsx must be installed from CDN URL, not from npm registry. The npm registry version (0.18.5) is outdated and unmaintained. The CDN version 0.20.3 is the current community edition.

## Architecture Patterns

### Recommended Project Structure
```
src/
  schemas/
    sales.ts                     # Zod schemas for sales upload and manual entry
  actions/
    sales.ts                     # Server actions: processSalesLines, getSalesHistory, getSalesUploads
  lib/
    bom.ts                       # (existing) explodeBom -- reused for deduction
    sales-parser.ts              # Normalize CSV/Excel rows into common SalesRow format
  components/
    sales/
      upload-form.tsx            # File input + drag-and-drop, triggers parsing
      upload-preview.tsx         # Table showing parsed rows with validation status
      manual-entry-form.tsx      # Form for individual manual sales entries
      sales-history-table.tsx    # Sales history list with upload info
      sales-columns.tsx          # TanStack Table column definitions
  app/(dashboard)/
    sales/
      upload/
        page.tsx                 # Upload flow page (file select -> preview -> confirm)
      manual/
        page.tsx                 # Manual sales entry page
      history/
        page.tsx                 # Sales history listing
      [uploadId]/
        page.tsx                 # Detail view for a specific upload's sales lines
```

### Pattern 1: Client-Side Parse + Server-Side Process (Two-Phase Flow)
**What:** Files are parsed entirely in the browser for instant preview. Only validated, structured data is sent to the server for processing.
**When to use:** When users need to preview and correct data before committing irreversible inventory changes.
**Why:** Avoids server round-trips for parsing, enables instant error feedback, keeps file handling out of server actions (no file storage needed).

```typescript
// Phase 1: Client-side parsing (in upload-form.tsx)
import Papa from "papaparse";
import * as XLSX from "xlsx";

interface ParsedSalesRow {
  rowNumber: number;
  productName: string;    // from CSV/Excel
  productSku: string;     // from CSV/Excel (optional, used for matching)
  quantity: number;
  saleDate: string;
  unitPrice?: number;     // optional, for reference
  errors: string[];       // validation errors for this row
  matchedItemId?: number; // resolved after matching against items DB
}

function parseCSV(file: File): Promise<ParsedSalesRow[]> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (results) => {
        const rows = results.data.map((row, idx) => normalizeRow(row, idx + 1));
        resolve(rows);
      },
    });
  });
}

function parseExcel(file: File): Promise<ParsedSalesRow[]> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target!.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(sheet);
      const rows = jsonData.map((row, idx) => normalizeRow(row, idx + 1));
      resolve(rows);
    };
    reader.readAsArrayBuffer(file);
  });
}
```

```typescript
// Phase 2: Server-side processing (in actions/sales.ts)
// Only receives validated, structured data -- no file handling
export async function processSalesLines(data: {
  uploadId?: number;  // null for manual entry
  lines: Array<{ itemId: number; quantity: number; saleDate: string; unitPriceCentavos?: number }>;
}) {
  const { user } = await requireRole("staff");

  await prisma.$transaction(async (tx) => {
    // 1. Create SalesUpload record (if from file) or use existing
    // 2. Create SalesLine records for each line
    // 3. For each line, explode BOM and aggregate deductions
    // 4. Execute all stock decrements atomically
  });
}
```

### Pattern 2: Aggregated BOM Deduction
**What:** When processing multiple sales lines, aggregate all raw material deductions across all products before executing stock updates.
**When to use:** Always -- prevents N separate transactions for N sales lines.
**Why:** A single sale of 5 different products may share raw materials. Aggregating first means one decrement per raw material instead of multiple.

```typescript
// Aggregate deductions across all sold products
const deductionMap = new Map<number, { itemId: number; totalQtyMg: number; totalQtyPieces: number }>();

for (const line of salesLines) {
  const bom = await explodeBom(line.itemId);
  for (const bomLine of bom) {
    const existing = deductionMap.get(bomLine.itemId);
    if (existing) {
      existing.totalQtyMg += bomLine.quantityMg * line.quantity;
      existing.totalQtyPieces += bomLine.quantityPieces * line.quantity;
    } else {
      deductionMap.set(bomLine.itemId, {
        itemId: bomLine.itemId,
        totalQtyMg: bomLine.quantityMg * line.quantity,
        totalQtyPieces: bomLine.quantityPieces * line.quantity,
      });
    }
  }
}
```

### Pattern 3: Atomic Multi-Item Ledger Deduction
**What:** All stock deductions from a single sales batch happen in one Prisma interactive transaction.
**When to use:** When processing confirmed sales (either from upload or manual entry).
**Why:** Maintains ledger consistency -- either all deductions succeed or none do.

```typescript
// Inside prisma.$transaction(async (tx) => { ... })
for (const [itemId, deduction] of deductionMap) {
  const item = await tx.item.findUnique({ where: { id: itemId } });
  if (!item) continue;

  // Determine deduction quantity based on item type
  const deductQty = item.type === "PACKAGING"
    ? deduction.totalQtyPieces
    : deduction.totalQtyMg;

  // Create ledger entry
  await tx.inventoryTransaction.create({
    data: {
      itemId,
      type: "SALE_DEDUCTION",
      quantity: -deductQty,  // Negative for deductions
      referenceId: `SALE-${uploadId}-${Date.now()}`,
      notes: `Auto-deducted from sales batch ${uploadId}`,
      createdBy: userId,
    },
  });

  // Decrement stock
  await tx.item.update({
    where: { id: itemId },
    data: { stockQty: { decrement: deductQty } },
  });
}
```

### Anti-Patterns to Avoid
- **Processing sales line-by-line in separate transactions:** Each sale of a finished product touches multiple raw materials. Processing one line at a time means repeated BOM explosions and N transactions instead of 1.
- **Storing uploaded files on disk/blob storage:** For this use case, only the parsed data matters. Store metadata (filename, date, row count) in DB, not the actual file.
- **Blocking sales when stock would go negative:** Real sales happened -- the inventory system must record reality. Show warnings but allow negative stock. The variance is the signal, not an error.
- **Server-side file parsing in server actions:** Next.js server actions have payload size limits and adding file upload complexity (multipart, temp storage) is unnecessary when client-side parsing gives better UX.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSV parsing | Custom split/regex parser | PapaParse | Handles quoted fields, escaped delimiters, BOM marks, encoding detection, malformed rows |
| Excel parsing | Manual binary format reader | SheetJS xlsx | xlsx/xls/xlsb format complexity is enormous (Microsoft OOXML spec is thousands of pages) |
| Column name matching | Exact string match | Fuzzy/normalized matching helper | POS exports vary -- "Product Name" vs "product_name" vs "Item" vs "ProductName" |
| BOM explosion | Re-implement recursion | Existing `explodeBom()` from src/lib/bom.ts | Already handles circular refs, merging duplicates, multi-level recursion |
| Ledger consistency | Manual stock math | Prisma interactive transaction | Existing atomic pattern from stock receiving ensures consistency |

**Key insight:** The deceptive complexity in this phase is NOT in parsing (libraries handle it) but in the normalization layer -- mapping arbitrary POS export column names to the expected schema. Build a flexible column-mapping step in the upload preview.

## Common Pitfalls

### Pitfall 1: BOM Explosion Called Inside Transaction Blocks DB
**What goes wrong:** Calling `explodeBom()` (which makes multiple DB queries) inside a `prisma.$transaction` holds the transaction open while recursively querying recipe trees.
**Why it happens:** Seems logical to "do everything atomically" but BOM explosion is read-only.
**How to avoid:** Explode all BOMs BEFORE starting the transaction. Collect all deduction targets, then open one transaction for all writes only.
**Warning signs:** Slow sales processing, transaction timeouts for large batches.

### Pitfall 2: Quantity Unit Mismatch Between Sale and BOM
**What goes wrong:** Sales are in "units sold" (e.g., 5 cups of matcha latte). BOM quantities are per-single-unit (e.g., 30g matcha per cup). Forgetting to multiply BOM quantities by sale quantity.
**Why it happens:** `explodeBom()` returns quantities for ONE unit of the parent product.
**How to avoid:** Always multiply: `bomLine.quantityMg * saleLineQuantity`. The aggregation loop must scale BOM output by the number sold.
**Warning signs:** Stock levels barely decrease after large sales.

### Pitfall 3: POS Export Column Variations
**What goes wrong:** User uploads CSV from their POS and nothing matches because columns are named differently than expected.
**Why it happens:** Every POS system exports differently -- "Product", "Item Name", "Description", "SKU", etc.
**How to avoid:** Implement a column-mapping step in the preview: detect columns from CSV headers, let user map them to required fields (product name/SKU, quantity, date). Store a "mapping profile" concept so repeat uploads auto-map.
**Warning signs:** Every upload requires support to "fix the format."

### Pitfall 4: Products in CSV Without Recipes
**What goes wrong:** POS export contains product names that don't match any item in the system, or items without recipes (no BOM to explode).
**Why it happens:** POS may have more products than the inventory system tracks, or recipes haven't been entered yet.
**How to avoid:** During preview, highlight rows where product can't be matched or has no recipe. Allow user to skip those rows or enter them for tracking without deduction. Show clear counts: "X rows matched, Y rows unmatched, Z rows without recipes."
**Warning signs:** Silent data loss -- sales recorded but no deductions happen.

### Pitfall 5: Integer Overflow in Aggregated Milligram Quantities
**What goes wrong:** Selling 100 items that each use 500g of an ingredient = 100 * 500 * 1000 = 50,000,000 mg. Multiplied across many ingredients, numbers get large.
**Why it happens:** Milligram storage uses integers; large batches compound.
**How to avoid:** JavaScript number type handles up to 2^53 safely (9 quadrillion). Prisma Int is 32-bit (max ~2.1 billion mg = 2,100 kg). For single-location ice cream/tea shop, this is sufficient. But if ever doing very large aggregations, validate before write.
**Warning signs:** PostgreSQL integer overflow errors on stock update.

### Pitfall 6: SheetJS Import Path
**What goes wrong:** `import XLSX from 'xlsx'` fails or gets wrong version.
**Why it happens:** SheetJS moved off npm registry; npm version is 0.18.5 (outdated). CDN version uses different module structure.
**How to avoid:** Install from CDN URL (`pnpm add https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`). Import as `import * as XLSX from "xlsx"`.
**Warning signs:** Missing features, TypeScript type mismatches.

## Code Examples

### Client-Side CSV Parsing with PapaParse
```typescript
// Source: PapaParse official docs (papaparse.com/docs)
import Papa from "papaparse";

interface RawCSVRow {
  [key: string]: string | number | null;
}

export function parseCSVFile(file: File): Promise<{
  headers: string[];
  data: RawCSVRow[];
  errors: Papa.ParseError[];
}> {
  return new Promise((resolve) => {
    Papa.parse<RawCSVRow>(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (results) => {
        resolve({
          headers: results.meta.fields || [],
          data: results.data,
          errors: results.errors,
        });
      },
    });
  });
}
```

### Client-Side Excel Parsing with SheetJS
```typescript
// Source: SheetJS official docs (docs.sheetjs.com)
import * as XLSX from "xlsx";

export function parseExcelFile(file: File): Promise<{
  headers: string[];
  data: Record<string, unknown>[];
}> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target!.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet);
      const headers = jsonData.length > 0 ? Object.keys(jsonData[0]) : [];
      resolve({ headers, data: jsonData });
    };
    reader.readAsArrayBuffer(file);
  });
}
```

### Row Normalization (Column Mapping)
```typescript
// Normalize a raw parsed row into structured SalesRow using column mapping
interface ColumnMapping {
  productColumn: string;  // Which CSV column maps to product name/SKU
  quantityColumn: string; // Which CSV column maps to quantity
  dateColumn?: string;    // Which CSV column maps to sale date (optional)
  priceColumn?: string;   // Which CSV column maps to unit price (optional)
}

interface NormalizedSalesRow {
  rowNumber: number;
  productIdentifier: string;
  quantity: number;
  saleDate: string;
  unitPrice?: number;
  errors: string[];
}

function normalizeRow(
  raw: Record<string, unknown>,
  rowNum: number,
  mapping: ColumnMapping
): NormalizedSalesRow {
  const errors: string[] = [];

  const productIdentifier = String(raw[mapping.productColumn] ?? "").trim();
  if (!productIdentifier) errors.push("Missing product name/SKU");

  const rawQty = Number(raw[mapping.quantityColumn]);
  const quantity = isNaN(rawQty) || rawQty <= 0 ? 0 : Math.floor(rawQty);
  if (quantity <= 0) errors.push("Invalid or missing quantity");

  const saleDate = mapping.dateColumn
    ? String(raw[mapping.dateColumn] ?? "").trim()
    : new Date().toISOString().split("T")[0];

  const unitPrice = mapping.priceColumn
    ? Number(raw[mapping.priceColumn]) || undefined
    : undefined;

  return { rowNumber: rowNum, productIdentifier, quantity, saleDate, unitPrice, errors };
}
```

### Prisma Schema Additions
```prisma
// New models to add to schema.prisma

model SalesUpload {
  id          Int       @id @default(autoincrement())
  fileName    String?   @map("file_name")     // null for manual entries
  source      String    @default("upload")      // "upload" | "manual"
  status      String    @default("pending")     // "pending" | "processing" | "completed" | "failed"
  totalLines  Int       @default(0) @map("total_lines")
  matchedLines Int      @default(0) @map("matched_lines")
  saleDate    DateTime  @map("sale_date")
  notes       String?
  createdAt   DateTime  @default(now()) @map("created_at")
  createdBy   String    @map("created_by")

  lines       SalesLine[]

  @@map("sales_uploads")
}

model SalesLine {
  id             Int          @id @default(autoincrement())
  uploadId       Int          @map("upload_id")
  itemId         Int          @map("item_id")
  productName    String       @map("product_name")  // Original name from CSV/manual
  quantity       Int                                  // Units sold
  unitPriceCentavos Int?      @map("unit_price_centavos")
  deducted       Boolean      @default(false)         // Whether BOM deduction was applied

  upload         SalesUpload  @relation(fields: [uploadId], references: [id])
  item           Item         @relation(fields: [itemId], references: [id])

  @@map("sales_lines")
}
```

### Server Action: Process Sales with BOM Deduction
```typescript
// Source: Project patterns from src/actions/stock.ts + src/lib/bom.ts
"use server";

import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { explodeBom } from "@/lib/bom";
import { revalidatePath } from "next/cache";

interface SalesLineInput {
  itemId: number;
  productName: string;
  quantity: number;
  unitPriceCentavos?: number;
}

export async function processSalesLines(input: {
  fileName?: string;
  source: "upload" | "manual";
  saleDate: string;
  notes?: string;
  lines: SalesLineInput[];
}) {
  const { user } = await requireRole("staff");

  // Phase 1: Pre-compute all BOM deductions OUTSIDE transaction
  const deductionMap = new Map<number, number>(); // itemId -> total deduct qty (mg or pieces)

  for (const line of input.lines) {
    const bomLines = await explodeBom(line.itemId);
    for (const bom of bomLines) {
      // Load item type to determine unit
      const existing = deductionMap.get(bom.itemId) ?? 0;
      if (bom.itemType === "PACKAGING") {
        deductionMap.set(bom.itemId, existing + bom.quantityPieces * line.quantity);
      } else {
        deductionMap.set(bom.itemId, existing + bom.quantityMg * line.quantity);
      }
    }
  }

  // Phase 2: Single atomic transaction for all writes
  const result = await prisma.$transaction(async (tx) => {
    // Create upload record
    const upload = await tx.salesUpload.create({
      data: {
        fileName: input.fileName ?? null,
        source: input.source,
        saleDate: new Date(input.saleDate),
        totalLines: input.lines.length,
        matchedLines: input.lines.length,
        status: "completed",
        notes: input.notes ?? null,
        createdBy: user.id,
      },
    });

    // Create sales lines
    await tx.salesLine.createMany({
      data: input.lines.map((line) => ({
        uploadId: upload.id,
        itemId: line.itemId,
        productName: line.productName,
        quantity: line.quantity,
        unitPriceCentavos: line.unitPriceCentavos ?? null,
        deducted: true,
      })),
    });

    // Execute all deductions
    const referenceId = `SALE-${upload.id}`;
    for (const [itemId, deductQty] of deductionMap) {
      await tx.inventoryTransaction.create({
        data: {
          itemId,
          type: "SALE_DEDUCTION",
          quantity: -deductQty,
          referenceId,
          notes: `Auto-deducted from sales batch #${upload.id}`,
          createdBy: user.id,
        },
      });

      await tx.item.update({
        where: { id: itemId },
        data: { stockQty: { decrement: deductQty } },
      });
    }

    return upload;
  });

  revalidatePath("/sales");
  revalidatePath("/stock/history");
  revalidatePath("/items");

  return { success: true, uploadId: result.id };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Server-side file parsing via multipart upload | Client-side parsing with structured data to server action | Next.js 14+ server actions | No need for file upload middleware, temp storage, or multer |
| SheetJS from npm registry (`npm install xlsx`) | SheetJS from CDN URL (`pnpm add https://cdn.sheetjs.com/xlsx-0.20.3/...`) | 2023+ | npm registry version frozen at 0.18.5; CDN version actively maintained |
| Sequential per-item transactions | Prisma interactive transactions for batch operations | Prisma 4.7+ | One transaction for all deductions instead of N separate ones |
| `zodResolver` for form validation | `standardSchemaResolver` for Zod v4 | 2025 (Zod v4 release) | Project uses `zod/v4` with `@hookform/resolvers/standard-schema` |

**Deprecated/outdated:**
- `xlsx` npm package (v0.18.5): Use CDN install for current version
- `asChild` prop pattern: Project uses shadcn/ui v4 with Base UI render props instead
- `zodResolver`: Project uses `standardSchemaResolver` for Zod v4 compatibility

## Open Questions

1. **POS Export Format Unknown**
   - What we know: STATE.md notes "POS export format unknown -- obtain sample CSV/Excel file from actual POS before Phase 3 planning" as a blocker/concern
   - What's unclear: Exact column names, whether SKU or product name is used as identifier, date format, whether the file contains one day or multiple days of sales
   - Recommendation: Design a flexible column-mapping step in the upload preview UI. Let users map detected CSV/Excel columns to required fields (product, quantity, date). This makes the system POS-agnostic. For initial implementation, assume a minimal common format: product name or SKU, quantity, optional date and price. The preview step handles any mismatch.

2. **Negative Stock Handling Policy**
   - What we know: Sales represent reality -- if items were sold, the deduction must happen regardless of current stock levels
   - What's unclear: Whether to show a warning modal before confirming sales that would cause negative stock
   - Recommendation: Allow negative stock (no blocking). Show warning badges on any items that would go negative in the preview step. After processing, the items list and dashboard (Phase 4) will surface negative/low stock. This matches real-world workflow where sales happen first and purchasing follows.

3. **Items in SalesLine Relation**
   - What we know: The Item model needs a new relation for SalesLine
   - What's unclear: Whether to add a `salesLines` relation to the Item model or keep it unidirectional
   - Recommendation: Add bidirectional relation (`salesLines SalesLine[]` on Item) for future queryability (e.g., "which items sell most" for Phase 4 dashboard). The Item model already has multiple relations.

4. **Ledger quantity sign convention**
   - What we know: Current stock receiving stores positive quantities (increment). The existing stock history page already has badge colors for SALE_DEDUCTION (red).
   - What's unclear: Whether to store negative quantities in ledger for deductions or positive quantities with type-based interpretation.
   - Recommendation: Store negative quantities for SALE_DEDUCTION entries (matches accounting convention). The `decrement` operation on stock_qty uses the absolute value. Display absolute value with a minus sign or "deducted" label in transaction history.

## Sources

### Primary (HIGH confidence)
- Project codebase analysis: `src/lib/bom.ts`, `src/actions/stock.ts`, `prisma/schema.prisma`, `src/components/stock/receiving-form.tsx` -- verified existing patterns
- [PapaParse official docs](https://www.papaparse.com/docs) -- API, configuration options
- [SheetJS official docs](https://docs.sheetjs.com/docs/getting-started/installation/nodejs/) -- installation from CDN, `sheet_to_json` API
- [Prisma Transactions docs](https://www.prisma.io/docs/orm/prisma-client/queries/transactions) -- interactive transactions, batch operations

### Secondary (MEDIUM confidence)
- [npm trends comparison](https://npmtrends.com/csv-parse-vs-exceljs-vs-node-xlsx-vs-papaparse-vs-xlsx) -- library popularity comparison
- [Better Stack PapaParse guide](https://betterstack.com/community/guides/scaling-nodejs/parsing-csv-files-with-papa-parse/) -- best practices for PapaParse configuration

### Tertiary (LOW confidence)
- POS export format assumptions -- based on generic POS export patterns, not verified against actual client POS system

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - PapaParse and SheetJS are well-established, project patterns verified from codebase
- Architecture: HIGH - Two-phase (client parse, server process) pattern follows Next.js server actions best practices; deduction logic builds on existing proven `explodeBom()` and atomic ledger pattern
- Pitfalls: HIGH - Based on direct analysis of existing codebase constraints (integer storage, BOM recursion, transaction patterns)
- POS format handling: MEDIUM - Column mapping approach is robust but untested against actual POS export

**Research date:** 2026-03-10
**Valid until:** 2026-04-10 (30 days -- stable domain, libraries well-established)
