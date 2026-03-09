# Architecture Patterns

**Domain:** Food service inventory management (ice cream & tea shop)
**Researched:** 2026-03-09
**Confidence:** HIGH (well-established domain patterns, verified across multiple sources)

## Recommended Architecture

**Modular monolith with layered separation** -- NOT microservices.

This is a single-store, small-team, back-office system. Microservices add deployment complexity, operational overhead, and network latency for zero benefit at this scale. A monolith with clear internal module boundaries gives all the organizational benefits (separation of concerns, testability, independent reasoning about components) without the infrastructure tax.

The system decomposes into six functional modules inside a single deployable application, backed by a single relational database.

```
+------------------------------------------------------------------+
|                     PRESENTATION LAYER                            |
|  Dashboard | Items | Recipes | Sales Upload | Reports | Admin    |
+------------------------------------------------------------------+
        |                    |                    |
+------------------------------------------------------------------+
|                     APPLICATION LAYER                             |
|  ItemService | RecipeService | SalesService | DeductionEngine    |
|  ReportService | StockAlertService | AuthService                 |
+------------------------------------------------------------------+
        |                    |                    |
+------------------------------------------------------------------+
|                      DOMAIN LAYER                                 |
|  Item (raw/semi/finished/packaging) | Recipe (multi-level BOM)   |
|  SalesRecord | InventoryTransaction | StockLevel | User/Role     |
+------------------------------------------------------------------+
        |                    |                    |
+------------------------------------------------------------------+
|                   DATA ACCESS LAYER                               |
|  ItemRepository | RecipeRepository | TransactionRepository       |
|  SalesRepository | UserRepository                                |
+------------------------------------------------------------------+
        |
+------------------------------------------------------------------+
|                      DATABASE                                     |
|  PostgreSQL (single instance)                                    |
+------------------------------------------------------------------+
```

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **Item Management** | CRUD for all item types (raw material, semi-finished, finished, packaging). Manages SKUs, unit conversions (carton-to-gram), categories, and stock thresholds. | Recipe Management (items are BOM ingredients), Stock Engine (stock levels) |
| **Recipe/BOM Management** | Defines multi-level recipes linking finished products to semi-finished products, raw materials, and packaging. Each recipe specifies ingredient quantities in grams or units. | Item Management (reads item data), Deduction Engine (provides BOM trees for explosion) |
| **Sales Ingestion** | Accepts CSV/Excel uploads from POS exports and manual sales entry. Parses, validates, maps product names to internal SKUs, and queues sales records for deduction. | Deduction Engine (triggers auto-deduction), Item Management (SKU lookup/validation) |
| **Deduction Engine** | Core business logic. Takes sales records, explodes multi-level BOMs recursively, calculates raw material consumption, and creates inventory transactions that reduce stock. | Recipe/BOM Management (reads BOM trees), Stock Engine (writes deductions), Sales Ingestion (receives triggers) |
| **Stock Engine** | Maintains current stock levels. Handles receiving (additions), deductions, waste/spoilage, and physical count reconciliation. Fires low-stock alerts when thresholds are crossed. | Item Management (thresholds), Deduction Engine (receives deductions), Reporting (provides stock data) |
| **Reporting & Dashboard** | Aggregates data for sales reports, bestseller analysis, reorder recommendations, margin analysis, and stock status views. Read-only queries against transaction history. | Stock Engine (current levels), Sales Ingestion (sales data), Item Management (cost data) |
| **Auth & Access Control** | Role-based access (Admin, Staff/Encoder, Viewer). Admin manages users and all settings. Staff enters data. Viewer sees reports only. | All components (permission gates) |

### Data Flow

**Primary flow: Sales Upload to Stock Deduction**

This is the critical path -- the core value proposition of the system.

```
1. USER uploads CSV/Excel file (POS export)
   |
2. SALES INGESTION parses file
   --> validates columns (product name, quantity, date)
   --> maps product names to internal SKUs via SKU legend
   --> flags unmapped/invalid rows for user correction
   --> creates SalesRecord entries
   |
3. DEDUCTION ENGINE processes each SalesRecord
   --> for each sold item:
       a. Look up finished product's Recipe/BOM
       b. EXPLODE BOM recursively (multi-level):
          - Finished product --> semi-finished components + packaging
          - Semi-finished --> raw materials
       c. Multiply quantities through each level
       d. Aggregate total raw material consumption
   --> create InventoryTransaction (type: SALE_DEDUCTION) for each material
   |
4. STOCK ENGINE applies transactions
   --> decrements current stock levels (in grams or units)
   --> checks against low-stock thresholds
   --> fires alerts if threshold crossed
   |
5. DASHBOARD reflects updated stock levels, alerts
```

**Secondary flows:**

```
Stock Receiving:
  USER enters received goods --> Stock Engine increments levels + records cost

Waste/Spoilage:
  USER records waste --> Stock Engine decrements levels (type: WASTE)

Physical Count:
  USER enters actual counts --> Stock Engine reconciles (type: ADJUSTMENT)

Reporting:
  Dashboard queries --> aggregated reads from transactions + stock levels
```

## Core Data Model

The database design centers on a self-referencing BOM structure that enables multi-level recipe trees.

### Entity Relationships

```
+------------------+       +-------------------+       +--------------------+
|      items       |       |     recipes       |       |  recipe_items      |
|------------------|       |-------------------|       |--------------------|
| id (PK)          |<------| id (PK)           |<------| id (PK)            |
| sku (unique)     |       | name              |       | recipe_id (FK)     |
| name             |       | output_item_id(FK)|------>| ingredient_id (FK) |---> items
| type (enum)      |       | output_qty        |       | quantity           |
|   raw_material   |       | output_unit       |       | unit               |
|   semi_finished  |       | notes             |       +--------------------+
|   finished       |       | is_active         |
|   packaging      |       +-------------------+
| unit (g/pcs)     |
| stock_qty        |          The recipe for "Ice Cream Mix" (semi-finished)
| min_stock_qty    |          lists raw materials as ingredients.
| cost_per_unit    |
| carton_size      |          The recipe for "Mango Ice Cream" (finished)
| carton_unit_wt   |          lists "Ice Cream Mix" (semi-finished) +
+------------------+          "Mango Jam" (raw) + "400ml Cup" (packaging).
                              This creates the multi-level tree.
```

```
+------------------+       +--------------------+       +---------------------+
|  sales_uploads   |       |   sales_records    |       | inventory_txns      |
|------------------|       |--------------------|       |---------------------|
| id (PK)          |<------| id (PK)            |       | id (PK)             |
| filename         |       | upload_id (FK)     |       | item_id (FK)        |
| uploaded_at      |       | item_id (FK)       |       | type (enum)         |
| uploaded_by (FK) |       | quantity_sold      |       |   RECEIVE           |
| status           |       | sale_date          |       |   SALE_DEDUCTION    |
| row_count        |       | unit_price         |       |   WASTE             |
| error_count      |       | is_deducted (bool) |       |   ADJUSTMENT        |
+------------------+       +--------------------+       | quantity            |
                                                        | reference_id        |
+------------------+                                    | notes               |
|      users       |                                    | created_at          |
|------------------|                                    | created_by (FK)     |
| id (PK)          |                                    +---------------------+
| name             |
| email            |        inventory_txns is an APPEND-ONLY ledger.
| role (enum)      |        Current stock = SUM(quantity) grouped by item_id.
|   admin          |        Or: maintained as a materialized running total
|   staff          |        on items.stock_qty for fast reads.
|   viewer         |
| password_hash    |
+------------------+
```

### Key Design Decisions

**1. Items use a `type` enum, not separate tables per type.**
All item types (raw, semi-finished, finished, packaging) share the same table with a `type` discriminator. This simplifies queries, avoids JOIN complexity, and allows a single item to potentially change type. The differences between types are behavioral (can it be a recipe output? can it appear in sales?) not structural.

**2. Recipes reference items on both sides.**
A recipe produces an output item (the `output_item_id`) and consumes ingredient items (via `recipe_items`). When a semi-finished item appears as an ingredient in a finished product's recipe, the system knows to recursively look up the semi-finished item's own recipe to reach raw materials. This is the multi-level BOM pattern.

**3. Inventory transactions are an append-only ledger.**
Never update stock levels directly. Every stock change (receive, deduct, waste, adjust) creates a new transaction record. The current stock level is the sum of all transactions for an item. This provides a complete audit trail and makes reconciliation straightforward. For performance, maintain a denormalized `stock_qty` on the `items` table that is updated transactionally alongside the ledger insert.

**4. Sales uploads are separate from sales records.**
The upload entity tracks the file-level metadata (who uploaded, when, errors). Individual line items become sales records. This separation allows partial success -- some rows process, others flag for correction -- without losing the upload context.

## The BOM Explosion Algorithm

This is the most architecturally significant piece. When a sale of "Mango Ice Cream" is recorded, the system must recursively walk the recipe tree to determine which raw materials (and how much of each) to deduct.

### Example Chain

```
Sale: 1x Mango Ice Cream (finished product)
  |
  Recipe for Mango Ice Cream:
    200g Ice Cream Mix (semi-finished)  --> has its OWN recipe
    50g  Mango Jam (raw material)       --> leaf node, deduct directly
    1pc  400ml Cup (packaging)          --> leaf node, deduct directly
  |
  Recipe for Ice Cream Mix (200g batch yields 200g):
    100g Sweet Non-Dairy Creamer (raw)  --> leaf node
    80g  Milk Powder (raw)              --> leaf node
    20g  Sugar (raw)                    --> leaf node
  |
  FINAL DEDUCTION (flattened):
    100g Sweet Non-Dairy Creamer
    80g  Milk Powder
    20g  Sugar
    50g  Mango Jam
    1pc  400ml Cup
```

### Algorithm (Pseudocode)

```
function explodeBOM(itemId, multiplier = 1):
    recipe = findRecipeByOutputItem(itemId)

    if recipe is null:
        // This item has no recipe -- it is a raw material or packaging.
        // Return it as a leaf node to be deducted.
        return [{ itemId, quantity: multiplier }]

    results = []
    for each ingredient in recipe.ingredients:
        // Scale ingredient quantity by the multiplier
        scaledQty = ingredient.quantity * multiplier / recipe.output_qty

        // Recurse: if ingredient has its own recipe, explode further
        subResults = explodeBOM(ingredient.item_id, scaledQty)
        results.append(subResults)

    return flatten(results)  // aggregate same items, sum quantities
```

### Safety Guards

- **Max depth limit (e.g., 5 levels):** Prevent infinite recursion from accidental circular references. In food service, 3 levels (finished -> semi-finished -> raw) is the practical maximum. Set a hard cap at 5.
- **Circular reference detection:** Before saving a recipe, validate that no item appears as both an ancestor and descendant in the same BOM tree. Maintain a visited-set during explosion.
- **Quantity validation:** Reject recipes where output quantity is zero (division by zero in scaling).

## Patterns to Follow

### Pattern 1: Ledger-Based Inventory (Event Sourcing Lite)

**What:** Never mutate stock levels directly. Every change is an appended transaction. Current state is derived from the transaction log.

**When:** Always -- this is the foundation of trustworthy inventory.

**Why:** Full audit trail. Easy reconciliation (compare derived total vs physical count). Simple debugging ("why is stock at X?" -- read the transaction log). No lost updates from concurrent writes.

**Example:**
```sql
-- Record a deduction
INSERT INTO inventory_txns (item_id, type, quantity, reference_id, created_by)
VALUES (42, 'SALE_DEDUCTION', -100.0, 'sale_record_789', 1);

-- Update denormalized stock (in same transaction)
UPDATE items SET stock_qty = stock_qty - 100.0 WHERE id = 42;

-- Reconciliation: verify denormalized value matches ledger
SELECT item_id, SUM(quantity) as ledger_total
FROM inventory_txns
GROUP BY item_id;
```

### Pattern 2: Upload-Validate-Review-Process Pipeline

**What:** File uploads go through distinct stages: parse -> validate -> present errors -> user confirms -> process.

**When:** For CSV/Excel sales data ingestion.

**Why:** POS exports are messy. Column names vary, products may not map to SKUs, quantities might be wrong. Users must see and fix problems before deductions happen. Never auto-process without confirmation.

**Stages:**
```
UPLOADED --> PARSED --> VALIDATED --> REVIEW --> CONFIRMED --> PROCESSING --> COMPLETED
                          |                                       |
                          +--> ERRORS (user fixes) ---------------+
```

### Pattern 3: Computed Aggregations for Reports

**What:** Reports query pre-aggregated views or materialized data rather than scanning full transaction logs.

**When:** Dashboard queries, sales reports, bestseller analysis.

**Why:** Transaction logs grow large. Aggregating on every page load is slow. Pre-compute daily/weekly summaries.

### Pattern 4: Soft Deletes with Active Flags

**What:** Never hard-delete items, recipes, or transaction records. Use `is_active` flags.

**When:** When a product is discontinued or a recipe is changed.

**Why:** Historical transactions reference these items. Deleting them breaks referential integrity and makes past reports meaningless.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Direct Stock Mutation Without Ledger

**What:** Updating `items.stock_qty` directly (e.g., `SET stock_qty = 150`) without recording a transaction.

**Why bad:** No audit trail. Cannot answer "why did stock change?" Cannot reconcile. Cannot undo. Any bug silently corrupts data with no recovery path.

**Instead:** Always write to `inventory_txns` first, then update the denormalized `stock_qty` in the same database transaction.

### Anti-Pattern 2: Flattened/Denormalized BOM Storage

**What:** Pre-computing and storing the flattened raw material requirements for each finished product.

**Why bad:** When any recipe changes (e.g., Ice Cream Mix formula is tweaked), every finished product using it must have its flattened BOM recomputed. This creates a maintenance nightmare and stale data risk.

**Instead:** Store recipes as direct parent-child relationships only. Compute the full explosion at deduction time. Cache if needed, but source of truth is the relational BOM tree.

### Anti-Pattern 3: Auto-Processing Uploads Without Review

**What:** Automatically deducting inventory the moment a CSV is uploaded.

**Why bad:** POS exports contain errors, unmapped products, wrong quantities. Auto-processing creates incorrect deductions that are hard to reverse.

**Instead:** Upload -> validate -> show user a preview with flagged issues -> user confirms -> then process.

### Anti-Pattern 4: Storing Stock as a Single Mutable Number

**What:** Treating `items.stock_qty` as the sole source of truth for current stock, with no transaction history.

**Why bad:** Impossible to debug discrepancies, audit stock movements, or perform reconciliation.

**Instead:** `stock_qty` is a denormalized cache. The transaction ledger is the source of truth.

## Scalability Considerations

This system is for a single store with a small team. The scale requirements are modest, but the architecture should not paint into a corner.

| Concern | Current Scale (1 store) | If Grew to 5 stores | Notes |
|---------|------------------------|---------------------|-------|
| Database | Single PostgreSQL instance, no partitioning needed | Still single instance, add store_id column to items/transactions | Tens of thousands of rows -- trivial for PostgreSQL |
| BOM explosion | In-process computation, synchronous | Same -- BOM trees are small (3 levels, <20 ingredients) | Only move to async if processing >1000 sales records in a batch |
| File uploads | Synchronous processing during request | Background job queue for large files | Consider background processing if files exceed ~500 rows |
| Reporting | Direct queries against transaction tables | Add materialized views for cross-store aggregation | Index on (item_id, created_at) covers most report queries |
| Users | 3-5 concurrent users, no caching needed | 10-20 users, still no caching needed | Session-based auth is sufficient |

**Key insight:** Do not pre-optimize. A single PostgreSQL instance with proper indexes handles this workload trivially. The architecture enables future scaling (add store_id, add job queue, add read replicas) without rewriting -- but do not build those things now.

## Suggested Build Order

Based on component dependencies, the system should be built in this order.

```
Phase 1: Foundation (no dependencies)
  Items + Stock Engine
  --> Must exist before anything else can reference items
  --> Includes: CRUD for items, stock receiving, basic stock view

Phase 2: BOM/Recipe Layer (depends on Phase 1)
  Recipe Management + BOM structure
  --> Requires items to exist as ingredients
  --> Includes: create/edit recipes, link ingredients, preview BOM tree

Phase 3: Sales + Deduction (depends on Phases 1 & 2)
  Sales Ingestion + Deduction Engine
  --> Requires items (SKU mapping) and recipes (BOM explosion)
  --> Includes: CSV upload, validation, review, BOM explosion, auto-deduction
  --> This is the core value -- cannot work without Phases 1+2

Phase 4: Reporting (depends on Phases 1-3)
  Dashboard + Reports
  --> Requires transaction history from deductions
  --> Includes: stock status, sales reports, bestsellers, reorder alerts

Phase 5: Polish (depends on Phase 4)
  Waste tracking, physical count reconciliation, margin analysis
  --> Enhances existing stock engine and reporting
  --> Lower priority, adds accuracy not core functionality
```

**Why this order:** Each phase produces a usable system. After Phase 1, you can track stock manually. After Phase 2, you can define recipes. After Phase 3, the core auto-deduction works. Phase 4 adds visibility. Phase 5 adds precision. Users get value at each stage, and each phase validates assumptions before the next layer is built on top.

## Sources

- [System Design Handbook: Design Inventory Management System](https://www.systemdesignhandbook.com/guides/design-inventory-management-system/) -- layered architecture, concurrency patterns, database schema principles (MEDIUM confidence, verified with multiple sources)
- [MRPeasy: Bill of Materials Complete Guide](https://www.mrpeasy.com/blog/bill-of-materials/) -- multi-level BOM structure, explosion vs flattening, parent-child hierarchy (HIGH confidence, domain-authoritative)
- [Fishbowl: Multi-Level BOM Explained](https://www.fishbowlinventory.com/blog/multi-level-bom) -- multi-level BOM hierarchy and manufacturing context (MEDIUM confidence)
- [MarketMan: Recipe Costing Software](https://www.marketman.com/platform/recipe-costing-software) -- food service recipe-to-inventory deduction flow, real-world reference architecture (MEDIUM confidence, commercial product docs)
- [Folio3 FoodTech: Bill of Materials in Food Manufacturing](https://foodtech.folio3.com/blog/bill-of-materials-in-food-manufacturing/) -- food-specific BOM with batch stages and packaging (MEDIUM confidence)
- [GeeksforGeeks: How to Design Database Inventory Management Systems](https://www.geeksforgeeks.org/dbms/how-to-design-database-inventory-management-systems/) -- core schema design, table relationships, normalization (MEDIUM confidence)
- [Bistodio: BOM for Food Industry](https://bistodio.com/what-is-a-bill-of-materials-bom-for-the-food-industry/) -- sub-component breakdowns in food production (MEDIUM confidence)
- [Atlassian: Microservices vs Monolith](https://www.atlassian.com/microservices/microservices-architecture/microservices-vs-monolith) -- architecture selection criteria for small vs large systems (HIGH confidence, well-established guidance)
- [SQLServerCentral: Recursive CTE Multiplying Quantities](https://www.sqlservercentral.com/forums/topic/recursive-cte-multiplying-quantities-down-the-tree) -- BOM explosion algorithm with quantity multiplication through levels (MEDIUM confidence, community-verified pattern)
