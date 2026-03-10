-- RLS Policies for sales_uploads and sales_lines tables
-- =====================================================
--
-- This SQL must be run in the Supabase SQL Editor AFTER the sales tables
-- have been created by `pnpm db:push` (which reads the Prisma schema).
--
-- Follows the same authorize() pattern from 00001_rbac_setup.sql.

-- ============================================
-- 1. Enable RLS on sales_uploads
-- ============================================

ALTER TABLE public.sales_uploads ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. RLS Policies for sales_uploads
-- ============================================

-- All authenticated users can read sales uploads (viewer+)
CREATE POLICY "sales_uploads_select" ON public.sales_uploads
  FOR SELECT TO authenticated
  USING ((SELECT public.authorize('viewer')));

-- Staff and admin can insert sales uploads
CREATE POLICY "sales_uploads_insert" ON public.sales_uploads
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.authorize('staff')));

-- Staff and admin can update sales uploads
CREATE POLICY "sales_uploads_update" ON public.sales_uploads
  FOR UPDATE TO authenticated
  USING ((SELECT public.authorize('staff')));

-- ============================================
-- 3. Enable RLS on sales_lines
-- ============================================

ALTER TABLE public.sales_lines ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. RLS Policies for sales_lines
-- ============================================

-- All authenticated users can read sales lines (viewer+)
CREATE POLICY "sales_lines_select" ON public.sales_lines
  FOR SELECT TO authenticated
  USING ((SELECT public.authorize('viewer')));

-- Staff and admin can insert sales lines
CREATE POLICY "sales_lines_insert" ON public.sales_lines
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.authorize('staff')));

-- Staff and admin can update sales lines
CREATE POLICY "sales_lines_update" ON public.sales_lines
  FOR UPDATE TO authenticated
  USING ((SELECT public.authorize('staff')));
