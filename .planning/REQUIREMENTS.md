# Requirements: Ice Cream & Tea Inventory Management System

**Defined:** 2026-03-09
**Core Value:** Know exactly how much stock is left and when to reorder -- by automatically calculating raw material consumption from sales through multi-level recipes.

## v1 Requirements

### Item Management

- [x] **ITEM-01**: User can create items with type (raw material, semi-finished, finished, packaging)
- [x] **ITEM-02**: User can set unit weight in grams and carton conversion (e.g., 1 ctn = 8 units = 6,800g)
- [x] **ITEM-03**: User can view SKU legend with uniform format guide for consistent input
- [x] **ITEM-04**: User can set purchase cost per item for margin analysis
- [x] **ITEM-05**: User can edit and soft-delete items
- [x] **ITEM-06**: User can search and filter items by type, category, and name

### Recipe/BOM

- [x] **RECP-01**: User can create recipes linking finished products to their ingredients
- [x] **RECP-02**: User can define multi-level recipes (finished -> semi-finished -> raw materials)
- [x] **RECP-03**: User can include packaging materials (cups) as recipe ingredients with quantity
- [x] **RECP-04**: System auto-calculates recipe cost from ingredient costs through all levels
- [x] **RECP-05**: User can preview full BOM breakdown showing all raw materials across levels

### Stock Management

- [x] **STCK-01**: User can record incoming stock with quantity, date, and purchase cost
- [x] **STCK-02**: User can set low stock threshold per item and see alerts on dashboard
- [x] **STCK-03**: User can record waste/spoilage with reason codes
- [ ] **STCK-04**: User can enter physical counts and view variance against system levels
- [x] **STCK-05**: System maintains stock levels via append-only transaction ledger

### Sales

- [x] **SALE-01**: User can upload sales data via CSV or Excel file with validation and preview
- [x] **SALE-02**: User can manually enter sales when no export is available
- [x] **SALE-03**: System auto-deducts raw materials from inventory based on recipe breakdowns
- [x] **SALE-04**: User can view sales history and past uploaded files

### Dashboard & Reports

- [x] **DASH-01**: Dashboard displays inventory summary (stock levels, total value, low-stock count)
- [x] **DASH-02**: Dashboard prioritizes bestseller products by sales volume
- [x] **DASH-03**: Dashboard recommends stock items to buy surplus and items to limit buying
- [x] **DASH-04**: User can generate sales reports filtered by date range, product, and category

### Access Control

- [x] **AUTH-01**: User can log in with email and password
- [x] **AUTH-02**: System enforces 3 roles: Admin (full), Staff/Encoder (data entry), Viewer (read-only)
- [x] **AUTH-03**: Admin can add/remove users and assign roles

## v2 Requirements

### Notifications

- **NOTF-01**: User receives in-app notifications for low stock alerts
- **NOTF-02**: User receives email alerts for critical stock levels

### Batch Production

- **BTCH-01**: User can log batch production of semi-finished products
- **BTCH-02**: System tracks batch yields vs expected quantities

### Advanced Tracking

- **ADVT-01**: User can track expiration dates on received stock
- **ADVT-02**: System applies FEFO (First Expired, First Out) logic
- **ADVT-03**: User can view inventory value trends over time

### Visual Tools

- **VSTL-01**: User can explore recipe chains visually (if X runs out, what breaks?)
- **VSTL-02**: User can view ingredient dependency graph

## Out of Scope

| Feature | Reason |
|---------|--------|
| Multi-location support | Single store only -- architecture supports adding store_id later |
| Supplier management | No supplier directory or PO generation for v1 |
| Real-time POS integration | Sales entered via upload or manual -- no API integration |
| Mobile app | Web-first, responsive design sufficient |
| Barcode scanning | Manual entry for v1 |
| AI-powered predictions | Low stock thresholds sufficient for v1 |
| Customer-facing features | Back-office only |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1: Foundation | Complete |
| AUTH-02 | Phase 1: Foundation | Complete |
| AUTH-03 | Phase 1: Foundation | Complete |
| ITEM-01 | Phase 1: Foundation | Complete |
| ITEM-02 | Phase 1: Foundation | Complete |
| ITEM-03 | Phase 1: Foundation | Complete |
| ITEM-04 | Phase 1: Foundation | Complete |
| ITEM-05 | Phase 1: Foundation | Complete |
| ITEM-06 | Phase 1: Foundation | Complete |
| STCK-01 | Phase 1: Foundation | Complete |
| STCK-05 | Phase 1: Foundation | Complete |
| RECP-01 | Phase 2: Recipe Engine | Complete |
| RECP-02 | Phase 2: Recipe Engine | Complete |
| RECP-03 | Phase 2: Recipe Engine | Complete |
| RECP-04 | Phase 2: Recipe Engine | Complete |
| RECP-05 | Phase 2: Recipe Engine | Complete |
| SALE-01 | Phase 3: Sales and Auto-Deduction | Complete |
| SALE-02 | Phase 3: Sales and Auto-Deduction | Complete |
| SALE-03 | Phase 3: Sales and Auto-Deduction | Complete |
| SALE-04 | Phase 3: Sales and Auto-Deduction | Complete |
| DASH-01 | Phase 4: Dashboard and Alerts | Complete |
| DASH-02 | Phase 4: Dashboard and Alerts | Complete |
| DASH-03 | Phase 4: Dashboard and Alerts | Complete |
| DASH-04 | Phase 4: Dashboard and Alerts | Complete |
| STCK-02 | Phase 4: Dashboard and Alerts | Complete |
| STCK-03 | Phase 5: Accuracy and Polish | Complete |
| STCK-04 | Phase 5: Accuracy and Polish | Pending |

**Coverage:**
- v1 requirements: 27 total
- Mapped to phases: 27
- Unmapped: 0

---
*Requirements defined: 2026-03-09*
*Last updated: 2026-03-09 after roadmap creation*
