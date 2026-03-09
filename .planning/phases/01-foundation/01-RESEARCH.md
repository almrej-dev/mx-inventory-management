# Phase 1: Foundation - Research

**Researched:** 2026-03-09
**Domain:** Full-stack authentication, item CRUD, stock receiving (Next.js + Supabase + Prisma)
**Confidence:** HIGH

## Summary

Phase 1 is a greenfield build -- no code exists in the repository yet. The phase establishes the entire application shell: Next.js project scaffolding, Supabase Auth with three-role RBAC, Prisma schema with the critical data model decisions (integer storage, unified items table, append-only ledger), full item CRUD for all four types, and stock receiving. This is the highest-leverage phase because four of the six critical pitfalls identified in research (float corruption, flat BOM, unit conversion chaos, missing audit trail) are prevented or locked in at schema design time. Getting the data model right here eliminates the most expensive rewrites.

The stack is well-documented and all components have official integration guides. Supabase Auth handles email/password login and JWT-based sessions. Custom claims on the JWT carry the user role (admin/staff/viewer), which RLS policies and application middleware both read. Prisma provides type-safe database access with a human-readable schema file. shadcn/ui scaffolds a professional UI with source-owned components. React Hook Form + Zod handle form validation with shared schemas across client and server.

The only area requiring careful attention is the Supabase Auth + Prisma dual-access pattern: Supabase Auth manages the `auth.users` table, while Prisma manages all application tables including a `profiles` table linked to `auth.users` via UUID. The RBAC custom claims hook reads from a `user_roles` table. These three pieces (Supabase Auth, Prisma schema, RLS policies) must be coordinated during setup.

**Primary recommendation:** Start with Prisma schema design (integer milligrams, integer centavos, unified items table with type enum, append-only inventory_transactions ledger), then wire Supabase Auth with custom claims RBAC, then build item CRUD and stock receiving on that foundation.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-01 | User can log in with email and password | Supabase Auth email/password with @supabase/ssr for Next.js SSR cookie-based sessions; middleware refreshes JWT tokens |
| AUTH-02 | System enforces 3 roles: Admin (full), Staff/Encoder (data entry), Viewer (read-only) | Supabase custom claims JWT hook + user_roles table + RLS policies using authorize() function; middleware checks role for route protection |
| AUTH-03 | Admin can add/remove users and assign roles | Supabase Admin API (supabase.auth.admin.createUser) called from server actions; user_roles table managed via Prisma |
| ITEM-01 | User can create items with type (raw material, semi-finished, finished, packaging) | Unified items table with ItemType enum in Prisma; single form with type selector |
| ITEM-02 | User can set unit weight in grams and carton conversion (1 ctn = 8 units = 6,800g) | Store weight_mg as Int (milligrams), carton_size as Int, unit_weight_mg as Int; display conversion at UI layer only |
| ITEM-03 | User can view SKU legend with uniform format guide | Static reference page with SKU format rules; SKU field on items table with validation |
| ITEM-04 | User can set purchase cost per item for margin analysis | Store cost_centavos as Int (Philippine centavos); display conversion to pesos at UI layer |
| ITEM-05 | User can edit and soft-delete items | Soft delete via deleted_at DateTime? field; filter active items with WHERE deleted_at IS NULL |
| ITEM-06 | User can search and filter items by type, category, and name | TanStack Table with column filtering + server-side Prisma queries with where clauses; debounced search input |
| STCK-01 | User can record incoming stock with quantity, date, and purchase cost | Append-only inventory_transactions ledger with type RECEIVE; update denormalized stock_qty on items in same transaction |
| STCK-05 | System maintains stock levels via append-only transaction ledger | inventory_transactions table with type enum (RECEIVE, SALE_DEDUCTION, WASTE, ADJUSTMENT); items.stock_qty as denormalized cache |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1 | Full-stack framework (UI + API routes + middleware) | Single codebase, file-based routing, Turbopack default, largest React ecosystem |
| React | 19.2 | UI library (bundled with Next.js 16) | Industry standard, Server Components reduce client complexity |
| TypeScript | 5.x | Type safety | Zero-config in Next.js 16, catches errors before runtime |
| Supabase (managed) | Current SaaS | PostgreSQL + Auth + RLS + Storage | All-in-one backend service; relational DB essential for BOM; built-in auth eliminates separate auth library |
| Prisma ORM | 7.4.x | Type-safe database access | Human-readable schema, auto-generated TypeScript types, Prisma Studio for visual data inspection |
| @supabase/ssr | Latest | SSR cookie-based auth for Next.js | Official package for server-side auth token management in Next.js App Router |
| shadcn/ui | CLI v4 | Source-owned UI components (Radix + Tailwind) | Components copied into project as editable source; not an opaque dependency |
| Tailwind CSS | 4.x | Utility-first CSS | Required by shadcn/ui; v4 configured via CSS (no JS config), 5x faster than v3 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| React Hook Form | 7.x | Form state management | Every data entry form (items, stock receiving, user management) |
| Zod | 4.x | Schema validation | Shared client/server validation for all forms and API payloads |
| @hookform/resolvers | 5.x | Connects Zod to React Hook Form | All forms that use Zod schemas |
| TanStack Table | 8.x | Headless data tables | Item list with sorting, filtering, pagination |
| date-fns | 3.x | Date manipulation | Stock receiving dates, display formatting |
| jwt-decode | Latest | Decode JWT access tokens | Read custom claims (user_role) from Supabase JWT on client side |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Prisma | Drizzle ORM | Drizzle is more SQL-like and lighter, but steeper learning curve and smaller docs/community for beginners |
| Supabase Auth | Auth.js/Better Auth | Auth.js is in maintenance mode since Sept 2025 merger; Supabase Auth is included free and actively maintained |
| shadcn/ui | Ant Design | Ant Design has more components but is heavier, opaque, and harder to customize |
| TanStack Table | AG Grid | AG Grid is more powerful but adds significant bundle size for a simple item list |

**Installation:**
```bash
# Initialize Next.js with shadcn/ui scaffold
pnpm dlx shadcn@latest init -t next

# Core dependencies
pnpm add @supabase/supabase-js @supabase/ssr
pnpm add @prisma/client
pnpm add react-hook-form @hookform/resolvers zod
pnpm add @tanstack/react-table
pnpm add date-fns
pnpm add jwt-decode

# Dev dependencies
pnpm add -D prisma
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── (auth)/                  # Route group for auth pages (no sidebar)
│   │   ├── login/
│   │   │   └── page.tsx         # Login page
│   │   └── layout.tsx           # Minimal layout (no nav)
│   ├── (dashboard)/             # Route group for authenticated pages
│   │   ├── items/
│   │   │   ├── page.tsx         # Item list with search/filter
│   │   │   ├── new/
│   │   │   │   └── page.tsx     # Create item form
│   │   │   └── [id]/
│   │   │       └── edit/
│   │   │           └── page.tsx # Edit item form
│   │   ├── stock/
│   │   │   └── receiving/
│   │   │       └── page.tsx     # Stock receiving form
│   │   ├── users/
│   │   │   └── page.tsx         # User management (admin only)
│   │   ├── layout.tsx           # Dashboard layout (sidebar + header)
│   │   └── page.tsx             # Dashboard home / redirect
│   ├── layout.tsx               # Root layout (html, body, providers)
│   └── globals.css              # Tailwind globals
├── components/
│   ├── ui/                      # shadcn/ui components (auto-generated)
│   ├── items/                   # Item-specific components
│   │   ├── item-form.tsx        # Shared create/edit form
│   │   ├── item-table.tsx       # Item list table with filters
│   │   └── item-columns.tsx     # TanStack Table column definitions
│   ├── stock/                   # Stock-specific components
│   │   └── receiving-form.tsx   # Stock receiving form
│   ├── users/                   # User management components
│   │   └── user-form.tsx        # Create/edit user form
│   └── layout/                  # Layout components
│       ├── sidebar.tsx          # Navigation sidebar
│       ├── header.tsx           # Top header with user menu
│       └── role-gate.tsx        # Conditional render based on role
├── lib/
│   ├── supabase/
│   │   ├── client.ts            # Browser Supabase client
│   │   ├── server.ts            # Server Supabase client
│   │   └── middleware.ts        # Supabase middleware helpers
│   ├── prisma.ts                # Prisma client singleton
│   ├── utils.ts                 # General utilities (cn helper, etc.)
│   └── constants.ts             # App constants (item types, roles, etc.)
├── actions/                     # Next.js Server Actions
│   ├── items.ts                 # Item CRUD actions
│   ├── stock.ts                 # Stock receiving actions
│   └── users.ts                 # User management actions
├── schemas/                     # Zod validation schemas
│   ├── item.ts                  # Item form schema
│   ├── stock.ts                 # Stock receiving schema
│   └── user.ts                  # User management schema
├── types/                       # TypeScript type definitions
│   └── index.ts                 # Shared types (roles, item types, etc.)
├── middleware.ts                 # Next.js middleware (auth + route protection)
prisma/
├── schema.prisma                # Prisma schema (THE data model)
├── migrations/                  # Database migrations
└── seed.ts                      # Seed data (sample items, admin user)
```

### Pattern 1: Supabase Auth + Custom Claims RBAC
**What:** Store user roles in a `user_roles` table. A custom access token hook function injects the role into the JWT as a custom claim. Middleware reads the JWT to protect routes. RLS policies use an `authorize()` function to check permissions.
**When to use:** All authenticated features -- every route, every server action, every RLS policy.
**Example:**
```sql
-- Source: https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac

-- Define roles
CREATE TYPE public.app_role AS ENUM ('admin', 'staff', 'viewer');

-- User roles table
CREATE TABLE public.user_roles (
  id        BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  user_id   UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  role      app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Auth hook: inject role into JWT
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  claims jsonb;
  user_role public.app_role;
BEGIN
  SELECT role INTO user_role FROM public.user_roles
  WHERE user_id = (event->>'user_id')::uuid;

  claims := event->'claims';
  IF user_role IS NOT NULL THEN
    claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));
  ELSE
    claims := jsonb_set(claims, '{user_role}', '"viewer"');
  END IF;

  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$;

-- Authorize function for RLS policies
CREATE OR REPLACE FUNCTION public.authorize(requested_role app_role)
RETURNS boolean AS $$
DECLARE
  user_role public.app_role;
BEGIN
  SELECT (auth.jwt() ->> 'user_role')::public.app_role INTO user_role;

  -- Admin can do everything
  IF user_role = 'admin' THEN RETURN true; END IF;
  -- Staff can do staff and viewer things
  IF user_role = 'staff' AND requested_role IN ('staff', 'viewer') THEN RETURN true; END IF;
  -- Viewer can only do viewer things
  IF user_role = 'viewer' AND requested_role = 'viewer' THEN RETURN true; END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '';

-- Example RLS policy: items readable by all authenticated, writable by staff+
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "items_select" ON items FOR SELECT TO authenticated
  USING ((SELECT authorize('viewer')));
CREATE POLICY "items_insert" ON items FOR INSERT TO authenticated
  WITH CHECK ((SELECT authorize('staff')));
CREATE POLICY "items_update" ON items FOR UPDATE TO authenticated
  USING ((SELECT authorize('staff')));
```

### Pattern 2: Integer Storage for Weights and Costs
**What:** Store all weights as integer milligrams, all monetary values as integer centavos. Convert to human-readable units only at the display layer.
**When to use:** Every column that stores weight or money -- no exceptions.
**Example:**
```prisma
// Source: Project research PITFALLS.md + PostgreSQL docs on numeric types

model Item {
  id              Int       @id @default(autoincrement())
  sku             String    @unique
  name            String
  type            ItemType
  category        String?

  // Weight: stored as milligrams (integer). 1g = 1000mg.
  // 6800g carton = 6_800_000 mg
  unitWeightMg    Int       @map("unit_weight_mg")

  // Carton conversion
  cartonSize      Int       @map("carton_size")  // units per carton

  // Cost: stored as centavos (integer). PHP 1.00 = 100 centavos
  costCentavos    Int       @map("cost_centavos")

  // Denormalized stock level (milligrams for weight items, pieces for packaging)
  stockQty        Int       @default(0) @map("stock_qty")
  minStockQty     Int       @default(0) @map("min_stock_qty")

  // Soft delete
  deletedAt       DateTime? @map("deleted_at")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  // Relations
  transactions    InventoryTransaction[]

  @@map("items")
}

enum ItemType {
  RAW_MATERIAL
  SEMI_FINISHED
  FINISHED
  PACKAGING

  @@map("item_type")
}
```

### Pattern 3: Append-Only Inventory Transaction Ledger
**What:** Every stock mutation (receive, deduct, waste, adjust) creates a new transaction record. Current stock is the sum of all transactions. A denormalized `stock_qty` on items is updated transactionally alongside the ledger insert.
**When to use:** All stock mutations -- receiving (Phase 1), deductions (Phase 3), waste (Phase 5), adjustments (Phase 5).
**Example:**
```prisma
model InventoryTransaction {
  id            Int               @id @default(autoincrement())
  itemId        Int               @map("item_id")
  type          TransactionType
  quantity      Int               // positive for additions, negative for deductions (in mg or pieces)
  referenceId   String?           @map("reference_id")  // links to source (e.g., receiving record ID)
  notes         String?
  costCentavos  Int?              @map("cost_centavos")  // cost at time of transaction
  createdAt     DateTime          @default(now()) @map("created_at")
  createdBy     String            @map("created_by")     // user UUID from Supabase Auth

  item          Item              @relation(fields: [itemId], references: [id])

  @@index([itemId, createdAt])
  @@map("inventory_transactions")
}

enum TransactionType {
  RECEIVE
  SALE_DEDUCTION
  WASTE
  ADJUSTMENT

  @@map("transaction_type")
}
```

```typescript
// Server action: Record stock receiving
// Source: Architecture pattern from ARCHITECTURE.md

async function receiveStock(data: ReceivingFormData) {
  "use server";

  const quantityMg = data.quantityCartons * item.cartonSize * item.unitWeightMg;
  // Or for packaging: quantityPieces = data.quantityCartons * item.cartonSize;

  await prisma.$transaction([
    // 1. Insert ledger entry
    prisma.inventoryTransaction.create({
      data: {
        itemId: data.itemId,
        type: "RECEIVE",
        quantity: quantityMg,
        costCentavos: data.costCentavos,
        notes: data.notes,
        createdBy: userId,
      },
    }),
    // 2. Update denormalized stock (same transaction = atomic)
    prisma.item.update({
      where: { id: data.itemId },
      data: { stockQty: { increment: quantityMg } },
    }),
  ]);
}
```

### Pattern 4: Supabase SSR Middleware for Auth
**What:** Next.js middleware refreshes Supabase auth tokens on every request, reads the JWT to check authentication and role, redirects unauthenticated users to login.
**When to use:** Every request to dashboard routes.
**Example:**
```typescript
// Source: https://supabase.com/docs/guides/auth/server-side/nextjs

// middleware.ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session -- IMPORTANT: do not remove
  const { data: { user } } = await supabase.auth.getUser();

  // Redirect unauthenticated users to login
  if (!user && !request.nextUrl.pathname.startsWith("/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from login
  if (user && request.nextUrl.pathname.startsWith("/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
```

### Pattern 5: Server Actions with Zod Validation
**What:** Centralize validation in a Zod schema. Use it client-side with React Hook Form resolver AND server-side in the server action via `schema.safeParse()`.
**When to use:** Every form submission.
**Example:**
```typescript
// schemas/item.ts
import { z } from "zod";

export const itemSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  sku: z.string().min(1, "SKU is required").max(50),
  type: z.enum(["RAW_MATERIAL", "SEMI_FINISHED", "FINISHED", "PACKAGING"]),
  category: z.string().optional(),
  unitWeightMg: z.number().int().positive("Weight must be positive"),
  cartonSize: z.number().int().positive("Carton size must be at least 1"),
  costCentavos: z.number().int().nonnegative("Cost cannot be negative"),
  minStockQty: z.number().int().nonnegative().default(0),
});

export type ItemFormData = z.infer<typeof itemSchema>;

// actions/items.ts
"use server";
import { itemSchema } from "@/schemas/item";
import { prisma } from "@/lib/prisma";

export async function createItem(rawData: unknown) {
  const parsed = itemSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const item = await prisma.item.create({ data: parsed.data });
  return { success: true, item };
}
```

### Anti-Patterns to Avoid
- **Storing weights as Float/Decimal:** Use Int (milligrams) exclusively. Even Prisma's Decimal type adds unnecessary complexity when integer milligrams work perfectly for this domain (max item weight ~100kg = 100,000,000mg, well within Int range).
- **Separate tables for each item type:** Use a single `items` table with `type` enum. Separate tables make BOM queries impossible without unions and break the self-referencing recipe model needed in Phase 2.
- **Mutating stock_qty without a ledger entry:** Every stock change MUST create an `inventory_transactions` record first, then update `stock_qty` in the same database transaction.
- **Checking auth only in middleware:** Middleware protects routes, but server actions MUST also verify the user session and role. A user could call a server action directly.
- **Hardcoding role checks:** Use the `authorize()` SQL function in RLS policies and a reusable `requireRole()` helper in server actions. Do not scatter `if (role === 'admin')` throughout the codebase.
- **Creating Supabase auth users and application profiles separately:** Always create the `user_roles` record in the same operation as creating the auth user. Use a database trigger or handle it in the server action that calls `supabase.auth.admin.createUser()`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Authentication | Custom JWT + bcrypt + session management | Supabase Auth (@supabase/ssr) | Session management, token refresh, password reset, email verification are deceptively complex; Supabase handles all edge cases |
| RBAC/Authorization | Custom middleware role checking with database lookups per request | Supabase Custom Claims JWT Hook + RLS | Role is embedded in JWT (no DB lookup per request); RLS enforces at database level (cannot be bypassed by calling API directly) |
| Form validation | Manual field-by-field checks | Zod schemas + @hookform/resolvers | Single schema validates client AND server; TypeScript inference for free; handles nested objects and arrays |
| Data tables with sort/filter/paginate | Custom table component with manual state | TanStack Table + shadcn/ui Table | Sorting, filtering, pagination, column visibility are complex state machines; TanStack Table handles all edge cases |
| Database migrations | Manual SQL scripts | Prisma Migrate | Tracks migration history, generates SQL from schema changes, handles rollbacks |
| UI component library | Custom buttons, inputs, dialogs from scratch | shadcn/ui (adds source code to project) | Accessible (Radix primitives), styled (Tailwind), and directly editable in the project |
| Date formatting | Manual date string manipulation | date-fns format/parse | Timezone handling, locale support, relative dates are error-prone to implement manually |

**Key insight:** Phase 1 is almost entirely "plumbing" -- auth, CRUD, forms, tables. Every one of these problems has a battle-tested library solution. Custom implementations waste time and introduce bugs in areas that are not the business logic differentiator.

## Common Pitfalls

### Pitfall 1: Float Storage for Weights and Costs
**What goes wrong:** Using JavaScript `number` or PostgreSQL `FLOAT` for gram weights and peso costs. Rounding errors accumulate across multi-level recipe chains and thousands of transactions, corrupting stock levels and cost reports.
**Why it happens:** `FLOAT` seems natural for "numbers with decimals." But `0.1 + 0.2 !== 0.3` in IEEE 754.
**How to avoid:** Store ALL weights as integer milligrams (Int). Store ALL costs as integer centavos (Int). Convert to grams/pesos only at the display layer. No exceptions.
**Warning signs:** Stock showing `-0.00` or `0.01` after full deduction; cost reports drifting by centavos over time.

### Pitfall 2: Supabase Auth + Prisma User Mismatch
**What goes wrong:** Supabase Auth manages users in `auth.users` (UUID-based). Prisma manages application data. If the application creates a Prisma `Profile` record but the auth user creation fails (or vice versa), you get orphaned records.
**Why it happens:** Two systems manage user identity. No automatic synchronization.
**How to avoid:** When admin creates a user: (1) call `supabase.auth.admin.createUser()` first, (2) on success, create the `user_roles` record and any `profiles` record using the returned UUID, (3) wrap in try/catch and clean up on failure. Alternatively, use a Supabase database trigger on `auth.users` insert to auto-create the profile.
**Warning signs:** Users can log in but see no data; admin panel shows users that do not exist in auth.

### Pitfall 3: Missing Server-Side Auth Checks in Server Actions
**What goes wrong:** Middleware protects page routes, but server actions can be called directly without going through middleware. A viewer could invoke a staff-level server action by calling it programmatically.
**Why it happens:** Developers assume route protection equals API protection.
**How to avoid:** Every server action MUST call `supabase.auth.getUser()` to verify the session and check the role before performing any mutation. Create a reusable `requireRole('staff')` helper that throws if unauthorized.
**Warning signs:** Viewer role can create items if they know how to call the server action directly.

### Pitfall 4: Forgetting to Update Denormalized stock_qty
**What goes wrong:** A ledger entry is created (inventory_transactions) but the denormalized `items.stock_qty` is not updated, or vice versa. The two get out of sync.
**Why it happens:** The update is in two places (ledger insert + stock_qty update) and developers forget one.
**How to avoid:** ALWAYS use `prisma.$transaction([...])` to wrap both operations atomically. Create a single `recordStockTransaction()` helper that does both -- never allow calling one without the other.
**Warning signs:** Transaction log shows correct history but stock levels are wrong; or stock levels are correct but transaction log is missing entries.

### Pitfall 5: Unit Conversion Confusion in Receiving
**What goes wrong:** Staff enters "2 cartons" of mango jam, but the system stores "2" in milligrams instead of converting to 13,600,000mg (2 cartons x 8 units x 850g x 1000).
**Why it happens:** The receiving form does not clearly distinguish between cartons and base units, or the conversion logic is missing.
**How to avoid:** The receiving form accepts cartons as input, shows the gram equivalent in real-time ("2 cartons = 13,600g"), and stores the converted milligram value. Always display unit labels next to numbers.
**Warning signs:** Stock levels are orders of magnitude too low or too high after receiving; alerts fire at nonsensical times.

### Pitfall 6: RLS Policies Not Tested from Client SDK
**What goes wrong:** RLS policies are written and tested in the Supabase SQL Editor, which bypasses RLS. They appear to work but actually block all access when called from the application client.
**Why it happens:** The SQL Editor runs as `postgres` superuser, which ignores RLS. The application runs as `authenticated` role.
**How to avoid:** Test every RLS policy from the Supabase client SDK (JavaScript), not the SQL Editor. Use the Supabase dashboard "API" tab or write integration tests that authenticate as each role and verify access.
**Warning signs:** Application shows empty data even though the database has records; `403` or empty responses from Supabase queries.

## Code Examples

Verified patterns from official sources:

### Prisma Client Singleton (Next.js)
```typescript
// lib/prisma.ts
// Source: https://www.prisma.io/docs/guides/nextjs
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

### Supabase Browser Client
```typescript
// lib/supabase/client.ts
// Source: https://supabase.com/docs/guides/auth/server-side/creating-a-client
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
```

### Supabase Server Client
```typescript
// lib/supabase/server.ts
// Source: https://supabase.com/docs/guides/auth/server-side/nextjs
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method is called from a Server Component.
            // This can be ignored if middleware refreshes sessions.
          }
        },
      },
    }
  );
}
```

### Role-Protected Server Action Helper
```typescript
// lib/auth.ts
import { createClient } from "@/lib/supabase/server";
import { jwtDecode } from "jwt-decode";

type AppRole = "admin" | "staff" | "viewer";

interface JwtPayload {
  user_role: AppRole;
}

export async function requireRole(minimumRole: AppRole) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Unauthorized: Not authenticated");
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Unauthorized: No session");

  const jwt = jwtDecode<JwtPayload>(session.access_token);
  const userRole = jwt.user_role;

  const roleHierarchy: Record<AppRole, number> = {
    viewer: 1,
    staff: 2,
    admin: 3,
  };

  if (roleHierarchy[userRole] < roleHierarchy[minimumRole]) {
    throw new Error(`Unauthorized: Requires ${minimumRole} role`);
  }

  return { user, role: userRole };
}
```

### Item Form with React Hook Form + Zod
```typescript
// components/items/item-form.tsx
"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { itemSchema, type ItemFormData } from "@/schemas/item";

// Display conversion helpers
function mgToGrams(mg: number): string {
  return (mg / 1000).toFixed(1);
}
function centavosToPesos(centavos: number): string {
  return (centavos / 100).toFixed(2);
}

export function ItemForm({ onSubmit }: { onSubmit: (data: ItemFormData) => void }) {
  const form = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      type: "RAW_MATERIAL",
      unitWeightMg: 0,
      cartonSize: 1,
      costCentavos: 0,
      minStockQty: 0,
    },
  });

  // The form collects user-friendly values (grams, pesos)
  // and converts to internal units (mg, centavos) before submission
  const handleSubmit = (displayData: any) => {
    const internalData: ItemFormData = {
      ...displayData,
      unitWeightMg: Math.round(displayData.unitWeightGrams * 1000),
      costCentavos: Math.round(displayData.costPesos * 100),
    };
    onSubmit(internalData);
  };

  return (
    // Form implementation using shadcn/ui Form components
    // with fields for name, SKU, type, category, weight, carton size, cost
    null
  );
}
```

### Prisma + Supabase Connection
```prisma
// prisma/schema.prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")        // Pooled connection (Supavisor)
  directUrl = env("DIRECT_URL")           // Direct connection for migrations
}

generator client {
  provider = "prisma-client-js"
}
```

```env
# .env.local
DATABASE_URL="postgres://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgres://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT-REF].supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="eyJ..."
SUPABASE_SERVICE_ROLE_KEY="eyJ..."  # For admin operations only, never expose to client
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@supabase/auth-helpers-nextjs` | `@supabase/ssr` | 2024 | New package handles cookie-based sessions for App Router SSR; old helpers deprecated |
| NextAuth.js / Auth.js | Supabase Auth (built-in) or Better Auth | Sept 2025 (Auth.js -> Better Auth merger) | Auth.js is maintenance mode only; Supabase Auth is the simpler choice when already using Supabase |
| Tailwind CSS v3 (JS config) | Tailwind CSS v4 (CSS config) | 2025 | No `tailwind.config.js` needed; configuration in CSS; 5x faster |
| shadcn/ui manual setup | shadcn CLI v4 `init -t next` | March 2026 | CLI scaffolds entire Next.js project with theming, Base UI or Radix choice |
| Prisma 5/6 `@prisma/client` generator | Prisma 7 (prisma-client default generator) | 2025 | Simplified generator config; improved performance |
| Next.js Pages Router | Next.js App Router (default since v13.4) | 2023+ | Server Components, streaming, file-based layouts. App Router is the only recommended approach for new projects. |
| middleware.ts | Still middleware.ts (proxy.ts is for request proxy, different purpose) | 2026 | Note: proxy.ts in Next.js 16 is a new request proxy feature, NOT a replacement for middleware.ts |

**Deprecated/outdated:**
- `@supabase/auth-helpers-nextjs`: Replaced by `@supabase/ssr`. Do not use.
- Auth.js / NextAuth: In maintenance mode since Sept 2025. Do not use for new projects.
- `getSession()` for auth checks: Use `getUser()` or `getClaims()` instead -- they validate the JWT, while `getSession()` only reads the cookie without verification.
- Tailwind CSS `tailwind.config.js`: Replaced by CSS-based configuration in v4.
- Pages Router for new projects: App Router is the standard.

## Open Questions

1. **Prisma schema design for items: should `stockQty` use milligrams for ALL item types including packaging?**
   - What we know: Weight items (raw materials, semi-finished, finished) naturally use milligrams. Packaging items are counted in pieces.
   - What's unclear: Should `stock_qty` be milligrams for weight items and pieces for packaging, stored in the same column? Or separate columns?
   - Recommendation: Use a single `stock_qty` column. The `unit` field on the item determines interpretation: `GRAMS` means stock_qty is in milligrams, `PIECES` means stock_qty is in pieces. The column name `stock_qty` is unit-agnostic. Document this convention clearly.

2. **Admin user bootstrapping: how does the first admin user get created?**
   - What we know: Supabase Auth creates the first user. The `user_roles` entry must be created too.
   - What's unclear: No admin UI exists until an admin can log in.
   - Recommendation: Use a Prisma seed script (`prisma/seed.ts`) that creates the initial admin user via Supabase Admin API and inserts the `user_roles` record. This runs once during initial setup.

3. **Should the profiles table duplicate Supabase auth.users data?**
   - What we know: Supabase Auth stores email, metadata in `auth.users`. Prisma cannot directly model `auth.users` (it is in the `auth` schema, not `public`).
   - What's unclear: How much user data to duplicate in a Prisma-managed `profiles` table vs. querying Supabase Auth API.
   - Recommendation: Create a minimal `profiles` table (id UUID primary key referencing auth.users.id, full_name, created_at). Keep `user_roles` as a separate table (matches Supabase RBAC docs pattern). Do NOT duplicate email in profiles -- read it from Supabase Auth when needed.

4. **SKU format convention (ITEM-03): what format should the legend prescribe?**
   - What we know: ITEM-03 requires a "SKU legend with uniform format guide."
   - What's unclear: The exact SKU format has not been defined by the owner.
   - Recommendation: Use a simple pattern like `{TYPE_PREFIX}-{CATEGORY_CODE}-{SEQ}`. Example: `RM-DC-001` (Raw Material, Dairy & Cream, sequence 001). Display the legend as a reference page. Make SKU editable (not auto-generated) so the owner can use their existing codes if they have them.

## Sources

### Primary (HIGH confidence)
- [Supabase Auth SSR setup for Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs) - middleware pattern, client creation, route protection
- [Supabase Custom Claims & RBAC](https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac) - JWT hook, authorize function, RLS policies
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) - policy syntax, USING/WITH CHECK
- [Supabase + Prisma integration](https://supabase.com/docs/guides/database/prisma) - connection strings, pooling, schema setup
- [Next.js Project Structure](https://nextjs.org/docs/app/getting-started/project-structure) - file conventions, route groups, layout hierarchy
- [Next.js App Router](https://nextjs.org/docs/app) - Server Components, Server Actions, middleware
- [Prisma Schema Reference](https://www.prisma.io/docs/orm/reference/prisma-schema-reference) - native types, enums, relations, @map
- [shadcn/ui Next.js Installation](https://ui.shadcn.com/docs/installation/next) - CLI init, component adding
- [shadcn/ui Data Table](https://ui.shadcn.com/docs/components/radix/data-table) - TanStack Table integration pattern

### Secondary (MEDIUM confidence)
- [Supabase RBAC Discussion #346](https://github.com/orgs/supabase/discussions/346) - community patterns for role-based access
- [Supabase RLS Complete Guide 2026](https://designrevision.com/blog/supabase-row-level-security) - practical RLS examples
- [shadcn Dashboard Tutorial 2026](https://designrevision.com/blog/shadcn-dashboard-tutorial) - dashboard layout patterns with shadcn/ui
- [React Hook Form + Zod + Server Actions pattern](https://nehalist.io/react-hook-form-with-nextjs-server-actions/) - verified form handling pattern

### Tertiary (LOW confidence)
- [Auth.js/Better Auth merger](https://dev.to/pipipi-dev/nextauthjs-to-better-auth-why-i-switched-auth-libraries-31h3) - community source on Auth.js deprecation status; confirms not to use Auth.js for new projects

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries verified against official docs with current versions; established integration patterns between Supabase + Prisma + Next.js
- Architecture: HIGH - Modular monolith with layered separation, ledger pattern, unified items table are well-established patterns verified across multiple domain sources
- Pitfalls: HIGH - All six critical pitfalls from research are domain-specific and multi-source verified; Phase 1 prevention strategies are straightforward (integer types, ledger pattern, atomic transactions)
- Auth/RBAC: HIGH - Supabase custom claims RBAC pattern is documented in official Supabase docs with exact SQL and code examples

**Research date:** 2026-03-09
**Valid until:** 2026-04-09 (30 days -- stable stack, no fast-moving dependencies)
