import { notFound } from "next/navigation";
import Link from "next/link";
import { getRecipe, getRecipeBom } from "@/actions/recipes";
import { BomPreview } from "@/components/recipes/bom-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RoleGate } from "@/components/layout/role-gate";
import { createClient } from "@/lib/supabase/server";
import { jwtDecode } from "jwt-decode";
import { ITEM_TYPES } from "@/lib/constants";
import { Pencil } from "lucide-react";
import type { AppRole } from "@/types";

interface JwtPayload {
  user_role?: AppRole;
}

const typeLabels: Record<string, string> = {};
for (const t of ITEM_TYPES) {
  typeLabels[t.value] = t.label;
}

interface RecipeDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function RecipeDetailPage({
  params,
}: RecipeDetailPageProps) {
  const { id } = await params;
  const itemId = parseInt(id, 10);

  if (isNaN(itemId)) {
    notFound();
  }

  const [recipe, bomResult] = await Promise.all([
    getRecipe(itemId),
    getRecipeBom(itemId),
  ]);

  if (!recipe) {
    notFound();
  }

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{recipe.name}</h1>
            <Badge variant="outline">{typeLabels[recipe.type] || recipe.type}</Badge>
          </div>
          <p className="font-mono text-sm text-muted-foreground">
            {recipe.sku}
          </p>
        </div>
        <RoleGate allowedRoles={["admin", "staff"]} userRole={userRole}>
          <Link href={`/recipes/${recipe.id}/edit`}>
            <Button variant="outline">
              <Pencil className="mr-1 h-4 w-4" />
              Edit Recipe
            </Button>
          </Link>
        </RoleGate>
      </div>

      {/* Direct Ingredients */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Direct Ingredients</h2>
        <div className="rounded-lg border">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-2 text-left text-sm font-medium">
                  Ingredient
                </th>
                <th className="px-4 py-2 text-left text-sm font-medium">
                  SKU
                </th>
                <th className="px-4 py-2 text-left text-sm font-medium">
                  Type
                </th>
                <th className="px-4 py-2 text-right text-sm font-medium">
                  Quantity
                </th>
              </tr>
            </thead>
            <tbody>
              {recipe.ingredients.map((ing) => (
                <tr key={ing.childItemId} className="border-b last:border-b-0">
                  <td className="px-4 py-2 text-sm font-medium">
                    {ing.childItemName}
                  </td>
                  <td className="px-4 py-2">
                    <span className="font-mono text-xs">{ing.childItemSku}</span>
                  </td>
                  <td className="px-4 py-2">
                    <Badge variant="secondary" className="text-xs">
                      {typeLabels[ing.childItemType] || ing.childItemType}
                    </Badge>
                  </td>
                  <td className="px-4 py-2 text-right text-sm">
                    {ing.childItemType === "PACKAGING"
                      ? `${ing.quantityPieces} pcs`
                      : `${ing.quantityGrams}g`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Full BOM Breakdown */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Full BOM Breakdown</h2>
        <p className="text-sm text-muted-foreground">
          All leaf-level raw materials and packaging items across all recipe
          levels, with computed costs.
        </p>
        {bomResult.error ? (
          <p className="text-sm text-destructive">{bomResult.error}</p>
        ) : (
          <BomPreview
            bom={bomResult.bom || []}
            totalCostCentavos={bomResult.totalCostCentavos || 0}
          />
        )}
      </div>

      {/* Back Link */}
      <div>
        <Link href="/recipes">
          <Button variant="outline">Back to Recipes</Button>
        </Link>
      </div>
    </div>
  );
}
