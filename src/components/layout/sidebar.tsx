"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { RoleGate } from "@/components/layout/role-gate";
import type { AppRole } from "@/types";
import {
  LayoutDashboard,
  Package,
  ClipboardList,
  Users,
} from "lucide-react";

interface SidebarProps {
  userRole: AppRole;
}

const navigation = [
  {
    name: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    roles: ["admin", "staff", "viewer"] as AppRole[],
  },
  {
    name: "Items",
    href: "/items",
    icon: Package,
    roles: ["admin", "staff", "viewer"] as AppRole[],
  },
  {
    name: "Stock Receiving",
    href: "/stock/receiving",
    icon: ClipboardList,
    roles: ["admin", "staff"] as AppRole[],
  },
  {
    name: "Users",
    href: "/users",
    icon: Users,
    roles: ["admin"] as AppRole[],
  },
];

export function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-card">
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/" className="text-lg font-semibold">
          Inventory
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-2">
        {navigation.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <RoleGate
              key={item.href}
              allowedRoles={item.roles}
              userRole={userRole}
            >
              <Link href={item.href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn("w-full justify-start gap-2")}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Button>
              </Link>
            </RoleGate>
          );
        })}
      </nav>
    </aside>
  );
}
