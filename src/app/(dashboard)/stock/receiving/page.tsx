import { prisma } from "@/lib/prisma";
import { ReceivingForm } from "@/components/stock/receiving-form";

export default async function StockReceivingPage() {
  // Load active items for the item selector
  const items = await prisma.item.findMany({
    select: {
      id: true,
      name: true,
      sku: true,
      type: true,
      cartonSize: true,
      unitWeightMg: true,
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Record Stock Receiving
        </h1>
        <p className="text-muted-foreground">
          Record incoming inventory by selecting an item and entering the
          quantity in cartons.
        </p>
      </div>
      <ReceivingForm items={items} />
    </div>
  );
}
