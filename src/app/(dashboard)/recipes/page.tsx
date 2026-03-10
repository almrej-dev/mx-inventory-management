import Link from "next/link";
import { getRecipes } from "@/actions/recipes";
import { RecipeTable } from "@/components/recipes/recipe-table";
import { Button } from "@/components/ui/button";
import { RoleGate } from "@/components/layout/role-gate";
import { getAuth } from "@/lib/auth";
import { Plus } from "lucide-react";

export default async function RecipesPage() {
  const { userRole } = await getAuth();
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
