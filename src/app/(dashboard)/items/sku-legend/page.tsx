import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";

const typePrefixes = [
  { prefix: "RM", meaning: "Raw Material", example: "RM-DC-001" },
  { prefix: "SF", meaning: "Semi-Finished", example: "SF-FL-003" },
  { prefix: "FN", meaning: "Finished Product", example: "FN-IC-001" },
  { prefix: "PK", meaning: "Packaging", example: "PK-CP-001" },
];

const categoryCodes = [
  { code: "DC", meaning: "Dairy & Cream", example: "Fresh Cream, Milk" },
  { code: "FL", meaning: "Flavorings", example: "Matcha Syrup, Vanilla Extract" },
  { code: "FR", meaning: "Fruits", example: "Mango Puree, Strawberry" },
  { code: "SW", meaning: "Sweeteners", example: "Sugar, Condensed Milk" },
  { code: "IC", meaning: "Ice Cream", example: "Vanilla Ice Cream" },
  { code: "BK", meaning: "Bakery", example: "Waffle Cone, Cookie" },
  { code: "TP", meaning: "Toppings", example: "Oreo Crumbs, Sprinkles" },
  { code: "CP", meaning: "Cups & Containers", example: "Medium Cup, Pint Tub" },
  { code: "SP", meaning: "Spoons & Utensils", example: "Tasting Spoon, Paddle" },
  { code: "LB", meaning: "Labels & Stickers", example: "Brand Label" },
];

const exampleSkus = [
  { sku: "RM-DC-001", item: "Fresh Cream (1L)", type: "Raw Material" },
  { sku: "RM-FL-002", item: "Vanilla Extract (250ml)", type: "Raw Material" },
  { sku: "SF-IC-001", item: "Vanilla Ice Cream Base", type: "Semi-Finished" },
  { sku: "FN-IC-001", item: "Vanilla Ice Cream (Pint)", type: "Finished" },
  { sku: "FN-IC-002", item: "Chocolate Ice Cream (Pint)", type: "Finished" },
  { sku: "PK-CP-001", item: "Medium Cup (12oz)", type: "Packaging" },
  { sku: "PK-SP-001", item: "Tasting Spoon", type: "Packaging" },
];

export default function SkuLegendPage() {
  return (
    <div className="max-w-3xl space-y-8">
      <div className="flex items-center gap-3">
        <Link href="/items">
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">SKU Format Guide</h1>
          <p className="text-sm text-muted-foreground">
            Reference for creating consistent item SKU codes.
          </p>
        </div>
      </div>

      {/* Format explanation */}
      <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
        <h2 className="font-semibold">Format</h2>
        <p className="font-mono text-lg">
          {"{TYPE}"}-{"{CATEGORY}"}-{"{SEQ}"}
        </p>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>
            <strong>TYPE</strong> -- 2-letter prefix for item type
          </li>
          <li>
            <strong>CATEGORY</strong> -- 2-letter code for item category
          </li>
          <li>
            <strong>SEQ</strong> -- 3-digit sequence number (001-999)
          </li>
        </ul>
      </div>

      {/* Type prefixes */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Type Prefixes</h2>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Prefix</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Example</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {typePrefixes.map((t) => (
                <TableRow key={t.prefix}>
                  <TableCell className="font-mono font-semibold">
                    {t.prefix}
                  </TableCell>
                  <TableCell>{t.meaning}</TableCell>
                  <TableCell className="font-mono text-muted-foreground">
                    {t.example}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Category codes */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Suggested Category Codes</h2>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Examples</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categoryCodes.map((c) => (
                <TableRow key={c.code}>
                  <TableCell className="font-mono font-semibold">
                    {c.code}
                  </TableCell>
                  <TableCell>{c.meaning}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.example}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Example SKUs */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Example SKUs</h2>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exampleSkus.map((e) => (
                <TableRow key={e.sku}>
                  <TableCell className="font-mono font-semibold">
                    {e.sku}
                  </TableCell>
                  <TableCell>{e.item}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {e.type}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Note */}
      <div className="rounded-lg border bg-muted/50 p-4 text-sm text-muted-foreground">
        <p>
          <strong>Note:</strong> SKUs are editable and not auto-generated. If
          you already have your own SKU codes, use those instead. This guide is a
          suggestion for consistency.
        </p>
      </div>

      <div>
        <Link href="/items">
          <Button variant="outline">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Items
          </Button>
        </Link>
      </div>
    </div>
  );
}
