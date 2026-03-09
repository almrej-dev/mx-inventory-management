# Pitfalls Research

**Domain:** Food service inventory management (ice cream & tea shop)
**Researched:** 2026-03-09
**Confidence:** HIGH (domain-specific, multi-source verified)

## Critical Pitfalls

### Pitfall 1: Floating-Point Corruption in Weight-Based Calculations

**What goes wrong:**
Using JavaScript `number` (IEEE 754 float) or database `FLOAT`/`REAL` columns for gram weights and costs. A recipe chain like Sweet Non-Dairy Creamer (raw, 6800g carton) -> Ice Cream Mix (semi-finished, uses 340g) -> Ice Cream Product (finished, uses 200g mix + 1 cup) accumulates rounding errors at each level. After hundreds of sales deductions, the system reports -0.0000000001g stock or costs that drift by cents per unit -- multiplied across thousands of transactions, the books stop balancing.

**Why it happens:**
Developers default to `FLOAT` for "numbers with decimals." JavaScript has no native decimal type, so `0.1 + 0.2 !== 0.3` in every calculation. In a multi-level recipe chain with 3 levels of BOM resolution, errors compound at each level.

**How to avoid:**
- Store all weights as integers in milligrams (1g = 1000mg). A 6800g carton = 6,800,000mg. Integer arithmetic is exact.
- Store all monetary values as integers in centavos (PHP 1.00 = 100 centavos). No floating point touches money or weight.
- Use PostgreSQL `NUMERIC(12,2)` or `INTEGER` for database columns -- never `FLOAT`, `REAL`, or `DOUBLE PRECISION` for weights or costs.
- Only convert to human-readable grams/pesos at the display layer, never during calculation.

**Warning signs:**
- Stock quantities showing as `-0.00` or `0.01` after full deduction
- Cost reports showing 1-2 centavo discrepancies that grow over time
- Physical count reconciliation showing tiny but consistent variances in high-turnover items

**Phase to address:**
Database schema design (Phase 1 / Foundation). This must be right from the start -- retrofitting integer storage after data exists requires a data migration.

---

### Pitfall 2: Flat Recipe Model That Cannot Handle Multi-Level BOM

**What goes wrong:**
Designing recipes as a simple two-level lookup: "Product X uses [list of raw materials]." This works for tea (tea powder + water + sugar + cup), but breaks for ice cream where a finished product uses a semi-finished product (ice cream mix) which itself uses raw materials. The system either cannot represent the chain, or developers hack around it with duplicate data -- listing the raw materials of the ice cream mix directly on every ice cream product that uses it.

**Why it happens:**
Developers build for the simple case first and assume they can add depth later. But a flat `recipe_items` table with `product_id` and `material_id` cannot express that the "material" is itself a product with its own recipe. By the time this is discovered, the data model is baked into every query, every deduction calculation, and every report.

**How to avoid:**
- Design the item table with a `category` enum: `raw_material`, `semi_finished`, `finished`, `packaging`. All are "items" in the same table.
- The recipe/BOM table references `parent_item_id` and `child_item_id` -- both pointing to the items table. A semi-finished item can be a child of a finished item AND a parent of raw materials.
- Implement recursive BOM resolution (walk the tree to leaf nodes) from day one. In SQL, this is a recursive CTE. In application code, it is a depth-first traversal with cycle detection.
- Limit depth to a reasonable maximum (3-4 levels) with a hard check to prevent infinite recursion from circular references.

**Warning signs:**
- Schema has separate tables for "products" and "materials" that cannot reference each other
- Recipe editing UI has no concept of "this ingredient is itself a recipe"
- Deduction logic has hardcoded assumptions about exactly 2 levels

**Phase to address:**
Data modeling (Phase 1 / Foundation). The recursive item-recipe structure is the core of the entire system. Everything else depends on it.

---

### Pitfall 3: CSV/Excel Import Without Defensive Parsing

**What goes wrong:**
The POS exports CSV files. The system expects a fixed format. But POS systems are notorious for inconsistent exports: delimiter changes (comma vs semicolon depending on locale), date format shifts (MM/DD/YYYY vs DD/MM/YYYY), Excel auto-converting product codes to numbers (dropping leading zeros), encoding mismatches (UTF-8 vs Windows-1252 garbling item names with special characters), and empty rows or shifted columns from manual edits. One bad import silently creates incorrect sales records, which cascade into wrong inventory deductions across every recipe in the system.

**Why it happens:**
Developers test with one sample CSV file from the POS and hard-code parsing assumptions. The POS system updates, the export format changes slightly, or the owner edits the file in Excel before uploading (Excel silently modifies dates, numbers, and encoding on save). Nobody notices until the stock counts stop matching reality.

**How to avoid:**
- Never trust input. Validate every row: required fields present, numeric fields are numeric, dates parse correctly, quantities are positive, item codes match known SKUs.
- Show a preview screen before committing: "We found 47 sales records. 3 rows had errors (shown in red). Import the 44 valid rows?"
- Support flexible date parsing (try multiple formats, but flag ambiguous dates like 03/04/2026).
- Detect delimiter automatically (comma vs semicolon vs tab) by analyzing the first few lines.
- Store the original uploaded file as-is for audit/debugging. Never discard the source.
- Reject duplicate imports: hash the file content or check for overlapping date ranges with existing imported data.
- Handle Excel files (.xlsx) directly rather than requiring CSV conversion -- this avoids the Excel-mangles-CSV problem entirely.

**Warning signs:**
- Import silently succeeds with 0 errors but stock levels drift from reality
- Date-based reports show sales on impossible dates (month/day swapped)
- Items with numeric-looking codes (e.g., "007") appear as "7" after import

**Phase to address:**
Sales data import feature (Phase 2-3). But the SKU/item master list must exist first (Phase 1), because import validation depends on matching against known items.

---

### Pitfall 4: Deduction Without Atomicity Creates Ghost Inventory

**What goes wrong:**
Two staff members upload sales CSVs at the same time, or one uploads while another does a manual stock adjustment. The deduction logic reads current stock (1000g), calculates the deduction (200g), then writes the new value (800g). But the other process also read 1000g, deducts 150g, and writes 850g. Result: the system shows 850g when it should show 650g. 350g of inventory has vanished from tracking -- or worse, stock goes negative when it should not.

**Why it happens:**
Developers build the read-calculate-write pattern without database transactions or row-level locking. This is fine during solo testing, but breaks the moment two users interact with inventory simultaneously. Even "small team" scenarios trigger this: owner uploads sales while staff records waste.

**How to avoid:**
- Wrap all inventory mutations in database transactions with row-level locking (`SELECT ... FOR UPDATE` in PostgreSQL).
- Use a ledger/journal pattern: never update a stock quantity directly. Instead, insert transaction records (received +500g, sold -200g, waste -50g) and calculate current stock as the sum of all transactions. This is append-only and naturally handles concurrency.
- If using direct quantity updates, use atomic operations: `UPDATE items SET quantity = quantity - $deduction WHERE id = $id AND quantity >= $deduction` (the WHERE clause prevents negative stock).
- Process batch imports sequentially within a single transaction, not as parallel individual operations.

**Warning signs:**
- Stock levels occasionally jump up unexpectedly after being correct
- Physical counts consistently show less stock than the system reports
- Two users report different stock levels for the same item at the same time

**Phase to address:**
Inventory deduction engine (Phase 2). The ledger pattern should be chosen at data model time (Phase 1), but the concurrency protection must be implemented when deduction logic is built.

---

### Pitfall 5: Unit Conversion Chaos Between Ordering and Usage

**What goes wrong:**
Raw materials are purchased in cartons (1 ctn = 8 cans of mango jam at 850g each = 6,800g), tracked in grams for recipe usage, and reordered in cartons. The system either loses the carton-to-gram mapping, or conversions are inconsistent across features: receiving shows cartons, recipes show grams, but the low-stock alert compares grams against a threshold that someone accidentally set in cartons. The owner orders 2 cartons thinking they are low (threshold was "2" meaning "2 cartons") but the system meant "2 grams" -- or vice versa.

**Why it happens:**
Unit conversion seems simple: just multiply. But the mapping must be consistent everywhere: receiving, recipes, stock display, alerts, and reports. Developers implement it in one place but forget another. The owner sets a reorder threshold but the UI does not clearly state the unit. Multiple units of measure for the same item creates ambiguity that compounds over time.

**How to avoid:**
- Store everything internally in a single canonical unit: grams for weight, pieces for packaging. No exceptions.
- The item master stores the conversion factor: `carton_to_base_unit = 6800` (1 ctn = 6800g).
- Receiving accepts input in cartons and converts to grams on save: `received_grams = cartons * carton_to_base_unit`.
- Reorder thresholds are always stored and compared in grams. The UI can display "equivalent to X cartons" as a convenience, but the threshold value is grams.
- Every screen that shows a quantity MUST display the unit label next to the number. Never show a bare number.
- Validate: if someone enters a reorder threshold of "2" for mango jam, prompt "2 grams (very low -- did you mean 2 cartons = 13,600g?)".

**Warning signs:**
- Reorder alerts fire at nonsensical times (way too early or after stockout)
- Receiving quantities do not match what the stock report shows
- Owner says "I ordered 5 cartons but the system only added 5 to inventory" (5 grams instead of 34,000g)

**Phase to address:**
Item master and receiving (Phase 1-2). The unit conversion model must be in the data schema from the start. Receiving is the first feature that exercises it.

---

### Pitfall 6: No Recipe Versioning Causes Silent Calculation Drift

**What goes wrong:**
The owner changes a recipe -- the ice cream mix now uses 300g of creamer instead of 340g. All existing sales records were deducted using the old recipe. Future deductions use the new recipe. But if anyone re-runs a report for last month, or if the system recalculates stock from transaction history, it uses the current recipe -- retroactively changing what "should have been" deducted. Stock reconciliation becomes impossible because the system's version of history keeps changing.

**Why it happens:**
Recipes are stored as mutable rows. Updating a recipe changes it for all past, present, and future calculations. Developers do not think about temporal correctness until the owner asks "why does last month's report show different numbers than it did last month?"

**How to avoid:**
- Recipes are versioned. Changing a recipe creates a new version. The old version remains for historical reference.
- Each sale/deduction record stores the recipe version ID it was calculated against, not just the product ID.
- Reports use the recipe version that was active at the time of the transaction, not the current version.
- Alternatively (simpler for v1): snapshot the BOM breakdown at deduction time. Store the actual grams deducted per ingredient on each transaction record. Then recipe changes cannot alter history because history stores absolute values, not references.

**Warning signs:**
- Month-over-month reports show different values when re-generated
- Stock reconciliation after a recipe change shows a sudden unexplained variance
- Owner changes a recipe and all historical cost calculations shift

**Phase to address:**
Recipe management and deduction engine (Phase 2). The deduction transaction record must capture enough detail that it is self-contained and independent of future recipe changes.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Direct stock quantity column (no ledger) | Simpler queries, faster reads | Cannot audit how stock arrived at current value, concurrency issues, no undo capability | Never for this project -- the ledger is essential for reconciliation |
| Storing weights as floats | No conversion code needed | Accumulated rounding errors corrupt inventory accuracy | Never -- use integer milligrams |
| Hardcoding CSV format | Faster initial development | Breaks when POS updates export format or owner switches POS | Only in prototype -- add flexible parsing before first real use |
| Skipping recipe versioning | Simpler data model | Historical reports become unreliable, reconciliation breaks | Acceptable in MVP if deduction transactions store snapshot values |
| Single "admin" account for everyone | No auth system to build | No audit trail of who did what, no access control | Never -- at minimum distinguish admin from staff from viewer |
| Calculating stock on-the-fly from all transactions | Always accurate | Slow queries as transaction count grows into thousands | Acceptable in v1 with <10K transactions, add materialized snapshots in v2 |

## Integration Gotchas

Common mistakes when connecting to external services and data sources.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| POS CSV import | Assuming format never changes | Store format config (column mapping, delimiter, date format) as editable settings, not hardcoded |
| POS CSV import | No duplicate detection | Hash file contents or check date-range overlap; reject or warn on re-import of same data |
| Excel file handling | Requiring CSV conversion (Excel mangles data on save-as-CSV) | Parse .xlsx directly using a library like SheetJS/xlsx; preserve original data types |
| Future POS API (if ever) | Building tight coupling to one POS vendor's API | Use an adapter/interface pattern so the import source is swappable |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Recursive BOM resolution on every stock query | Dashboard takes 5+ seconds to load | Cache resolved BOMs; invalidate only when recipe changes | ~500+ products with 3-level recipes |
| Calculating current stock by summing all historical transactions | Stock page load time increases linearly with usage history | Periodic stock snapshots (e.g., nightly) plus sum of transactions since snapshot | ~10,000+ transaction records |
| Loading full transaction history for reports | Report generation times out | Paginate, filter by date range, use database indexes on date columns | ~50,000+ transaction records |
| CSV import processing all rows synchronously in a single request | Browser times out on large uploads | Process imports in background (job queue), show progress, allow cancellation | ~1,000+ rows per import file |
| No database indexes on foreign keys | Queries joining items-recipes-transactions slow down | Add indexes on all foreign key columns and frequently filtered columns (date, item_id) from the start | ~10,000+ rows in any table |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| No audit log for stock adjustments | Staff can adjust stock to hide theft or waste with no trail | Log every mutation: who, when, what, old value, new value, reason |
| CSV upload without file size/type validation | Malicious file upload or accidental 500MB file crashes server | Validate file extension (.csv, .xlsx only), enforce max file size (5MB), scan content before parsing |
| Role-based access without action logging | Admin role can delete data without accountability | Log all destructive actions (deletes, bulk edits, recipe changes) with user ID and timestamp |
| Exposing cost/margin data to all roles | Staff see supplier costs and profit margins they should not | Cost data visible only to Admin role; Staff/Encoder sees quantities only |
| No rate limiting on import endpoint | Accidental or intentional repeated uploads flood the system | Limit imports to N per hour per user; require confirmation before processing |

## UX Pitfalls

Common user experience mistakes in this domain, especially critical given the non-technical owner.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Showing stock only in grams with no carton equivalent | Owner thinks in cartons for ordering, must mentally divide 6800 every time | Show "6,800g (1 carton)" or allow toggle between display units |
| Requiring exact SKU codes for manual entry | Staff misspells codes, creates duplicate items or failed entries | Searchable dropdown with autocomplete; show recent/frequent items |
| No confirmation before destructive actions | Owner accidentally deletes a recipe or imports wrong file | Confirm dialogs for deletes, imports, and bulk operations; implement soft-delete |
| Overwhelming dashboard with all metrics at once | Non-technical owner cannot find what matters | Start with 3-4 key metrics: low stock alerts, today's sales, top items. Advanced reports on separate pages |
| Error messages showing technical details | "UNIQUE constraint violation on sku_code" means nothing to the owner | Human-readable: "An item with this code already exists. Did you mean to update it?" |
| No undo for common operations | Imported wrong file, deducted from wrong product, entered wrong count | Allow reversing recent imports (within 24h); stock adjustment corrections as counter-entries |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Recipe management:** Often missing circular reference detection -- verify that item A cannot use item B which uses item A (infinite recursion)
- [ ] **CSV import:** Often missing duplicate detection -- verify that importing the same file twice does not double-deduct inventory
- [ ] **Stock deduction:** Often missing partial deduction handling -- verify what happens when stock is insufficient (reject sale? allow negative? warn?)
- [ ] **Low stock alerts:** Often missing unit clarity -- verify the alert shows both the threshold and current stock in the same unit with labels
- [ ] **Physical count reconciliation:** Often missing variance recording -- verify the system logs the difference between counted and expected, not just overwrites the value
- [ ] **Reports:** Often missing date range filtering -- verify that "this month" respects timezone and does not cut off the last day
- [ ] **User roles:** Often missing the Viewer role -- verify that Viewers truly cannot modify any data, not just that the buttons are hidden (API must enforce too)
- [ ] **Receiving:** Often missing the carton-to-gram conversion step -- verify that entering "2 cartons" of mango jam adds 13,600g to inventory, not 2g

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Float corruption in weights | HIGH | Export all data, create new integer columns, migrate with rounding policy, recalculate all stock from transaction history |
| Flat recipe model (no multi-level) | HIGH | Redesign schema, merge separate product/material tables into unified item table, rebuild all recipes, rewrite deduction logic |
| Bad CSV import poisoned inventory | MEDIUM | Identify bad import batch by timestamp, reverse all deductions from that batch, re-import with corrected data |
| Race condition caused wrong stock levels | MEDIUM | Run full stock recalculation from transaction ledger (only works if using ledger pattern), do physical count to verify |
| Unit conversion errors in thresholds | LOW | Audit all reorder thresholds, correct unit values, add unit labels to prevent recurrence |
| Recipe change broke historical reports | MEDIUM | If deduction snapshots exist: no action needed. If not: reports for the affected period are permanently inaccurate, document and move forward |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Float corruption | Phase 1 (Schema design) | All weight columns use INTEGER (milligrams); all cost columns use INTEGER (centavos); no FLOAT/REAL in schema |
| Flat recipe model | Phase 1 (Data model) | Items table has category enum; recipe table uses self-referencing item IDs; recursive CTE query resolves full BOM |
| CSV import fragility | Phase 2-3 (Import feature) | Import tested with: wrong delimiter, swapped date format, duplicate file, missing columns, Excel-mangled numbers |
| Concurrency / ghost inventory | Phase 2 (Deduction engine) | Simultaneous import test: two uploads at once must produce correct total deduction, no negative stock |
| Unit conversion chaos | Phase 1-2 (Item master + Receiving) | Entering 2 cartons of mango jam shows 13,600g added; reorder threshold set to 2 cartons stores as 13,600g internally |
| Recipe versioning | Phase 2 (Deduction engine) | Change a recipe, re-run last month's report: numbers must match original report, not recalculate with new recipe |
| No audit trail | Phase 1 (Schema) + Phase 2 (Logic) | Every stock mutation has a transaction record with user_id, timestamp, type, quantity, and optional reason |
| UX overwhelming non-technical owner | Every phase | Owner can complete core tasks (check stock, see alerts, upload sales) without reading documentation or asking for help |

## Sources

- [NetSuite - Restaurant Inventory Management Guide](https://www.netsuite.com/portal/resource/articles/inventory-management/restaurant-inventory-management.shtml)
- [Lightspeed - Restaurant Food Inventory Management](https://www.lightspeedhq.com/blog/restaurant-food-inventory-management/)
- [WISK - Restaurant Inventory Management 101](https://www.wisk.ai/blog/restaurant-inventory-management-101)
- [Katana - Multilevel BOMs Explained](https://katanamrp.com/blog/multi-level-bom/)
- [Bistodio - BOM for Food Industry](https://bistodio.com/what-is-a-bill-of-materials-bom-for-the-food-industry/)
- [Crunchy Data - Working with Money in Postgres](https://www.crunchydata.com/blog/working-with-money-in-postgres)
- [PostgreSQL Docs - Numeric Types](https://www.postgresql.org/docs/current/datatype-numeric.html)
- [Flatfile - Top 6 CSV Import Errors](https://flatfile.com/blog/top-6-csv-import-errors-and-how-to-fix-them/)
- [DataFlowMapper - Data Validation for CSV/Excel](https://dataflowmapper.com/blog/mastering-data-validation-imports)
- [Toyaja - Inventory Tips for Ice Cream Shops](https://toyaja.com/inventory-management-tips-for-ice-cream-businesses/)
- [Finamac - Preventing Ice Cream Waste](https://blog.finamac.com/en/preventing-ice-cream-waste-in-ice-cream-shops/)
- [NetSuite - Physical Counts Inventory](https://www.netsuite.com/portal/resource/articles/inventory-management/physical-counts-inventory.shtml)
- [NetSuite - Inventory Discrepancies](https://www.netsuite.com/portal/resource/articles/inventory-management/inventory-discrepancies.shtml)
- [Food Manufacturing - Recipe Management Guide](https://www.foodmanufacturing.com/home/article/22945538/recipe-management-guide-for-growing-food-manufacturers)
- [Paytronix - Recipe Management Software Challenges](https://www.paytronix.com/blog/recipe-management-software)
- [Medium - Race Conditions in Inventory Systems](https://medium.com/@ahmedmaher22292/fixing-race-conditions-in-inventory-systems-spring-boot-00f5d9b3cbb1)
- [WooCommerce - Negative Inventory Issue](https://github.com/woocommerce/woocommerce/issues/44273)
- [CyberStockroom - Implementing New Inventory Management](https://blog.cyberstockroom.com/2026/03/05/implementing-a-new-inventory-management-system-tips-for-a-smooth-transition/)

---
*Pitfalls research for: Ice cream & tea shop inventory management system*
*Researched: 2026-03-09*
