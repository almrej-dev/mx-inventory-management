import Link from 'next/link';
import { getProducts } from '@/actions/products';
import { ProductTable } from '@/components/products/product-table';
import { Button } from '@/components/ui/button';
import { RoleGate } from '@/components/layout/role-gate';
import { getAuth } from '@/lib/auth';
import { Plus } from 'lucide-react';

export default async function SemiFinishedProductsPage() {
  const { userRole } = await getAuth();
  const result = await getProducts('SEMI_FINISHED');

  if (result.error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Semi-finished Products</h1>
        <p className="text-sm text-destructive">
          Error loading products: {result.error}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Semi-finished Products</h1>
          <p className="text-sm text-muted-foreground">
            Manage recipes for semi-finished products and intermediate
            components.
          </p>
        </div>
        <RoleGate allowedRoles={['admin', 'staff']} userRole={userRole}>
          <Link href="/products/semi-finished/new">
            <Button>
              <Plus className="mr-1 h-4 w-4" />
              New
            </Button>
          </Link>
        </RoleGate>
      </div>

      <ProductTable data={result.products || []} newHref="/products/semi-finished/new" />
    </div>
  );
}
