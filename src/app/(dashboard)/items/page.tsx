import Link from "next/link";
import { getItems } from "@/actions/items";
import { ItemTable } from "@/components/items/item-table";
import { Button } from "@/components/ui/button";
import { RoleGate } from "@/components/layout/role-gate";
import { getAuth } from "@/lib/auth";
import { Plus } from "lucide-react";

export default async function ItemsPage() {
  const [{ userRole }, result] = await Promise.all([getAuth(), getItems()]);

  if (result.error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Items</h1>
        <p className="text-sm text-destructive">
          Error loading items: {result.error}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Items</h1>
          <p className="text-sm text-muted-foreground">
            Manage inventory items across all types.
          </p>
        </div>
        <RoleGate
          allowedRoles={["admin", "staff"]}
          userRole={userRole}
        >
          <Link href="/items/new">
            <Button>
              <Plus className="mr-1 h-4 w-4" />
              Add Item
            </Button>
          </Link>
        </RoleGate>
      </div>

      <ItemTable data={result.items || []} />
    </div>
  );
}
