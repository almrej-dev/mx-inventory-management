"use client";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ITEM_TYPES } from "@/lib/constants";
import { mgToGrams, centavosToPesos } from "@/lib/utils";
import type { BomLine } from "@/lib/bom";

const typeLabels: Record<string, string> = {};
for (const t of ITEM_TYPES) {
  typeLabels[t.value] = t.label;
}

const typeBadgeVariants: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  RAW_MATERIAL: "default",
  SEMI_FINISHED: "secondary",
  FINISHED: "outline",
  PACKAGING: "secondary",
};

interface BomPreviewProps {
  bom: BomLine[];
  totalCostCentavos: number;
}

export function BomPreview({ bom, totalCostCentavos }: BomPreviewProps) {
  if (bom.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No ingredients defined for this product.
      </p>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Quantity</TableHead>
            <TableHead className="text-right">Unit Cost</TableHead>
            <TableHead className="text-right">Line Cost</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bom.map((line) => (
            <TableRow key={line.itemId}>
              <TableCell className="font-medium">{line.itemName}</TableCell>
              <TableCell>
                <span className="font-mono text-xs">{line.itemSku}</span>
              </TableCell>
              <TableCell>
                <Badge
                  variant={typeBadgeVariants[line.itemType] || "default"}
                >
                  {typeLabels[line.itemType] || line.itemType}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                {line.quantityPieces > 0
                  ? `${line.quantityPieces} pcs`
                  : `${mgToGrams(line.quantityMg)}g`}
              </TableCell>
              <TableCell className="text-right">
                PHP {centavosToPesos(line.unitCostCentavos)}
              </TableCell>
              <TableCell className="text-right">
                PHP {centavosToPesos(line.lineCostCentavos)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={5} className="font-semibold">
              Total Cost
            </TableCell>
            <TableCell className="text-right font-semibold">
              PHP {centavosToPesos(totalCostCentavos)}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}
