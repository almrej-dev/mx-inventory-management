# Z-Reading Page — Design Spec

## Overview

A standalone page for uploading receipt photos, extracting data via client-side OCR, and storing the results as editable records for bookkeeping. Z-readings are reference-only — they do not affect inventory.

## Requirements

- Users upload a receipt photo (JPG, PNG; max 10MB)
- Tesseract.js runs client-side OCR to extract text
- A parser utility converts raw OCR text into structured fields
- Extracted data is shown in an editable form alongside the receipt image
- Users correct any OCR errors and save
- All saved Z-readings appear in a searchable, sortable list
- Clicking a reading shows the image + data in a split-panel detail view
- Images are stored in Supabase Storage (`z-readings` bucket)
- Admin & Staff can create/edit; Viewer can only view

## Data Model

### ZReading

| Field          | Type     | Notes                              |
|----------------|----------|------------------------------------|
| id             | Int      | PK, autoincrement                  |
| storeName      | String?  | Store/branch name from receipt     |
| receiptNumber  | String?  | Receipt/transaction number         |
| receiptDate    | DateTime | Date on the receipt                |
| subtotal       | Int      | Centavos                           |
| tax            | Int      | Centavos                           |
| total          | Int      | Centavos                           |
| paymentMethod  | String?  | Cash, Card, GCash, etc.            |
| imageUrl       | String   | Supabase Storage public URL        |
| notes          | String?  | Optional user notes                |
| status         | String   | "pending" or "completed"           |
| createdAt      | DateTime | Auto-set                           |
| updatedAt      | DateTime | Auto-set on update                 |
| createdBy      | String   | User UUID                          |

### ZReadingLine

| Field              | Type   | Notes                          |
|--------------------|--------|--------------------------------|
| id                 | Int    | PK, autoincrement              |
| readingId          | Int    | FK → ZReading                  |
| productName        | String | As scanned from receipt         |
| quantity           | Int    | Units                          |
| unitPriceCentavos  | Int    | Price per unit in centavos     |
| lineTotalCentavos  | Int    | Line total in centavos         |

No relation to `Item` or inventory. Purely record-keeping.

**Prisma conventions:** Follow existing `@@map`/`@map` patterns for snake_case table/column names (e.g., `@@map("z_readings")`, `@map("store_name")`). Use Zod from `zod/v4` import path consistent with existing schemas.

## Page Layout

**Route:** `/z-reading` — single page, two states.

### List View (default)

- Page header: "Z-Reading" with "Scan Receipt" button (Admin/Staff only)
- TanStack React Table:
  - Columns: Date, Store, Receipt #, Total (PHP), Status (badge), Actions
  - Default sort: `receiptDate` descending
  - Pagination: 10/25/50 rows
- Clicking a row transitions to detail view

### Scan Flow (triggered by "Scan Receipt")

1. **Upload step:** Drag-and-drop or file picker for image
2. **Processing step:** Loading state while Tesseract.js runs OCR, then parser extracts structured fields
3. **Transitions to detail view** with extracted data pre-filled, status "pending"

### Detail View

- **Left panel (~40%):** Receipt image with zoom/pan
- **Right panel (~60%):** Editable form
  - Header fields: store name, receipt #, date, payment method
  - Line items: dynamic field array (product name, qty, unit price, line total) with add/remove
  - Totals: subtotal, tax, total
  - Notes textarea
  - Actions: "Save" and "Back to List"
- Save: uploads image to Supabase Storage (if new), upserts ZReading + ZReadingLine records, sets status to "completed"

## OCR & Parsing

### Pipeline

1. User drops/selects image file
2. Tesseract.js worker loads English language data (~2MB, cached)
3. Image preprocessed to grayscale
4. Tesseract extracts raw text
5. `parseReceiptText(rawText)` utility parses into structured fields

### Parsing Heuristics

- **Store name:** First non-empty lines before date/number patterns
- **Receipt number:** Patterns like `#12345`, `Receipt: 12345`, `INV-12345`
- **Date:** Common formats (`MM/DD/YYYY`, `YYYY-MM-DD`, `Mar 17, 2026`, etc.)
- **Line items:** Lines matching `<text> <quantity> <price>` or `<text> <price>` patterns
- **Subtotal/Tax/Total:** Keywords followed by a number
- **Payment method:** Keywords like "Cash", "Card", "GCash"

### Accuracy Expectations

Client-side OCR on receipt photos targets 60-80% accuracy. The editable form exists so users fix the rest. The parser is a standalone pure function, easy to improve over time.

## File Storage

- **Bucket:** `z-readings` in Supabase Storage (public)
- **Path:** `z-readings/{userId}/{timestamp}-{filename}`
- **Accepted formats:** JPG, PNG (HEIC dropped — no cross-browser support without conversion library)
- **Max size:** 10MB
- Image held in memory during scan/edit; uploaded to storage only on save
- No auto-deletion; images persist with the record

## Navigation & Permissions

### Sidebar

New "Z-Reading" section:
- "Z-Reading" → `/z-reading` (Admin, Staff, Viewer)

### Role Access

- **Admin & Staff:** Create, edit, save
- **Viewer:** View list and details only
- Enforced via `RoleGate` component + server action role checks

## Component Structure

```
src/app/(dashboard)/z-reading/
  page.tsx                      — server component, fetches data

src/components/z-reading/
  z-reading-client.tsx          — main client component, list/detail state
  z-reading-table.tsx           — TanStack table for list view
  z-reading-columns.tsx         — column definitions
  z-reading-detail.tsx          — split-panel detail view
  z-reading-form.tsx            — editable form (React Hook Form + Zod)
  z-reading-scanner.tsx         — upload + Tesseract OCR logic
  receipt-parser.ts             — parseReceiptText() pure utility

src/schemas/z-reading.ts       — Zod validation schemas
src/actions/z-reading.ts       — server actions (CRUD + storage upload)
```

## Dependencies

- `tesseract.js` — client-side OCR (new dependency)
- All other dependencies already in the project

## Out of Scope

- Inventory deduction / BOM explosion (Z-readings are record-keeping only)
- Batch upload of multiple receipts at once
- Automatic deletion of readings/images
- Server-side OCR or AI-based extraction
