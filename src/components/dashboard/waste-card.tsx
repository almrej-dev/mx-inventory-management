import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card";
import Link from "next/link";
import { ChevronRight, Trash2 } from "lucide-react";
import { formatPesos } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface WasteItem {
  id: number;
  itemName: string;
  quantity: number;
  costCentavos: number;
  createdAt: Date;
}

interface WasteCardProps {
  todayCentavos: number;
  yesterdayCentavos: number;
  weekCentavos: number;
  recentItems: WasteItem[];
}

export function WasteCard({
  todayCentavos,
  yesterdayCentavos,
  weekCentavos,
  recentItems,
}: WasteCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Waste</CardTitle>
        <CardAction>
          <Link
            href="/stock/waste"
            className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Waste report
            <ChevronRight className="h-3 w-3" />
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Today
            </p>
            <p className="text-base font-bold text-red-600 dark:text-red-400">
              {formatPesos(todayCentavos)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Yesterday
            </p>
            <p className="text-base font-bold text-red-600 dark:text-red-400">
              {formatPesos(yesterdayCentavos)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              This week
            </p>
            <p className="text-base font-bold text-red-600 dark:text-red-400">
              {formatPesos(weekCentavos)}
            </p>
          </div>
        </div>

        {recentItems.length === 0 ? (
          <div className="flex items-center gap-2 rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
            <Trash2 className="h-4 w-4" />
            No waste recorded this week
          </div>
        ) : (
          <div className="space-y-2">
            {recentItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{item.itemName}</p>
                  <p className="text-xs text-muted-foreground">
                    qty {item.quantity.toLocaleString()} &middot;{" "}
                    {formatDistanceToNow(new Date(item.createdAt), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
                <span className="text-sm font-semibold text-red-600 dark:text-red-400 shrink-0 ml-2">
                  {formatPesos(item.costCentavos)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
