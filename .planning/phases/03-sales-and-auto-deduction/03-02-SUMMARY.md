---
phase: 03-sales-and-auto-deduction
plan: 02
subsystem: ui
tags: [papaparse, sheetjs, csv, excel, file-upload, sales, nextjs, react]

# Dependency graph
requires:
  - phase: 03-sales-and-auto-deduction
    provides: "processSalesLines server action, getFinishedItems query, normalizeRow/suggestMapping parser utilities, ColumnMapping/NormalizedSalesRow types"
  - phase: 02-recipe-engine
    provides: "RecipeIngredient model and explodeBom() for BOM-based inventory deduction"
provides:
  - "CSV/Excel file upload with client-side parsing (PapaParse for CSV, SheetJS for Excel)"
  - "Column mapper UI for mapping arbitrary POS export headers to required fields"
  - "Upload preview table with product matching, error highlighting, and confirmation flow"
  - "Multi-step upload flow page orchestrating file select -> column map -> preview -> confirm"
affects: [03-sales-and-auto-deduction]

# Tech tracking
tech-stack:
  added: [papaparse, xlsx]
  patterns:
    - "Client-side file parsing for instant preview without server round-trips"
    - "Multi-step upload flow with React useState managing step transitions and data passing"
    - "Product matching by case-insensitive SKU then name against finished items with recipes"

key-files:
  created:
    - src/components/sales/upload-form.tsx
    - src/components/sales/column-mapper.tsx
    - src/components/sales/upload-preview.tsx
    - src/app/(dashboard)/sales/upload/page.tsx
    - src/app/(dashboard)/sales/upload/upload-flow-client.tsx
  modified: []

key-decisions:
  - "Client-side parsing with PapaParse (CSV) and SheetJS (Excel) for instant preview without server upload"
  - "SheetJS installed from CDN URL (0.20.3) instead of npm registry (outdated 0.18.5)"
  - "Auto-skip column mapping step when suggestMapping detects all required fields"
  - "Simple HTML table for preview (not TanStack Table) since it is a one-time preview, not a reusable data table"
  - "Product matching tries SKU first, then name, both case-insensitive"

patterns-established:
  - "Upload flow uses client wrapper component to manage multi-step state while keeping page.tsx as a thin server shell"
  - "File-level sale date input with per-row date override via column mapping"

requirements-completed: [SALE-01]

# Metrics
duration: 4min
completed: 2026-03-10
---

# Phase 3 Plan 2: Sales Upload UI with CSV/Excel Parsing Summary

**CSV/Excel upload flow with PapaParse/SheetJS client-side parsing, column mapping, product matching preview, and BOM deduction confirmation**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-10T01:22:40Z
- **Completed:** 2026-03-10T01:26:42Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Installed PapaParse and SheetJS (from CDN URL) for client-side CSV/Excel parsing with instant preview
- Upload form with drag-and-drop file input, CSV parsing via Papa.parse and Excel parsing via XLSX.read
- Column mapper with dropdown mapping UI when auto-detection of product/quantity columns is incomplete
- Upload preview table matches products against finished items (SKU + name), highlights errors red, shows valid rows with green checkmarks
- Confirm button triggers processSalesLines with valid rows only, redirects to /sales/history on success
- Multi-step flow page orchestrating file select -> column map -> preview -> confirm with back navigation

## Task Commits

Each task was committed atomically:

1. **Task 1: Install PapaParse/SheetJS, create upload form and column mapper** - `b329e84` (feat)
2. **Task 2: Create upload preview table with product matching and upload flow page** - `820d895` (feat)

## Files Created/Modified
- `package.json` - Added papaparse, @types/papaparse, xlsx dependencies
- `pnpm-lock.yaml` - Updated lockfile with new dependencies
- `src/components/sales/upload-form.tsx` - File input with drag-and-drop, CSV/Excel client-side parsing, auto-mapping
- `src/components/sales/column-mapper.tsx` - Column mapping UI with dropdowns for product, quantity, date, price
- `src/components/sales/upload-preview.tsx` - Preview table with product matching, error highlighting, confirm action
- `src/app/(dashboard)/sales/upload/page.tsx` - Server component shell for upload page
- `src/app/(dashboard)/sales/upload/upload-flow-client.tsx` - Client wrapper managing multi-step flow state

## Decisions Made
- **Client-side parsing over server upload:** PapaParse and SheetJS parse files entirely in the browser, providing instant row preview without a server round-trip. This matches the plan spec and avoids needing a file upload API.
- **SheetJS from CDN URL:** The npm registry version (0.18.5) is outdated; CDN URL provides 0.20.3 with full feature set.
- **Auto-skip column mapper:** When suggestMapping detects both required fields (product + quantity), the column mapper step is skipped entirely for a smoother UX.
- **Simple HTML table for preview:** Used a plain HTML table instead of TanStack Table since this is a one-time preview, not a reusable data table with sorting/filtering needs.
- **Product matching strategy:** Try exact SKU match first (case-insensitive), then exact name match (case-insensitive). No fuzzy matching -- users can correct via column mapping or ensure POS names match system items.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Upload flow complete and functional, calling processSalesLines from Plan 01 for atomic BOM-based deduction
- Sales History page (Plan 03) will show processed upload records at /sales/history (redirect target from upload confirm)
- Sidebar navigation already includes Upload Sales link pointing to /sales/upload

## Self-Check: PASSED

All 5 created files verified present (upload-form.tsx, column-mapper.tsx, upload-preview.tsx, page.tsx, upload-flow-client.tsx). Both task commits (b329e84, 820d895) verified in git log. TypeScript compiles cleanly with `npx tsc --noEmit`.

---
*Phase: 03-sales-and-auto-deduction*
*Completed: 2026-03-10*
