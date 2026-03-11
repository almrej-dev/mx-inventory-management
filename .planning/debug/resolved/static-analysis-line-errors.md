---
status: resolved
trigger: "Scan all project files for line errors (type errors, syntax issues, import errors, undefined variables, etc.)"
created: 2026-03-11T00:00:00Z
updated: 2026-03-11T00:05:00Z
symptoms_prefilled: true
---

## Current Focus

hypothesis: CONFIRMED - found and fixed all actionable errors
test: ran pnpm typecheck && pnpm lint
expecting: zero errors, only library-compatibility warnings
next_action: complete

## Symptoms

expected: All files should be free of TypeScript/ESLint/static errors
actual: Unknown — user wants a full scan to find any hidden issues
errors: None reported yet — this is a proactive scan
reproduction: Run TypeScript compiler, linter, or static analysis tools
started: Proactive check — not a regression

## Eliminated

- hypothesis: No errors exist
  evidence: tsc found 5 errors; eslint found 6 warnings including 2 unused-var errors
  timestamp: 2026-03-11T00:01:00Z

## Evidence

- timestamp: 2026-03-11T00:01:00Z
  checked: pnpm typecheck output
  found: 4 TS2307 errors in .next/types/validator.ts referencing deleted recipes/ pages; 1 TS2322 in edit-client.tsx
  implication: stale .next cache + ItemFormProps type too narrow

- timestamp: 2026-03-11T00:01:30Z
  checked: pnpm lint output
  found: 2 unused-var warnings (typeBadgeVariants in product-columns.tsx, Button in upload-form.tsx); 4 react-hooks/incompatible-library warnings
  implication: dead code from refactor; library warnings are not fixable in our code

- timestamp: 2026-03-11T00:02:00Z
  checked: src/components/items/item-form.tsx ItemFormProps.initialData.type
  found: type narrowed to 'RAW_MATERIAL' | 'PACKAGING' but DB enum has 4 values
  implication: causes TS2322 when edit-client.tsx passes actual DB item with SEMI_FINISHED or FINISHED type

- timestamp: 2026-03-11T00:02:30Z
  checked: .next/types/validator.ts
  found: auto-generated file still referencing recipes/[id]/edit, recipes/[id], recipes/new, recipes/page which were deleted
  implication: must delete .next to force Next.js to regenerate

- timestamp: 2026-03-11T00:04:00Z
  checked: pnpm typecheck after fixes
  found: zero errors
  implication: all TypeScript errors resolved

- timestamp: 2026-03-11T00:04:30Z
  checked: pnpm lint after fixes
  found: 0 errors, 4 warnings (all react-hooks/incompatible-library — third-party library notices, not fixable)
  implication: all actionable lint errors resolved

## Resolution

root_cause: |
  Three separate issues found:
  1. Stale .next build cache contained auto-generated validator.ts still referencing deleted recipes/ pages
  2. ItemForm component's initialData.type prop was narrowed to only 'RAW_MATERIAL' | 'PACKAGING' (matching UI dropdown options) but must accept all 4 DB ItemType enum values since existing items can have any type
  3. Dead code from refactoring: unused typeBadgeVariants in product-columns.tsx and unused Button import in upload-form.tsx

fix: |
  1. Deleted .next/ directory to clear stale Next.js generated types
  2. Widened ItemFormProps.initialData.type in item-form.tsx to accept all 4 ItemType values
  3. Removed unused typeBadgeVariants const from product-columns.tsx
  4. Removed unused Button import from upload-form.tsx

verification: |
  pnpm typecheck: 0 errors (was 5)
  pnpm lint: 0 errors, 4 warnings (was 6 warnings including 2 unused-var errors)
  Remaining 4 warnings are react-hooks/incompatible-library — React Compiler notices about
  react-hook-form watch() and TanStack useReactTable() APIs; these are third-party library
  limitations not fixable in application code.

files_changed:
  - src/components/items/item-form.tsx: widened initialData.type to include all 4 ItemType enum values
  - src/components/products/product-columns.tsx: removed unused typeBadgeVariants constant
  - src/components/sales/upload-form.tsx: removed unused Button import
  - .next/: deleted stale build cache
