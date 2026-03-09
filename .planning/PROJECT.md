# Ice Cream & Tea Inventory Management System

## What This Is

A cloud-hosted back-office inventory management system for an ice cream and tea shop. It tracks raw materials, semi-finished products, finished products, and packaging materials — with multi-level recipe breakdowns that auto-deduct stock when sales are recorded. Similar in concept to Marketman, but purpose-built for a single-store operation with a small team.

## Core Value

Know exactly how much stock is left and when to reorder — by automatically calculating raw material consumption from sales through multi-level recipes (finished product → semi-finished product → raw material).

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Multi-level item tracking (raw materials, semi-finished, finished, packaging)
- [ ] Weight-based inventory in grams with carton-to-unit conversion
- [ ] Multi-level recipe/BOM management (finished uses semi-finished + raw materials + packaging)
- [ ] Sales data upload via CSV/Excel from POS export + manual entry
- [ ] Auto-deduction of inventory from sales based on recipe breakdowns
- [ ] Low stock alerts with configurable thresholds per item
- [ ] Dashboard with sales reports, bestsellers, and reorder recommendations
- [ ] Role-based access (Admin, Staff/Encoder, Viewer)
- [ ] Stock receiving with quantity, date, and cost tracking
- [ ] Waste/spoilage recording and physical count reconciliation
- [ ] SKU legend for uniform item input
- [ ] Purchase cost tracking for margin analysis

### Out of Scope

- Multiple store locations — single store only for v1
- Supplier management — no supplier directory or PO generation
- Real-time POS integration — sales entered via upload or manual entry
- Mobile app — web-first, responsive design sufficient
- Customer-facing features — this is back-office only
- Barcode scanning — manual entry for v1

## Context

- Current POS is local-only with no inventory management capability
- Owner has no coding background — framework and stack must be simple to maintain and navigate
- Sales data comes from POS exports (CSV/Excel) and sometimes manual entry
- Single store location with a small team (admin + staff + viewers)
- Products include ice cream (uses semi-finished ice cream mix) and tea beverages
- Raw materials are ordered in cartons containing multiple units (e.g., 1 ctn = 8 cans of mango jam at 850g each = 6,800g)
- Packaging materials (400ml, 500ml, 700ml cups) need to be tracked per sale via recipes
- Key example chain: Sweet Non-Dairy Creamer (raw material) → Ice Cream Mix (semi-finished) → Ice Cream Product (finished) + Cup (packaging)

## Constraints

- **Tech stack**: Must be beginner-friendly, low-maintenance framework — owner has no coding experience
- **Hosting**: Cloud-hosted for accessibility from any device
- **Complexity**: UI must be simple and intuitive, avoid overwhelming dashboards
- **Budget**: Minimize ongoing hosting/infrastructure costs

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Cloud-hosted web app | Accessible from any device, no local server maintenance | — Pending |
| Weight tracking in grams | Standardized unit across all materials for accurate recipe calculations | — Pending |
| CSV/Excel upload for sales | Bridges gap between local POS and inventory system without integration | — Pending |
| Low stock thresholds (not predictive) | Simpler to set up and understand for v1 | — Pending |
| Three user roles | Balances access control with simplicity for small team | — Pending |

---
*Last updated: 2026-03-09 after initialization*
