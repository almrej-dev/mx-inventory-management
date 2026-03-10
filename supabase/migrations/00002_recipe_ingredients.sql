-- RLS Policies for recipe_ingredients table
-- ==========================================
--
-- This SQL must be run in the Supabase SQL Editor AFTER the recipe_ingredients
-- table has been created by `pnpm db:push` (which reads the Prisma schema).
--
-- Follows the same authorize() pattern from 00001_rbac_setup.sql.

-- ============================================
-- 1. Enable RLS on recipe_ingredients
-- ============================================

ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. RLS Policies for recipe_ingredients
-- ============================================

-- All authenticated users can read recipe ingredients (viewer+)
CREATE POLICY "recipe_ingredients_select" ON public.recipe_ingredients
  FOR SELECT TO authenticated
  USING ((SELECT public.authorize('viewer')));

-- Staff and admin can insert recipe ingredients
CREATE POLICY "recipe_ingredients_insert" ON public.recipe_ingredients
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.authorize('staff')));

-- Staff and admin can update recipe ingredients
CREATE POLICY "recipe_ingredients_update" ON public.recipe_ingredients
  FOR UPDATE TO authenticated
  USING ((SELECT public.authorize('staff')));

-- Staff and admin can delete recipe ingredients (needed for recipe updates that delete+recreate ingredients)
CREATE POLICY "recipe_ingredients_delete" ON public.recipe_ingredients
  FOR DELETE TO authenticated
  USING ((SELECT public.authorize('staff')));
