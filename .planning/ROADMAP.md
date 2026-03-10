# Roadmap: Ice Cream & Tea Inventory Management System

## Overview

This roadmap delivers a cloud-hosted inventory management system that auto-calculates raw material consumption from sales through multi-level recipes. The five phases follow the natural dependency chain: items must exist before recipes can reference them, recipes must exist before sales can trigger deductions, and transaction data must flow before dashboards can surface insights. Each phase delivers a verifiable capability that builds toward the core value: knowing exactly how much stock is left and when to reorder.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Auth, item management, stock receiving, and the data model that everything else depends on
- [x] **Phase 2: Recipe Engine** - Multi-level recipe/BOM management with recursive cost calculation (completed 2026-03-10)
- [x] **Phase 3: Sales and Auto-Deduction** - CSV/Excel upload, manual entry, and recipe-based inventory deduction (completed 2026-03-10)
- [x] **Phase 4: Dashboard and Alerts** - Inventory summary, sales reports, bestsellers, and low stock alerts (completed 2026-03-10)
- [x] **Phase 5: Accuracy and Polish** - Waste recording, physical count reconciliation, and data integrity (completed 2026-03-10)

## Phase Details

### Phase 1: Foundation
**Goal**: Users can log in with role-based access, manage all item types with proper unit conversions, and record incoming stock
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, ITEM-01, ITEM-02, ITEM-03, ITEM-04, ITEM-05, ITEM-06, STCK-01, STCK-05
**Success Criteria** (what must be TRUE):
  1. User can log in with email/password and see only what their role permits (Admin sees everything, Staff can enter data, Viewer can only read)
  2. Admin can add new users and assign them Admin, Staff, or Viewer roles
  3. User can create items of all four types (raw material, semi-finished, finished, packaging) with weight in grams and carton-to-unit conversion
  4. User can search and filter the item list by type, category, and name, and can edit or soft-delete any item
  5. User can record incoming stock with quantity, date, and purchase cost, and see the stock level update immediately
**Plans**: 4 plans

Plans:
- [x] 01-01-PLAN.md — Scaffold Next.js, Prisma schema, Supabase Auth with RBAC, login, user management
- [x] 01-02-PLAN.md — Item CRUD with all four types, search/filter, SKU legend
- [x] 01-03-PLAN.md — Stock receiving with atomic ledger pattern, transaction history
- [x] 01-04-PLAN.md — Database migration, seed, and full end-to-end verification checkpoint

### Phase 2: Recipe Engine
**Goal**: Users can define multi-level recipes that link finished products to their ingredients (including sub-recipes and packaging) and see full cost breakdowns
**Depends on**: Phase 1
**Requirements**: RECP-01, RECP-02, RECP-03, RECP-04, RECP-05
**Success Criteria** (what must be TRUE):
  1. User can create a recipe for a finished product specifying ingredients with quantities (raw materials, semi-finished products, and packaging)
  2. User can define multi-level recipes where a finished product uses a semi-finished product that itself has a recipe of raw materials
  3. User can preview the full BOM breakdown showing every raw material and packaging item needed, resolved through all recipe levels
  4. System automatically calculates recipe cost by summing ingredient costs through all levels, and the cost updates when ingredient costs change
**Plans**: 2 plans

Plans:
- [ ] 02-01-PLAN.md — Prisma RecipeIngredient model, RLS migration, BOM explosion/cost logic, recipe Zod schema
- [ ] 02-02-PLAN.md — Recipe CRUD server actions, dynamic ingredient form, list/detail/BOM preview pages, sidebar navigation

### Phase 3: Sales and Auto-Deduction
**Goal**: Users can record sales (via CSV upload or manual entry) and the system automatically deducts raw materials from inventory based on recipe breakdowns
**Depends on**: Phase 2
**Requirements**: SALE-01, SALE-02, SALE-03, SALE-04
**Success Criteria** (what must be TRUE):
  1. User can upload a CSV or Excel file from POS export, preview the parsed data with validation errors highlighted, and confirm before processing
  2. User can manually enter individual sales when no POS export is available
  3. After sales are confirmed, system auto-deducts all raw materials and packaging from inventory by recursively exploding recipes through all BOM levels
  4. User can view sales history and see which uploaded files have been processed
**Plans**: 3 plans

Plans:
- [x] 03-01-PLAN.md — Prisma SalesUpload/SalesLine models, RLS migration, Zod schemas, processSalesLines server action with BOM deduction
- [x] 03-02-PLAN.md — CSV/Excel upload flow with PapaParse/SheetJS parsing, column mapping, validation preview, and confirm
- [x] 03-03-PLAN.md — Manual sales entry form, sales history pages, upload detail page, sidebar navigation

### Phase 4: Dashboard and Alerts
**Goal**: Users open the app and immediately see what needs attention -- low stock items, bestsellers, inventory value, and actionable reports
**Depends on**: Phase 3
**Requirements**: DASH-01, DASH-02, DASH-03, DASH-04, STCK-02
**Success Criteria** (what must be TRUE):
  1. Dashboard displays inventory summary including current stock levels, total inventory value, and count of items below threshold
  2. Dashboard shows bestseller products ranked by sales volume
  3. Dashboard recommends items to reorder (low/out of stock) and items to limit buying (surplus)
  4. User can generate sales reports filtered by date range, product, and category
  5. User can set a low stock threshold per item and see alerts on the dashboard when stock falls below it
**Plans**: 2 plans

Plans:
- [x] 04-01-PLAN.md — Dashboard server actions and main page with summary cards, bestsellers, low-stock alerts, reorder recommendations
- [x] 04-02-PLAN.md — Sales reports page with date range/product/category filters, date picker components, sidebar navigation

### Phase 5: Accuracy and Polish
**Goal**: Users can maintain data accuracy over time by recording waste, performing physical counts, and reconciling system vs reality
**Depends on**: Phase 4
**Requirements**: STCK-03, STCK-04
**Success Criteria** (what must be TRUE):
  1. User can record waste/spoilage events with a reason code and the stock level adjusts accordingly
  2. User can enter physical count numbers and view the variance between system-calculated levels and actual counts
  3. All stock adjustments (waste, reconciliation) appear in the transaction ledger with user, timestamp, and reason for full audit trail
**Plans**: 3 plans

Plans:
- [x] 05-01-PLAN.md — Waste recording with reason codes, atomic ledger deduction, form, and sidebar navigation
- [x] 05-02-PLAN.md — Physical count reconciliation with variance preview, batch adjustments, and sidebar navigation
- [ ] 05-03-PLAN.md — Gap closure: add user identity display to transaction history (audit trail completeness)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 4/4 | Complete | 2026-03-09 |
| 2. Recipe Engine | 0/2 | Complete    | 2026-03-10 |
| 3. Sales and Auto-Deduction | 0/3 | Complete    | 2026-03-10 |
| 4. Dashboard and Alerts | 2/2 | Complete    | 2026-03-10 |
| 5. Accuracy and Polish | 2/2 | Complete   | 2026-03-10 |
