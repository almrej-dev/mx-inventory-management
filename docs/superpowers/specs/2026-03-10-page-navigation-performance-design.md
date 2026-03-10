# Page Navigation Performance Fix

## Problem

Every page-to-page navigation in the dashboard feels slow. Root causes:

1. **No loading states** — Next.js blocks UI until all server-side data fetching completes
2. **Redundant auth calls** — Dashboard layout makes 3 async calls (getUser, getSession, prisma profile lookup), and 3 pages make their own duplicate auth calls on top of that
3. **No request-level deduplication** — Layout and page auth calls are independent, resulting in 4-5 network round-trips per navigation

## Solution

### 1. Cached auth helper (`src/lib/auth.ts`)

Create a `getAuth()` function wrapped in React `cache()`:
- Calls `getUser()`, `getSession()`, and prisma profile lookup once per request
- Returns `{ user, session, userRole, userName }`
- Layout and pages share the same cached result within a single request

### 2. Skeleton loading state

- Add `src/components/ui/skeleton.tsx` (shadcn skeleton component)
- Add `src/app/(dashboard)/loading.tsx` with a lightweight skeleton matching the dashboard shell
- Next.js shows this instantly during navigation instead of blocking

### 3. Simplify layout and pages

- Dashboard layout (`src/app/(dashboard)/layout.tsx`) switches to `getAuth()`
- 3 pages with duplicate auth calls switch to `getAuth()`:
  - `src/app/(dashboard)/items/page.tsx`
  - `src/app/(dashboard)/recipes/page.tsx`
  - `src/app/(dashboard)/recipes/[id]/page.tsx`

## What stays the same

- `src/proxy.ts` (Next.js 16 edge proxy — already handles session refresh)
- All existing components, props, and role-gating logic
- Dashboard page's 11 parallel queries (already parallelized)
- Supabase client creation in `src/lib/supabase/server.ts`

## Files changed

| File | Action |
|------|--------|
| `src/lib/auth.ts` | New — cached auth helper |
| `src/components/ui/skeleton.tsx` | New — skeleton component |
| `src/app/(dashboard)/loading.tsx` | New — loading state |
| `src/app/(dashboard)/layout.tsx` | Edit — use getAuth() |
| `src/app/(dashboard)/items/page.tsx` | Edit — use getAuth() |
| `src/app/(dashboard)/recipes/page.tsx` | Edit — use getAuth() |
| `src/app/(dashboard)/recipes/[id]/page.tsx` | Edit — use getAuth() |
