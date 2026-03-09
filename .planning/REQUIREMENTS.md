# Requirements: Ice Cream & Tea Inventory Management System

**Defined:** 2026-03-09
**Core Value:** Know exactly how much stock is left and when to reorder — by automatically calculating raw material consumption from sales through multi-level recipes.

## v1 Requirements

### Item Management

- [ ] **ITEM-01**: User can create items with type (raw material, semi-finished, finished, packaging)
- [ ] **ITEM-02**: User can set unit weight in grams and carton conversion (e.g., 1 ctn = 8 units = 6,800g)
- [ ] **ITEM-03**: User can view SKU legend with uniform format guide for consistent input
- [ ] **ITEM-04**: User can set purchase cost per item for margin analysis
- [ ] **ITEM-05**: User can edit and soft-delete items
- [ ] **ITEM-06**: User can search and filter items by type, category, and name

### Recipe/BOM

- [ ] **RECP-01**: User can create recipes linking finished products to their ingredients
- [ ] **RECP-02**: User can define multi-level recipes (finished → semi-finished → raw materials)
- [ ] **RECP-03**: User can include packaging materials (cups) as recipe ingredients with quantity
- [ ] **RECP-04**: System auto-calculates recipe cost from ingredient costs through all levels
- [ ] **RECP-05**: User can preview full BOM breakdown showing all raw materials across levels

### Stock Management

- [ ] **STCK-01**: User can record incoming stock with quantity, date, and purchase cost
- [ ] **STCK-02**: User can set low stock threshold per item and see alerts on dashboard
- [ ] **STCK-03**: User can record waste/spoilage with reason codes
- [ ] **STCK-04**: User can enter physical counts and view variance against system levels
- [ ] **STCK-05**: System maintains stock levels via append-only transaction ledger

### Sales

- [ ] **SALE-01**: User can upload sales data via CSV or Excel file with validation and preview
- [ ] **SALE-02**: User can manually enter sales when no export is available
- [ ] **SALE-03**: System auto-deducts raw materials from inventory based on recipe breakdowns
- [ ] **SALE-04**: User can view sales history and past uploaded files

### Dashboard & Reports

- [ ] **DASH-01**: Dashboard displays inventory summary (stock levels, total value, low-stock count)
- [ ] **DASH-02**: Dashboard prioritizes bestseller products by sales volume
- [ ] **DASH-03**: Dashboard recommends stock items to buy surplus and items to limit buying
- [ ] **DASH-04**: User can generate sales reports filtered by date range, product, and category

### Access Control

- [ ] **AUTH-01**: User can log in with email and password
- [ ] **AUTH-02**: System enforces 3 roles: Admin (full), Staff/Encoder (data entry), Viewer (read-only)
- [ ] **AUTH-03**: Admin can add/remove users and assign roles

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
| Multi-location support | Single store only — architecture supports adding store_id later |
| Supplier management | No supplier directory or PO generation for v1 |
| Real-time POS integration | Sales entered via upload or manual — no API integration |
| Mobile app | Web-first, responsive design sufficient |
| Barcode scanning | Manual entry for v1 |
| AI-powered predictions | Low stock thresholds sufficient for v1 |
| Customer-facing features | Back-office only |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| (populated during roadmap creation) | | |

**Coverage:**
- v1 requirements: 24 total
- Mapped to phases: 0
- Unmapped: 24 ⚠️

---
*Requirements defined: 2026-03-09*
*Last updated: 2026-03-09 after initial definition*
