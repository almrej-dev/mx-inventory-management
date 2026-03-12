import { prisma } from "@/lib/prisma";
import { WasteForm } from "@/components/stock/waste-form";

export default async function WastePage() {
  const items = await prisma.item.findMany({
    select: {
      id: true,
      name: true,
      sku: true,
      type: true,
      unitType: true,
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Record Waste</h1>
        <p className="text-muted-foreground">
          Log spoilage, expiration, or damaged stock. Stock levels will be
          adjusted automatically.
        </p>
      </div>

      <WasteForm items={items} />
    </div>
  );
}
