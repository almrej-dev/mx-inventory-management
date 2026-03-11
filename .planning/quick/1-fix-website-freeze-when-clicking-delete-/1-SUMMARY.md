---
phase: quick
plan: 1
subsystem: product-form
tags: [bug-fix, react-hook-form, useFieldArray, render-loop]
dependency_graph:
  requires: []
  provides: [stable-product-form-delete]
  affects: [src/components/products/product-form.tsx]
tech_stack:
  added: []
  patterns: [useFieldArray without shouldUnregister]
key_files:
  modified:
    - src/components/products/product-form.tsx
decisions:
  - "Removing shouldUnregister: true is safe because both quantityGrams and quantityPieces default to NaN and server actions use item's unitType to determine which field to read"
metrics:
  duration: ~3min
  completed: 2026-03-11
---

# Quick Task 1: Fix website freeze when clicking delete

**One-liner:** Removed `shouldUnregister: true` from `useForm` and a `console.log` debug statement from the product-form render loop to eliminate a runaway re-render cascade on ingredient row deletion.

## What Was Done

`shouldUnregister: true` is incompatible with `useFieldArray` per the react-hook-form docs. When `remove(index)` is called, unmounting inputs fire additional unregister callbacks. Combined with `watch('ingredients')`, this creates a runaway render loop that freezes the browser. The stale `console.log(selectedItem)` inside the render loop compounded the performance hit.

**Two-line fix in `src/components/products/product-form.tsx`:**
1. Removed `shouldUnregister: true,` from the `useForm` options object (line 63)
2. Removed `console.log(selectedItem);` from the `.map()` render callback (line 208)

## Verification

- `grep -n "shouldUnregister"` returns no matches
- `grep -n "console.log"` returns no matches
- `npx tsc --noEmit` exits 0

## Commits

| Task | Description | Hash |
|------|-------------|------|
| 1 | Remove shouldUnregister and debug log | 8893727 |

## Deviations from Plan

None — plan executed exactly as written.

## Checkpoint Pending

Task 2 is a `checkpoint:human-verify`. The developer must:
1. Start the dev server (`npm run dev`)
2. Navigate to a product edit/create page
3. Add 2-3 ingredient rows and click the delete (trash) icon
4. Confirm the row is removed instantly with no freeze
5. Confirm no console output fires in DevTools during form interaction
6. Submit the form and confirm save still works

## Self-Check: PASSED

- [x] `src/components/products/product-form.tsx` — modified (shouldUnregister and console.log removed)
- [x] Commit 8893727 exists
- [x] `npx tsc --noEmit` — exits 0
