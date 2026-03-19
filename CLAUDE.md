# MX Inventory — Claude Code Guidelines

## Project Overview

MX Inventory is a production inventory management system for a food manufacturing company (ice cream/food production). It tracks raw materials, semi-finished products, finished goods, and packaging through receiving, sales, waste, and reconciliation workflows.

**Roles:** Admin (full control) · Staff (data entry) · Viewer (read-only)
**Currency:** Philippine Pesos (centavos internally)
**Units:** Milligrams/grams for weight

## Tech Stack

- **Framework:** Next.js (App Router) + TypeScript
- **UI Components:** Shadcn UI + Base UI React primitives
- **Styling:** Tailwind CSS 4 with OKLCH color tokens
- **Forms:** React Hook Form + Zod
- **Tables:** TanStack React Table
- **Charts:** Recharts
- **Icons:** Lucide React
- **Auth/DB:** Supabase + Prisma (PostgreSQL)
- **Package manager:** pnpm

## Design Context

### Users

Primarily **operations staff and management** at a food production facility in the Philippines. Staff use it daily for data entry (receiving, sales recording, waste logging). Management uses dashboards to track stock levels and production health. Users range from technically proficient admins to non-technical floor staff — the interface must be legible and task-focused without demanding technical literacy.

### Brand Personality

**Professional · Trustworthy · Precise**

The system handles real production data that directly affects business operations. Users should feel confident and in control — like the data is accurate and the system is solid. There is no room for playfulness here; the tone is calm competence.

### Aesthetic Direction

**Clean and minimal — data-forward, like Linear or Vercel's dashboard.**

- Generous whitespace; let data breathe
- Subtle dividers over hard borders
- Typography carries hierarchy, not color
- Monochromatic palette — no brand accent color; near-black/white base with OKLCH variables
- Blue-purple range reserved exclusively for chart data visualization
- Both light and dark mode fully supported via CSS variables
- Geist (sans) as the primary font, Geist Mono for numeric/code contexts

Anti-references: avoid anything that looks playful, consumer-app-like, or cluttered. No gradients, decorative illustrations, or heavy shadows.

### Design Principles

1. **Data is the hero.** Every design decision serves legibility of numbers, statuses, and trends. Never decorate at the expense of clarity.

2. **Confidence through consistency.** Spacing, typography, and component patterns must be predictable and uniform. Inconsistency signals unreliability to users who depend on this data daily.

3. **Earn trust through contrast.** Maintain WCAG AA (4.5:1) contrast ratios at minimum across all text. Low contrast undermines professional credibility.

4. **Minimal visual weight.** Use `text-muted-foreground`, subtle borders (`ring-1 ring-foreground/10`), and restrained spacing. Add visual emphasis only when it aids task completion.

5. **Dark mode is first-class.** Every component, chart, and layout must look intentional in dark mode — not merely "inverted." Verify in both themes before shipping any UI.

## Design Tokens (Key References)

- **Global styles:** `src/app/globals.css`
- **Component library:** `src/components/ui/`
- **Color space:** OKLCH throughout — do not introduce hex/rgb colors
- **Border radius base:** `0.625rem` (use `--radius-*` variables, not hardcoded values)
- **Font:** `var(--font-sans)` (Geist), `var(--font-mono)` (Geist Mono)

## Component Conventions

- Use `cn()` (clsx + tailwind-merge) for all class composition
- Prefer Shadcn component variants over one-off utility overrides
- Button sizes: `xs · sm · default · lg · icon · icon-xs · icon-sm · icon-lg`
- Cards use compound pattern: `Card > CardHeader > CardTitle/CardDescription + CardContent > CardFooter`
- Role-based UI visibility: use `RoleGate` component
- Icons: always `h-4 w-4` (default) or `h-3 w-3` (small contexts)
