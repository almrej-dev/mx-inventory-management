import { notFound } from "next/navigation";
import { getItem } from "@/actions/items";
import { EditItemClient } from "./edit-client";

interface EditItemPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditItemPage({ params }: EditItemPageProps) {
  const { id } = await params;
  const itemId = parseInt(id, 10);

  if (isNaN(itemId)) {
    notFound();
  }

  const item = await getItem(itemId);

  if (!item) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <EditItemClient item={item} />
    </div>
  );
}
