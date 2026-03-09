# Feature Landscape

**Domain:** Food service inventory management (ice cream and tea shop, single-store)
**Researched:** 2026-03-09
**Overall confidence:** MEDIUM-HIGH (multiple competitor sources, industry guides, and domain-specific research corroborate findings)

## Table Stakes

Features users expect. Missing = product feels incomplete.

### Inventory Tracking Core

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Multi-category item management (raw materials, semi-finished, finished, packaging) | Every competitor separates inventory into categories. Without this, you cannot model the production chain from raw ingredient to sold product. | Med | The four-tier model (raw, semi-finished, finished, packaging) is correct for this domain. MarketMan, Restaurant365, and Apicbase all support hierarchical item types. |
| Stock level tracking with current quantity display | Fundamental purpose of any inventory system. Users open the app to answer "how much do I have?" | Low | Display in both base unit (grams) and purchase unit (cartons/cans). This dual-unit display is common in food inventory tools. |
| Stock receiving / goods receipt logging | Every tool includes a receiving workflow. Without it, there is no way to record inbound inventory. Users need to log date, quantity, supplier, and cost per delivery. | Low | Keep simple: date, item, quantity received, unit cost. Photo documentation of deliveries (like Xenia offers) is a differentiator, not table stakes. |
| Unit of measure conversion (carton to unit to grams) | Specific to food service where purchasing units differ from consumption units. Ice cream raw materials arrive in cartons (1 ctn = 8 cans x 850g), but recipes consume in grams. | Med | This is a critical data modeling decision. Store everything internally in base units (grams for weight, pieces for packaging) but allow entry in purchase units. Every serious food inventory tool handles this. |
| Manual stock adjustments | Staff need to correct quantities after breakage, spillage, or finding miscounted items. Every competitor supports this. | Low | Always require a reason code (spoilage, breakage, theft, correction, sampling). |

### Recipe / BOM Management

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Recipe creation with ingredient quantities | Core to food service inventory. Without recipes, you cannot auto-deduct stock from sales. MarketMan, Restaurant365, meez, Apicbase -- every competitor has this. | Med | A recipe ties a finished product to its ingredient list with quantities. Example: "Mango Ice Cream Scoop" uses 150g Ice Cream Mix + 1x 400ml Cup. |
| Sub-recipe / multi-level BOM support | The PROJECT.md explicitly requires this and competitors like MarketMan call it "recipe in recipe in recipe." Ice cream mix is a sub-recipe used by multiple finished products. Without this, users duplicate ingredients across recipes. | High | This is the hardest table-stakes feature. Must support at least 2 levels deep (finished -> semi-finished -> raw). Cost roll-up must cascade through levels. MarketMan, Restaurant365, and Apicbase all support this. |
| Recipe-based cost calculation | Every competitor calculates per-item food cost from recipe ingredients. This is how the owner answers "what does it cost me to make one Mango Ice Cream?" | Med | Must update when ingredient purchase prices change. Show cost per serving. This directly enables margin analysis. |
| Recipe-based auto-deduction from sales | The core value proposition of the system per PROJECT.md. When a sale is recorded, raw materials and packaging are automatically decremented based on recipe breakdown. MarketMan, xtraCHEF, Restaurant365 all do this via POS integration. | High | Since this project uses CSV upload instead of POS integration, the deduction happens at upload/entry time rather than real-time. Same logic, different trigger. |

### Sales Data Input

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| CSV/Excel upload for sales data | PROJECT.md specifies this as the bridge between the local POS and this system. Many free/small-business tools support CSV import as a baseline. | Med | Must handle common POS export formats. Need column mapping UI so the user can match their POS columns to system fields. Validate before committing. |
| Manual sales entry | Backup for when CSV is unavailable or for corrections. Every inventory system supports manual entry. | Low | Simple form: date, product, quantity sold. Should use same product list as recipes. |
| Sales history view | Users need to see what was recorded. Basic audit trail. | Low | Sortable/filterable list by date, product. Nothing fancy needed for v1. |

### Alerts and Notifications

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Low stock alerts with configurable thresholds | Every competitor has this. It is how the owner knows when to reorder without manually checking every item. MarketMan, Square, Restaurant365 all offer per-item threshold configuration. | Low | Set a minimum quantity per item. When current stock drops below it, surface the alert. Dashboard badge + list view is sufficient. Email/SMS notifications are a differentiator. |
| Out-of-stock indicators | Users need to see at a glance which items have hit zero. | Low | Visual indicator (red badge, filtered view) on the inventory list. |

### Reporting and Dashboard

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Inventory summary dashboard | Users expect a landing page showing key metrics: total items, low-stock count, inventory value, recent activity. Every competitor has this. | Med | KPIs to show: total inventory value, number of low-stock items, number of out-of-stock items, recent sales summary. Keep it simple per project constraints. |
| Stock level report (current inventory) | Exportable view of all items with current quantities and values. Basic functionality in every tool. | Low | Filterable by category (raw, semi-finished, finished, packaging). Show quantity in base unit and purchase unit. |
| Sales summary report | Show what sold, how much, over what time period. Enables the "bestsellers" requirement from PROJECT.md. | Med | Aggregate by product, time period. Show quantity sold, revenue if price data available, ingredient cost from recipes. |
| Cost of Goods Sold (COGS) report | Food cost is 25-40% of restaurant expenses. Knowing COGS is how the owner manages profitability. Every serious food inventory tool calculates this. | Med | COGS = Beginning Inventory + Purchases - Ending Inventory. Also calculable per-product via recipe costs. |

### Access Control

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Role-based access (Admin, Staff, Viewer) | PROJECT.md specifies three roles. Standard in every multi-user business tool. Prevents staff from modifying recipes or seeing cost data they should not. | Med | Admin: full access. Staff/Encoder: can enter sales, receiving, counts. Viewer: read-only dashboards and reports. |
| User authentication (login/logout) | Obvious requirement for any multi-user system. | Med | Email/password is sufficient. No need for SSO or social login for a small team. |

### Physical Count and Reconciliation

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Physical inventory count entry | Staff must be able to record what is actually on the shelf. This is how you catch variance from expected stock. Every competitor supports this. | Med | Count sheet workflow: select items, enter counted quantities. System compares to expected and shows variance. |
| Variance reporting (expected vs actual) | The "theoretical vs actual" comparison is a flagship feature of MarketMan, Restaurant365, and Crunchtime. Shows where stock is being lost to waste, theft, or inaccurate portioning. | Med | Show difference between system-calculated quantity and physical count. Allow adjustment to reconcile. Log the variance with reason. |

### Waste and Spoilage

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Waste/spoilage recording | PROJECT.md includes this. Industry best practice logs waste with date, item, quantity, and reason (expired, damaged, overproduction, prep error). Every competitor tracks waste. | Low | Simple form entry. Reason codes are important for later analysis. Deducts from inventory. |


## Differentiators

Features that set product apart from general-purpose tools. Not expected from a purpose-built single-store system, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Ice cream / tea domain-specific templates | Pre-built item categories, common ingredients, and sample recipes for ice cream and tea products. No competitor offers this -- they are all generic "restaurant." Saves hours of initial setup. | Low | Ship with sample data: common raw materials (cream base, sugar, flavorings, tea leaves, syrups, tapioca pearls), sample sub-recipes (ice cream mix), sample finished products. Owner can modify, not start from scratch. |
| Reorder quantity recommendations | Go beyond "low stock alert" to suggest how much to order based on recent consumption rate and lead time. MarketMan has this but most small-business tools do not. | Med | Calculate: average daily consumption x lead time days + safety stock - current stock = suggested order quantity. Very high value for a non-technical owner. |
| Packaging consumption tracking tied to recipes | Ice cream cups (400ml, 500ml, 700ml) are consumed per sale just like ingredients. Most restaurant tools focus on food ingredients only. Tracking packaging as a recipe component is uncommon. | Low | Already in PROJECT.md as a requirement. Model packaging as a category with per-piece tracking. Include in recipe BOM alongside ingredients. This is a genuine differentiator because most tools ignore packaging. |
| Visual recipe chain explorer | Show the full production chain graphically: Raw Material -> Sub-Recipe -> Finished Product -> Packaging. Helps the owner understand "if I run out of mango jam, which products are affected?" | Med | Dependency visualization. MarketMan does not surface this clearly. Very helpful for a production-focused operation where one sub-recipe feeds many products. |
| Batch production logging | Record when a batch of semi-finished product (e.g., ice cream mix) is produced, consuming raw materials. Then finished products consume from that batch. Adds production tracking to pure inventory. | Med | Not needed for v1 MVP but extremely valuable for an ice cream shop that produces mix in batches. Enables traceability and batch-level cost tracking. |
| Simplified margin analysis per product | Show selling price vs recipe cost per product, with margin percentage. Owner instantly sees which products are most/least profitable. | Low | Requires selling price data (from POS upload or manual entry) + recipe cost (already calculated). Simple subtraction. Very high value, low effort if recipe costing is already done. |
| Expiration date tracking with FEFO alerts | Track expiry dates on received items. Alert when items are approaching expiration. Apply First-Expired-First-Out logic. Reduces spoilage. | Med | Particularly relevant for dairy, cream bases, and fresh fruit used in ice cream and tea. Not all small-business tools include this. |
| Smart CSV column mapping with memory | Remember the column mapping from previous uploads so the owner does not re-map every time they upload sales data. Reduces friction for the primary data entry workflow. | Low | Store mapping configuration per user/source. Apply automatically on subsequent uploads. Small quality-of-life feature that compounds over time. |
| Inventory value trending over time | Show how total inventory value changes week over week. Helps owner spot over-ordering or depletion trends. | Low | Time-series chart of inventory value snapshots. Requires storing periodic snapshots or calculating from transaction history. |


## Anti-Features

Features to explicitly NOT build. These add complexity without value for this specific use case.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Multi-location support | PROJECT.md explicitly scopes to single store. Multi-location adds enormous complexity (inter-store transfers, location-specific pricing, HQ rollup). MarketMan's multi-location is their enterprise pitch -- not relevant here. | Design data model to not preclude future multi-location, but do not build any UI or logic for it. |
| Supplier directory and purchase order generation | Out of scope per PROJECT.md. MarketMan's supplier integration is a major feature, but this shop has a small, stable supplier base. PO generation adds procurement workflow complexity. | Record supplier name as a text field on receiving records. No supplier entity management, no PO workflow. |
| Real-time POS integration | Out of scope per PROJECT.md. POS is local-only. Building real-time integration requires API adapters, webhook handling, and error recovery for each POS system. Massive complexity. | CSV/Excel upload is the correct approach. It is the same data, just batch-processed. |
| AI-powered features (demand forecasting, AI recipe generation, predictive ordering) | MarketMan is pushing AI features hard in 2025-2026. These require significant data volume and ML infrastructure. A single small store does not generate enough data to train useful models, and the complexity is enormous. | Simple threshold alerts and consumption-rate-based reorder suggestions are more reliable for a small operation. |
| Invoice OCR / photo scanning | xtraCHEF and MarketMan offer invoice scanning. This requires ML/OCR infrastructure and is overkill for a single store that can enter a few receiving records manually. | Manual receiving entry. The volume is low enough that automation would cost more than time saved. |
| Barcode scanning | Out of scope per PROJECT.md. Requires camera integration, barcode database, and hardware considerations. Not justified for the item volume of a single ice cream/tea shop. | SKU legend (already in PROJECT.md) for uniform item identification. Manual selection from a searchable dropdown. |
| Accounting integration (QuickBooks, Xero) | Restaurant365 positions itself as inventory + accounting. This shop likely uses simple bookkeeping. Building accounting integrations adds API complexity and ongoing maintenance. | Export reports as CSV/PDF that can be handed to an accountant or entered into any bookkeeping tool. |
| Mobile native app | Out of scope per PROJECT.md. Web-first with responsive design covers tablet and phone access. A native app requires separate codebase, app store management, and update cycles. | Responsive web design. Test on mobile screen sizes. PWA capability is acceptable if offline access is needed later. |
| Complex permission granularity | Some enterprise tools offer feature-by-feature permission matrices. Three roles (Admin, Staff, Viewer) are sufficient for a small team. | Stick with three fixed roles. Do not build a permission editor UI. |
| Allergen tracking | MarketMan offers allergen management. This is a compliance feature for customer-facing menus. This system is back-office only -- the owner already knows the allergen profile of their products. | Not applicable to back-office inventory management for a single owner-operated shop. |
| Menu engineering / menu design | Some tools combine inventory with menu layout and pricing optimization. This is a customer-facing concern outside the scope of a back-office system. | Margin analysis per product covers the business insight need. Leave menu design to other tools. |


## Feature Dependencies

```
Authentication/Roles -> All other features (gating access)

Item Management (categories, units, SKUs) -> Everything below
  |
  +-> Recipe Management (needs items to reference)
  |     |
  |     +-> Sub-Recipe Support (recipes referencing other recipes)
  |     |     |
  |     |     +-> Recipe Cost Calculation (rolls up through sub-recipes)
  |     |           |
  |     |           +-> Margin Analysis (needs recipe cost + selling price)
  |     |           +-> COGS Reporting (needs cost data)
  |     |
  |     +-> Auto-Deduction Logic (needs recipes to calculate deductions)
  |           |
  |           +-> Sales Data Upload/Entry (triggers auto-deduction)
  |                 |
  |                 +-> Sales Reports / Bestsellers
  |                 +-> Inventory Value Trending
  |
  +-> Stock Receiving (records inbound inventory)
  |     |
  |     +-> Purchase Cost Tracking (captures per-unit cost at receiving)
  |           |
  |           +-> Recipe Cost Calculation (uses latest purchase costs)
  |
  +-> Low Stock Alerts (needs current quantities + thresholds)
  |     |
  |     +-> Reorder Recommendations (needs consumption rate + lead time + alert thresholds)
  |
  +-> Waste/Spoilage Recording (deducts from inventory, needs items)
  |
  +-> Physical Count Entry (needs items to count against)
        |
        +-> Variance Reporting (needs expected quantity from system + counted quantity)

Dashboard -> Depends on inventory data, sales data, alerts all being populated
```


## MVP Recommendation

Prioritize (build in this order):

1. **Authentication and role-based access** -- Gate all functionality. Simple but foundational. Without it, nothing else is usable in a multi-user context.

2. **Item management with categories and unit conversion** -- The data foundation. Every other feature references items. Get the data model right: four categories, base units (grams/pieces), purchase unit conversion factors. Include SKU legend.

3. **Recipe and sub-recipe management with cost calculation** -- The hardest table-stakes feature and the core value proposition. If multi-level BOM does not work, the entire auto-deduction chain breaks. Build and validate thoroughly before moving on.

4. **Stock receiving with cost tracking** -- Populates inventory and establishes purchase costs that feed into recipe costing. Simple form but critical data entry path.

5. **Sales data upload (CSV) and manual entry with auto-deduction** -- The primary workflow loop. Upload sales, watch inventory decrement. This is the moment the system proves its value.

6. **Low stock alerts and dashboard** -- The payoff. Owner opens the app and immediately sees what needs attention. Alerts drive the reorder action.

7. **Waste/spoilage recording and physical count reconciliation** -- Housekeeping features that maintain data accuracy over time. Important but not needed for initial value demonstration.

8. **Reports (COGS, sales summary, bestsellers, margin analysis)** -- The analytical layer built on all the transactional data above. Defer until transactions are flowing reliably.

**Defer to post-MVP:**
- Reorder quantity recommendations: Needs consumption history to be useful. Ship after 4-6 weeks of sales data accumulation.
- Batch production logging: Valuable but adds workflow complexity. Ship after core loop is validated.
- Expiration date tracking: Nice to have. Can add to receiving workflow later without data model changes if expiry date field is included early.
- Visual recipe chain explorer: Impressive but not essential for daily operations. Build when core system is stable.
- Inventory value trending: Needs time-series data. Naturally becomes possible after weeks of operation.

**Domain-specific templates (ice cream/tea sample data):** Ship with MVP. Low effort, high onboarding value. Pre-populate sample items, sub-recipes, and finished products so the owner sees a working system immediately and modifies rather than builds from scratch.


## Sources

- [MarketMan Features](https://www.marketman.com/platform/restaurant-management-software) -- MEDIUM confidence, official product page
- [MarketMan Restaurant Inventory Guide 2025](https://www.marketman.com/blog/restaurant-inventory-software-the-ultimate-guide-to-smarter-inventory-management-in-2025) -- MEDIUM confidence, vendor blog
- [6 Best Restaurant Inventory Software 2026 (Xenia)](https://www.xenia.team/articles/best-restaurant-inventory-management-software) -- MEDIUM confidence, cross-vendor comparison
- [Restaurant Inventory Management Best Practices (Supy)](https://supy.io/blog/restaurant-inventory-management-best-practices-a-complete-2025-guide-for-managers) -- MEDIUM confidence, industry guide
- [Restaurant COGS Guide (Back Office)](https://bepbackoffice.com/blog/cost-of-goods-cogs-guide-optimizing-food-costs-for-success/) -- MEDIUM confidence, industry guide
- [Ice Cream Inventory Management Tips (Toyaja)](https://toyaja.com/inventory-management-tips-for-ice-cream-businesses/) -- LOW confidence, single domain-specific source
- [Tea Shop Inventory Management (Toast)](https://pos.toasttab.com/blog/on-the-line/tea-shop-inventory-management) -- MEDIUM confidence, major POS vendor blog
- [Restaurant Waste and Spoilage Tracking (Taqtics)](https://taqtics.co/restaurant-operations/restaurant-waste-spoilage-tracking/) -- LOW confidence, single source
- [Restaurant365 Food Service Inventory](https://www.restaurant365.com/blog/food-service-inventory-management-cut-costs-and-gain-control/) -- MEDIUM confidence, competitor product page
- [MarketMan Recipe Management](https://www.marketman.com/page/recipe-management-software) -- MEDIUM confidence, official product page
- [Restaurant Inventory Management (NetSuite)](https://www.netsuite.com/portal/resource/articles/inventory-management/restaurant-inventory-management.shtml) -- MEDIUM confidence, enterprise vendor guide
- [Marketman 2026 Pricing & Features (GetApp)](https://www.getapp.com/operations-management-software/a/marketman-restaurant-inventory/) -- MEDIUM confidence, review aggregator
