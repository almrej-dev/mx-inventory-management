---
status: complete
phase: 05-accuracy-and-polish
source: [05-01-SUMMARY.md, 05-02-SUMMARY.md, 05-03-SUMMARY.md]
started: 2026-03-10T04:30:00Z
updated: 2026-03-10T04:40:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Waste Nav Item in Sidebar
expected: Sidebar Stock section shows: Receiving, Waste, Reconciliation, History (in that order). Waste item has a Trash2 icon.
result: pass

### 2. Record Waste for Weight Item
expected: Navigate to /stock/waste. Select a weight-based item (e.g., flower/concentrate). Unit label shows "grams". Fill quantity, select a reason code from the 6 options, optionally add notes. Submit succeeds with a success banner.
result: pass

### 3. Record Waste for Piece Item
expected: Select a PACKAGING item. Unit label changes to "pieces" (not grams). Submit succeeds.
result: pass

### 4. Waste Appears in Transaction History
expected: After recording waste, navigate to /stock/history. A new WASTE entry appears with an orange badge, showing correct item, negative quantity, and the reason code in notes.
result: pass

### 5. Navigate to Reconciliation Page
expected: Click Reconciliation in sidebar Stock section. Page loads at /stock/reconciliation showing a table of all active items with their current system stock quantities.
result: pass

### 6. Live Variance Preview
expected: Enter a physical count that differs from system stock for an item. The variance column updates live with color coding: green for surplus (physical > system), red for shortage (physical < system). Variance shown in display units (grams or pieces).
result: pass

### 7. Reconciliation Type Filter
expected: A type filter dropdown exists above the table. Selecting a specific item type filters the table to show only items of that type.
result: pass

### 8. Submit Reconciliation
expected: Enter counts for one or more items with discrepancies. A pre-submit summary shows the items that will be adjusted. Submit succeeds, stockQty updates to match physical counts, and ADJUSTMENT entries appear in transaction history.
result: pass

### 9. User Column in Transaction History
expected: Navigate to /stock/history. A "User" column appears as the second column (after Date). Each row shows the display name of the user who performed the stock movement (not a raw UUID).
result: pass

## Summary

total: 9
passed: 9
issues: 0
pending: 0
skipped: 0

## Gaps

[none yet]
