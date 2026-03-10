import Link from "next/link";
import { getRecipes } from "@/actions/recipes";
import { RecipeTable } from "@/components/recipes/recipe-table";
import { Button } from "@/components/ui/button";
import { RoleGate } from "@/components/layout/role-gate";
import { createClient } from "@/lib/supabase/server";
import { jwtDecode } from "jwt-decode";
import { Plus } from "lucide-react";
import type { AppRole } from "@/types";

interface JwtPayload {
  user_role?: AppRole;
}

export default async function RecipesPage() {
  // Get user role for conditional UI
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  let userRole: AppRole = "viewer";
  if (session) {
    const jwt = jwtDecode<JwtPayload>(session.access_token);
    userRole = jwt.user_role || "viewer";
  }

  const result = await getRecipes();

  if (result.error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Recipes</h1>
        <p className="text-sm text-destructive">
          Error loading recipes: {result.error}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Recipes</h1>
          <p className="text-sm text-muted-foreground">
            Manage product recipes and ingredient compositions.
          </p>
        </div>
        <RoleGate allowedRoles={["admin", "staff"]} userRole={userRole}>
          <Link href="/recipes/new">
            <Button>
              <Plus className="mr-1 h-4 w-4" />
              New Recipe
            </Button>
          </Link>
        </RoleGate>
      </div>

      <RecipeTable data={result.recipes || []} />
    </div>
  );
}
