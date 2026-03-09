# Project Research Summary

**Project:** Ice Cream & Tea Inventory Management System
**Domain:** Food service inventory management (single-store, back-office)
**Researched:** 2026-03-09
**Confidence:** HIGH

## Executive Summary

This is a single-store, back-office inventory management system for an ice cream and tea shop. The domain is well understood -- food service inventory with multi-level Bills of Materials (BOMs) is a solved problem at enterprise scale (MarketMan, Restaurant365, Crunchtime), and the architectural patterns are thoroughly documented. The challenge is not novelty but precision: the multi-level recipe chain (raw material to semi-finished to finished product plus packaging) must be modeled correctly from day one because every downstream feature -- auto-deduction, cost calculation, reporting -- depends on it. The recommended approach is a Next.js modular monolith backed by Supabase (PostgreSQL), using a ledger-based inventory pattern and recursive BOM explosion. This stack is chosen specifically for long-term maintainability by a non-technical owner relying on AI tools and community support.

The most consequential decision in this project is the data model. Four of the six critical pitfalls trace back to schema design: floating-point corruption in weights, flat recipe structures that cannot represent multi-level BOMs, unit conversion inconsistency, and lack of recipe versioning. All of these must be addressed in Phase 1 before any business logic is written. The correct approach is: store all weights as integer milligrams, all costs as integer centavos, use a single unified items table with a type enum, implement recipes as self-referencing item-to-item relationships, and track all stock mutations in an append-only transaction ledger. Getting these five things right eliminates the highest-recovery-cost risks identified in research.

The remaining pitfalls -- CSV import fragility and concurrency in deductions -- are addressed in later phases but have straightforward prevention strategies (validate-preview-confirm pipeline for imports, database transactions with row-level locking for deductions). The total infrastructure cost is $30-45/month in production, well below the $239+/month that MarketMan charges, making this purpose-built system viable for a small operation.

## Key Findings

### Recommended Stack

The stack is optimized for a single constraint above all others: maintainability by a non-coder using AI assistance. Next.js 16.1 with TypeScript provides a single-language, single-framework solution where frontend, backend, and API all live in one codebase. Supabase bundles PostgreSQL, authentication, storage, and row-level security into one managed service, eliminating the need for separate auth libraries, file storage, or database hosting. shadcn/ui provides copy-to-source UI components that an AI tool can directly edit, unlike opaque library dependencies.

**Core technologies:**
- **Next.js 16.1 + TypeScript**: Full-stack framework -- single codebase for UI + API, file-based routing for discoverability, largest ecosystem for AI-assisted maintenance
- **Supabase (PostgreSQL)**: Database + Auth + Storage + RLS in one service -- relational model is essential for multi-level BOMs, managed dashboard for non-technical inspection
- **Prisma 7.4**: Type-safe ORM -- human-readable schema file, Prisma Studio for visual data editing, auto-generated TypeScript types
- **shadcn/ui + Tailwind CSS 4**: Source-owned UI components -- editable files in the project, not opaque npm dependencies
- **React Hook Form + Zod**: Form handling and validation -- shared schemas between client and server, lightweight
- **Recharts + TanStack Table**: Data visualization and tables -- React-native APIs, sufficient for small-dataset reporting
- **SheetJS (xlsx)**: CSV/Excel parsing -- handles .xlsx natively, avoids Excel-mangles-CSV problems

**Cost: $0/month development, $30-45/month production** (Supabase Pro $25 + Vercel Pro $20 or Railway $5).

### Expected Features

**Must have (table stakes):**
- Multi-category item management (raw, semi-finished, finished, packaging) with unit conversion
- Multi-level recipe/BOM management with sub-recipe support
- Recipe-based auto-deduction from sales (the core value proposition)
- CSV/Excel sales upload with validation and manual entry fallback
- Stock receiving with cost tracking
- Low stock alerts with configurable thresholds
- Role-based access control (Admin, Staff/Encoder, Viewer)
- Physical count entry and variance reporting
- Waste/spoilage recording
- Dashboard with inventory summary, sales reports, and COGS

**Should have (differentiators):**
- Domain-specific templates (pre-loaded ice cream and tea sample data) -- low effort, high onboarding value
- Packaging consumption tracking tied to recipes -- genuinely uncommon in competitors
- Simplified margin analysis per product -- low effort if recipe costing is already built
- Smart CSV column mapping with memory -- reduces friction on the primary data entry workflow
- Reorder quantity recommendations based on consumption rate

**Defer (v2+):**
- Batch production logging -- valuable but adds workflow complexity
- Visual recipe chain explorer -- impressive but not essential for daily operations
- Expiration date tracking with FEFO -- add to receiving workflow later (include field in schema now)
- Inventory value trending over time -- needs accumulated time-series data

### Architecture Approach

Modular monolith with layered separation, NOT microservices. Six functional modules (Item Management, Recipe/BOM Management, Sales Ingestion, Deduction Engine, Stock Engine, Reporting/Dashboard) inside a single Next.js deployment, backed by a single PostgreSQL instance. The critical architectural element is the Deduction Engine, which recursively explodes multi-level BOMs to calculate raw material consumption from finished product sales. This uses a depth-first traversal with quantity scaling at each level, cycle detection, and a hard depth limit of 5 levels.

**Major components:**
1. **Item Management** -- CRUD for all item types, SKU management, unit conversions, stock thresholds
2. **Recipe/BOM Management** -- Multi-level recipe definitions linking items to items, enabling recursive BOM trees
3. **Sales Ingestion** -- CSV/Excel upload pipeline with parse-validate-preview-confirm-process stages
4. **Deduction Engine** -- Core business logic: explodes BOMs recursively, calculates material consumption, creates ledger transactions
5. **Stock Engine** -- Append-only transaction ledger, handles receiving/deduction/waste/adjustment, fires low-stock alerts
6. **Reporting & Dashboard** -- Aggregated read-only views: stock status, sales reports, bestsellers, cost analysis

**Key patterns:** Ledger-based inventory (append-only transactions, derived current state), upload-validate-review-process pipeline for CSV, soft deletes with active flags, computed aggregations for reports.

### Critical Pitfalls

1. **Floating-point corruption in weights and costs** -- Store all weights as integer milligrams, all costs as integer centavos. Never use FLOAT/REAL columns. Convert to human-readable units only at the display layer. Must be enforced in Phase 1 schema design; retrofitting requires full data migration.

2. **Flat recipe model that cannot handle multi-level BOM** -- Use a single items table with type enum and self-referencing recipe relationships from day one. Implement recursive BOM resolution immediately, not as a later addition. Recovery cost is HIGH if this is wrong.

3. **CSV import without defensive parsing** -- Never auto-process uploads. Implement validate-preview-confirm pipeline. Support flexible delimiters, date formats, and column mapping. Store original files for audit. Test with intentionally bad data.

4. **Deduction without atomicity (ghost inventory)** -- Wrap all inventory mutations in database transactions with row-level locking. The ledger pattern naturally handles concurrency because it is append-only, but the denormalized stock_qty update must be atomic.

5. **Unit conversion chaos** -- Store everything internally in a single canonical unit (milligrams for weight, pieces for packaging). Display conversion to cartons/cans as a UI convenience. Always show unit labels next to numbers. Validate threshold entries against sensible ranges.

6. **Recipe changes corrupting historical data** -- Snapshot BOM breakdown at deduction time. Store actual quantities deducted per ingredient on each transaction record, so recipe edits cannot retroactively alter history.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Foundation -- Data Model, Auth, and Item Management

**Rationale:** Every research file converges on this: the data model is the single highest-risk decision. Four of six critical pitfalls (float corruption, flat BOM, unit conversion, recipe versioning) are prevented or enabled at schema design time. Auth is a prerequisite for all features. Items are referenced by every other module.
**Delivers:** Working application shell with login, role-based access, complete item CRUD (all four types), unit conversion system, stock receiving, and basic stock level display.
**Addresses features:** Multi-category item management, unit conversion, stock receiving with cost tracking, role-based access, SKU legend, authentication.
**Avoids pitfalls:** Float corruption (integer schema from day one), flat BOM (unified items table with type enum), unit conversion chaos (canonical milligram storage with conversion factors).
**Stack focus:** Next.js project setup, Supabase configuration (Auth + RLS + database), Prisma schema, shadcn/ui scaffold, React Hook Form + Zod for item forms.

### Phase 2: Recipe Engine and BOM -- The Core Differentiator

**Rationale:** The multi-level BOM is the hardest table-stakes feature and the foundation for auto-deduction (Phase 3). Architecture research specifically warns: build and validate the recursive BOM explosion before building anything that depends on it. Recipe cost calculation also enables future margin analysis.
**Delivers:** Recipe CRUD with sub-recipe support, recursive BOM explosion algorithm with safety guards (cycle detection, depth limit), recipe-based cost calculation, BOM preview/visualization.
**Addresses features:** Recipe creation with ingredient quantities, sub-recipe/multi-level BOM support, recipe-based cost calculation.
**Avoids pitfalls:** Flat recipe model (self-referencing item relationships, recursive resolution), recipe versioning (snapshot BOM at deduction time in Phase 3 -- but schema support designed here).
**Stack focus:** Prisma relations for BOM, recursive algorithm implementation, TanStack Table for recipe ingredient lists.

### Phase 3: Sales Ingestion and Auto-Deduction -- The Value Proof

**Rationale:** This is where the system proves its value. The CSV upload pipeline and auto-deduction engine are the primary daily workflow. Architecture research defines this as the critical path. It depends on items (Phase 1) and recipes (Phase 2) both being solid. This phase exercises the entire stack end-to-end.
**Delivers:** CSV/Excel upload with column mapping, validation, and preview. Manual sales entry. BOM explosion triggered by confirmed sales. Inventory auto-deduction with ledger transactions. Deduction reversal for bad imports.
**Addresses features:** CSV/Excel upload for sales data, manual sales entry, recipe-based auto-deduction from sales, sales history view.
**Avoids pitfalls:** CSV import fragility (defensive parsing, preview-confirm pipeline, duplicate detection), deduction atomicity (database transactions, ledger pattern), recipe versioning (snapshot deducted quantities on each transaction).
**Stack focus:** SheetJS for file parsing, upload-validate-review-process pipeline, Deduction Engine implementation, database transaction management.

### Phase 4: Alerts, Dashboard, and Reporting -- The Payoff

**Rationale:** With transaction data flowing from Phase 3, the system can now surface actionable insights. Low stock alerts are the immediate payoff -- the owner opens the app and sees what needs attention. Reports build on accumulated sales and inventory data.
**Delivers:** Low stock alert system with configurable thresholds, dashboard with key metrics (inventory value, low-stock count, recent activity), sales summary reports, bestseller analysis, COGS report, stock level reports.
**Addresses features:** Low stock alerts, out-of-stock indicators, inventory summary dashboard, stock level report, sales summary report, COGS report.
**Avoids pitfalls:** UX overwhelm (start with 3-4 key metrics, advanced reports on separate pages), unit conversion in alerts (always show both grams and carton equivalent with labels).
**Stack focus:** Recharts for dashboard charts, computed aggregation queries, alert threshold comparison logic.

### Phase 5: Accuracy and Polish -- Waste, Reconciliation, and Differentiators

**Rationale:** These features maintain data accuracy over time and add differentiators that separate this from a spreadsheet. Physical count reconciliation is how the owner catches drift between system and reality. Waste recording closes the loop on unaccounted stock loss. Domain-specific templates should ship with v1 but are low-effort additions at any point.
**Delivers:** Waste/spoilage recording with reason codes, physical count entry and variance reporting, stock adjustment with audit trail, domain-specific sample data (ice cream and tea templates), margin analysis per product, smart CSV column mapping persistence.
**Addresses features:** Waste/spoilage recording, physical count reconciliation, variance reporting, domain templates, margin analysis, smart column mapping.
**Avoids pitfalls:** No audit trail (every mutation logged with user, timestamp, reason), variance recording (log difference, do not silently overwrite).
**Stack focus:** Variance calculation logic, counter-entry adjustments, seed data scripts for templates.

### Phase Ordering Rationale

- **Dependency-driven:** Each phase depends on the previous. Items before recipes, recipes before deduction, deduction before reporting. This is not arbitrary -- it matches the dependency graph from both FEATURES.md and ARCHITECTURE.md.
- **Risk-front-loaded:** The highest-recovery-cost pitfalls (float corruption, flat BOM) are addressed in Phase 1. The hardest feature (multi-level BOM explosion) is tackled in Phase 2 before the system that depends on it (Phase 3). If the BOM engine is wrong, it is caught before sales data flows through it.
- **Value at each stage:** Phase 1 delivers a usable stock tracker. Phase 2 adds recipe management. Phase 3 delivers the core auto-deduction loop. Phase 4 adds visibility. Phase 5 adds precision. The owner sees value incrementally rather than waiting for a monolithic delivery.
- **Anti-features excluded:** Multi-location, supplier management, POS integration, AI features, and barcode scanning are correctly scoped out. The architecture supports adding store_id later without a rewrite, but no work is done for it now.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2 (Recipe/BOM Engine):** The recursive BOM explosion algorithm with quantity scaling is the most architecturally complex piece. Implementation details (recursive CTE vs application-level traversal, caching strategy, cycle detection approach) warrant phase-level research to choose the right implementation path.
- **Phase 3 (Sales Ingestion):** The CSV parsing pipeline needs research into the specific POS export format(s) the owner currently uses. Column names, date formats, delimiters, and encoding will vary. Get a sample file before building.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Foundation):** Auth with Supabase, CRUD with Prisma, form handling with React Hook Form + Zod -- all extremely well-documented with official guides and tutorials. No novel patterns.
- **Phase 4 (Dashboard/Reports):** Recharts, aggregation queries, threshold comparisons -- standard patterns with abundant examples. The reporting requirements are straightforward summaries, not complex analytics.
- **Phase 5 (Waste/Reconciliation):** Simple form entries creating ledger transactions, variance = expected minus counted. Well-established inventory management patterns.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All recommendations verified against official sources (Next.js 16.1, Supabase, Prisma 7.4, shadcn/ui CLI v4). Versions are current. Cost projections from official pricing pages. |
| Features | MEDIUM-HIGH | Feature landscape cross-referenced across 6+ competitor products (MarketMan, Restaurant365, Apicbase, Xenia, Supy). Gap: no direct user research with the shop owner on feature priorities. |
| Architecture | HIGH | Modular monolith, ledger pattern, and recursive BOM are well-established patterns verified across multiple authoritative sources (MRPeasy, Fishbowl, Folio3, system design references). |
| Pitfalls | HIGH | All six critical pitfalls are domain-specific and multi-source verified. Float corruption, flat BOM, and CSV fragility are documented recurring problems in inventory systems. Recovery costs assessed realistically. |

**Overall confidence:** HIGH

### Gaps to Address

- **POS export format:** No sample CSV/Excel file from the actual POS system has been examined. The column mapping, date format, delimiter, and encoding are unknown. Obtain a sample export file before Phase 3 planning. This is the biggest unknown.
- **Feature prioritization with owner:** Features are ranked by industry research, not by direct input from the shop owner. A brief priority-check conversation before roadmap finalization would confirm the ordering.
- **Supabase RLS complexity:** Row-level security for three roles across six modules has not been designed in detail. The pattern is standard, but the specific policies need to be defined during Phase 1 planning.
- **Expiry date field:** Research recommends including an expiry date column in the schema from Phase 1 even though expiration tracking is deferred to v2+. This avoids a schema migration later. Should be confirmed during Phase 1 planning.
- **Vercel vs Railway hosting decision:** Budget trade-off ($20/month vs $5/month) should be decided before deployment. Both work; the choice depends on the owner's budget tolerance.

## Sources

### Primary (HIGH confidence)
- Next.js 16.1 official release blog
- Supabase official documentation (Auth, RLS, RBAC, Pricing)
- Prisma 7 official release and documentation
- shadcn/ui CLI v4 official changelog and installation guide
- Tailwind CSS v4 official release blog
- Zod 4 official release documentation
- PostgreSQL official documentation (numeric types)
- Railway official pricing documentation
- Vercel official pricing page
- MRPeasy BOM complete guide (domain-authoritative)
- Atlassian microservices vs monolith guidance

### Secondary (MEDIUM confidence)
- MarketMan product pages and feature documentation (competitor analysis)
- Restaurant365 product documentation (competitor analysis)
- Xenia, Supy, Toast industry guides (feature landscape)
- System Design Handbook inventory management guide
- Fishbowl, Folio3, Bistodio BOM references (domain patterns)
- GeeksforGeeks database design for inventory systems
- Crunchy Data blog on money handling in PostgreSQL
- LogRocket chart library comparison
- GetApp MarketMan review (pricing and features)

### Tertiary (LOW confidence)
- Auth.js/Better Auth merger details (community blog, needs verification)
- Toyaja ice cream inventory tips (single domain-specific source)
- Taqtics waste/spoilage tracking guide (single source)
- Medium article on race conditions in inventory systems (community source)

---
*Research completed: 2026-03-09*
*Ready for roadmap: yes*
