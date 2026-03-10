---
phase: 03-sales-and-auto-deduction
verified: 2026-03-10T10:00:00Z
status: passed
score: 4/4 must-haves verified
re_verification: false
---

# Phase 3: Sales and Auto-Deduction Verification Report

**Phase Goal:** Users can record sales (via CSV upload or manual entry) and the system automatically deducts raw materials from inventory based on recipe breakdowns
**Verified:** 2026-03-10T10:00:00Z
**Status:** passed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can upload a CSV or Excel file from POS export, preview the parsed data with validation errors highlighted, and confirm before processing | VERIFIED | `upload-form.tsx` (234 lines) parses CSV via PapaParse and Excel via SheetJS client-side. `upload-preview.tsx` (266 lines) shows preview table with red-highlighted error rows and green checkmarks for valid rows. Summary bar shows matched/error/total counts. Confirm button calls `processSalesLines` with valid rows only. Column mapper (`column-mapper.tsx`, 140 lines) handles arbitrary headers. Multi-step flow orchestrated by `upload-flow-client.tsx` (70 lines). |
| 2 | User can manually enter individual sales when no POS export is available | VERIFIED | `manual-entry-form.tsx` (294 lines) uses react-hook-form with useFieldArray for dynamic line rows. Product selector loads finished items with recipes via `getFinishedItems()`. Each line has product, quantity, and optional price fields. Add/remove line buttons work. Form submits via `processSalesLines` with `source: "manual"`. Redirects to `/sales/history` on success. |
| 3 | After sales are confirmed, system auto-deducts all raw materials and packaging from inventory by recursively exploding recipes through all BOM levels | VERIFIED | `src/actions/sales.ts` (253 lines) implements two-phase approach: Phase 1 calls `explodeBom()` (from `src/lib/bom.ts`) outside transaction for each sold item, builds aggregated deduction map scaling BOM quantities by units sold. Phase 2 uses `prisma.$transaction` to atomically create SalesUpload + SalesLines + SALE_DEDUCTION ledger entries + stock decrements. PACKAGING uses pieces, all others use milligrams. Negative stock explicitly allowed. `explodeBom()` recursively resolves SEMI_FINISHED sub-recipes to leaf-level RAW_MATERIAL and PACKAGING items with circular reference detection. |
| 4 | User can view sales history and see which uploaded files have been processed | VERIFIED | `sales-history-table.tsx` (163 lines) uses TanStack Table with sorting/pagination. `sales-columns.tsx` (115 lines) defines columns: Date, Source badge (Upload/Manual), File Name, Lines count, Status badge, View action link. History page (`history/page.tsx`, 44 lines) loads data via `getSalesUploads()` server action. Detail page (`[uploadId]/page.tsx`, 158 lines) shows metadata cards and individual sales lines with Product Name, Matched Item (name + SKU), Quantity, Unit Price, Deducted status. |

**Score:** 4/4 truths verified

### Required Artifacts

**Plan 01: Data Layer and BOM Deduction Logic**

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `prisma/schema.prisma` | SalesUpload and SalesLine models with Item relation | VERIFIED | SalesUpload (lines 90-106) and SalesLine (108-122) models present with all specified fields. Item model has `salesLines SalesLine[]` relation (line 51). Fields match spec exactly. |
| `supabase/migrations/00003_sales_tables.sql` | RLS policies for sales tables | VERIFIED | 57 lines. RLS enabled on both tables. SELECT policies for viewer+ (authenticated), INSERT/UPDATE for staff+. No DELETE policies. Uses `authorize()` function pattern. |
| `src/schemas/sales.ts` | Zod schemas for sales validation | VERIFIED | 34 lines. Exports `salesLineInputSchema`, `processSalesSchema`, `manualEntrySchema`, `manualEntryLineSchema` with proper validation rules. Uses `zod/v4`. |
| `src/actions/sales.ts` | Server actions for sales processing | VERIFIED | 253 lines. Exports `processSalesLines`, `getSalesUploads`, `getSalesUploadDetail`, `getFinishedItems`. All use `requireRole` guard. Atomic transaction with BOM explosion outside. |
| `src/lib/sales-parser.ts` | Column mapping and row normalization | VERIFIED | 164 lines. Exports `normalizeRow`, `suggestMapping`, `ColumnMapping`, `NormalizedSalesRow`. Fuzzy header matching for product/quantity/date/price patterns. |

**Plan 02: CSV/Excel Upload UI**

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/components/sales/upload-form.tsx` | File input with drag-and-drop, CSV/Excel parsing | VERIFIED | 234 lines (min 40 required). Drag-and-drop zone, PapaParse CSV parsing, SheetJS Excel parsing, auto-suggests column mapping. |
| `src/components/sales/upload-preview.tsx` | Preview table with validation, error highlighting, confirm | VERIFIED | 266 lines (min 80 required). Product matching by SKU then name (case-insensitive). Red background for error rows. Green checkmark for matches. Confirm calls `processSalesLines`. |
| `src/components/sales/column-mapper.tsx` | Column mapping UI with dropdowns | VERIFIED | 140 lines (min 40 required). Four select dropdowns for product (required), quantity (required), date (optional), price (optional). Confirm button disabled until required fields mapped. |
| `src/app/(dashboard)/sales/upload/page.tsx` | Upload flow page | VERIFIED | 15 lines (min 30 -- see note). Thin server shell rendering `UploadFlowClient`. Below min_lines threshold but the orchestration logic lives in `upload-flow-client.tsx` (70 lines) which was extracted as a separate client component. Combined they meet the intent. |

**Plan 03: Manual Entry, History, and Sidebar**

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/components/sales/manual-entry-form.tsx` | Form with product selector, dynamic rows | VERIFIED | 294 lines (min 60 required). useFieldArray dynamic rows, product selector from `getFinishedItems()`, quantity, optional price, notes. Submits via `processSalesLines`. |
| `src/components/sales/sales-history-table.tsx` | TanStack Table for sales list | VERIFIED | 163 lines (min 50 required). useReactTable with sorting, pagination. Empty state with links to upload/manual entry. |
| `src/app/(dashboard)/sales/manual/page.tsx` | Manual sales entry page | VERIFIED | 15 lines (min 15 required). Renders `ManualEntryForm` component. |
| `src/app/(dashboard)/sales/history/page.tsx` | Sales history listing page | VERIFIED | 44 lines (min 20 required). Calls `getSalesUploads()`, renders table. Action buttons for Upload File and Manual Entry. |
| `src/app/(dashboard)/sales/[uploadId]/page.tsx` | Upload detail page | VERIFIED | 158 lines (min 30 required). Loads via `getSalesUploadDetail()`. Metadata cards and HTML table with sales lines. |
| `src/components/layout/sidebar.tsx` | Sidebar with Sales section | VERIFIED | 195 lines. Sales NavSection with Upload Sales (staff+), Manual Entry (staff+), and Sales History (viewer+) links with FileUp, PenLine, ReceiptText icons. Positioned after Recipes, before Stock. |

### Key Link Verification

**Plan 01 Key Links**

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/actions/sales.ts` | `src/lib/bom.ts` | `explodeBom()` call | WIRED | Line 5: `import { explodeBom } from "@/lib/bom"`. Line 48: `const bomLines = await explodeBom(line.itemId)` -- called for each sold item outside transaction, results aggregated into deduction map. |
| `src/actions/sales.ts` | `prisma.$transaction` | Atomic writes | WIRED | Line 81: `const result = await prisma.$transaction(async (tx) => { ... })`. Creates upload, sales lines, ledger entries, and stock decrements atomically. |
| `src/actions/sales.ts` | `src/lib/auth.ts` | `requireRole('staff')` guard | WIRED | Line 26: `const { user } = await requireRole("staff")` in `processSalesLines`. Also present in `getSalesUploads` (viewer), `getSalesUploadDetail` (viewer), `getFinishedItems` (staff). |

**Plan 02 Key Links**

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `upload-form.tsx` | papaparse/xlsx | Client-side parsing | WIRED | Lines 4-5: `import Papa from "papaparse"` and `import * as XLSX from "xlsx"`. Line 47: `Papa.parse()` for CSV. Lines 66-71: `XLSX.read()` + `sheet_to_json()` for Excel. Both in package.json. |
| `upload-preview.tsx` | `src/actions/sales.ts` | `processSalesLines` on confirm | WIRED | Line 9: `import { processSalesLines } from "@/actions/sales"`. Line 124: `const result = await processSalesLines({...})` in confirm handler with transition. Redirects to `/sales/history` on success. |
| `upload-preview.tsx` | `src/lib/sales-parser.ts` | normalizeRow and suggestMapping | WIRED | Line 7: `import { normalizeRow, ... } from "@/lib/sales-parser"`. Line 59: `normalizeRow(row, idx + 1, mapping)` used to normalize each parsed row. `suggestMapping` used in `upload-form.tsx` line 99. |

**Plan 03 Key Links**

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `manual-entry-form.tsx` | `src/actions/sales.ts` | `processSalesLines` with source='manual' | WIRED | Lines 11-12: imports `getFinishedItems` and `processSalesLines`. Line 82: `await processSalesLines({ source: "manual", ... })`. |
| `sales-history-table.tsx` | `src/actions/sales.ts` | `getSalesUploads` for data | WIRED | Data loaded in server component `history/page.tsx` line 8: `const result = await getSalesUploads()`. Passed as prop to table component line 41. |
| `[uploadId]/page.tsx` | `src/actions/sales.ts` | `getSalesUploadDetail` | WIRED | Line 2: `import { getSalesUploadDetail } from "@/actions/sales"`. Line 31: `const result = await getSalesUploadDetail(id)`. Renders upload metadata and lines table. |
| `sidebar.tsx` | `/sales/*` | Navigation links | WIRED | Lines 70-92: Sales NavSection with three items linking to `/sales/upload`, `/sales/manual`, `/sales/history`. Role-gated with RoleGate component. |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| SALE-01 | 03-02 | User can upload sales data via CSV or Excel file with validation and preview | SATISFIED | Upload form with PapaParse (CSV) and SheetJS (Excel) parsing, column mapper for arbitrary headers, preview table with product matching and error highlighting, confirm triggers BOM deduction. |
| SALE-02 | 03-03 | User can manually enter sales when no export is available | SATISFIED | Manual entry form with product selector (finished items with recipes), dynamic line rows (add/remove), quantity, optional price, notes. Submits via same `processSalesLines` server action. |
| SALE-03 | 03-01 | System auto-deducts raw materials from inventory based on recipe breakdowns | SATISFIED | `processSalesLines` calls `explodeBom()` per sold item, builds aggregated deduction map, atomically creates SALE_DEDUCTION ledger entries and decrements stock. Handles PACKAGING (pieces) vs weight-based (milligrams). Negative stock allowed. |
| SALE-04 | 03-03 | User can view sales history and past uploaded files | SATISFIED | Sales history page with TanStack Table (date, source, file name, lines, status). Detail page shows metadata cards and individual sales lines with product matching info and deduction status. |

No orphaned requirements -- all four SALE-0x requirements from ROADMAP.md are covered by plans and verified in code.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none) | -- | -- | -- | -- |

Zero TODO/FIXME/PLACEHOLDER comments found across all sales-related files. No empty implementations (`return null`, `return {}`, `return []`, `=> {}`). No console.log statements. No stub handlers.

### Build Verification

TypeScript compiles cleanly with `npx tsc --noEmit` (zero errors). PapaParse and SheetJS (CDN 0.20.3) present in package.json dependencies. All 6 commits verified in git log.

### Human Verification Required

### 1. CSV Upload End-to-End

**Test:** Upload a real POS CSV file with product names matching existing finished items. Verify parsed rows appear in preview, products are matched, and confirming triggers stock deductions visible in inventory history.
**Expected:** Rows display with green checkmarks for matched products. Unmatched rows show red "Not found". After confirm, redirect to sales history showing the new upload. Stock quantities decrease for all BOM leaf ingredients.
**Why human:** Requires a running application with database, actual file interaction, and verifying the complete flow from upload through BOM deduction to stock changes.

### 2. Excel Upload Format Support

**Test:** Upload an .xlsx file from a POS system. Verify it parses correctly and the column mapper appears if headers don't auto-match.
**Expected:** Excel file parsed by SheetJS, rows shown in preview. Column mapper shown when required headers not auto-detected.
**Why human:** Requires browser environment with FileReader API and actual file format validation.

### 3. Manual Entry with BOM Deduction

**Test:** Select a finished product that has a multi-level recipe (semi-finished sub-recipe). Enter quantity and submit.
**Expected:** All leaf-level raw materials and packaging are deducted from stock. SALE_DEDUCTION ledger entries created for each unique ingredient with quantities scaled by units sold.
**Why human:** Requires database with actual recipe data and verifying recursive BOM explosion through multiple levels produces correct aggregated deductions.

### 4. Negative Stock Behavior

**Test:** Enter a sale quantity that would make a raw material's stock go below zero.
**Expected:** Sale processes successfully. Stock quantity becomes negative. No error or blocking behavior.
**Why human:** Requires verifying the business rule that negative stock is allowed, which is a design decision that needs confirmation with real data.

### Gaps Summary

No gaps found. All four success criteria from ROADMAP.md are verified:

1. CSV/Excel upload with validation preview -- fully implemented with PapaParse, SheetJS, column mapping, product matching, and error highlighting.
2. Manual sales entry -- fully implemented with dynamic form, product selector, and BOM deduction integration.
3. Automatic BOM-based inventory deduction -- fully implemented with two-phase transaction (explosion outside, writes inside), aggregated deduction map, negative stock allowed.
4. Sales history with upload details -- fully implemented with TanStack Table list view and detail page with metadata cards and sales lines.

All 15 phase artifacts verified at three levels (exists, substantive, wired). All 10 key links verified as WIRED. All 4 requirements (SALE-01 through SALE-04) satisfied with implementation evidence. Zero anti-patterns detected. TypeScript compiles cleanly.

---

_Verified: 2026-03-10T10:00:00Z_
_Verifier: Claude (gsd-verifier)_
