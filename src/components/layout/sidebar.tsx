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
  BookOpen,
  ClipboardList,
  History,
  Users,
  FileUp,
  PenLine,
  ReceiptText,
} from "lucide-react";

interface SidebarProps {
  userRole: AppRole;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: AppRole[];
}

interface NavSection {
  label: string;
  roles: AppRole[];
  items: NavItem[];
}

type NavEntry = NavItem | NavSection;

function isSection(entry: NavEntry): entry is NavSection {
  return "items" in entry;
}

const navigation: NavEntry[] = [
  {
    name: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    roles: ["admin", "staff", "viewer"],
  },
  {
    name: "Items",
    href: "/items",
    icon: Package,
    roles: ["admin", "staff", "viewer"],
  },
  {
    label: "Recipes",
    roles: ["admin", "staff", "viewer"],
    items: [
      {
        name: "All Recipes",
        href: "/recipes",
        icon: BookOpen,
        roles: ["admin", "staff", "viewer"],
      },
    ],
  },
  {
    label: "Sales",
    roles: ["admin", "staff", "viewer"],
    items: [
      {
        name: "Upload Sales",
        href: "/sales/upload",
        icon: FileUp,
        roles: ["admin", "staff"],
      },
      {
        name: "Manual Entry",
        href: "/sales/manual",
        icon: PenLine,
        roles: ["admin", "staff"],
      },
      {
        name: "Sales History",
        href: "/sales/history",
        icon: ReceiptText,
        roles: ["admin", "staff", "viewer"],
      },
    ],
  },
  {
    label: "Stock",
    roles: ["admin", "staff", "viewer"],
    items: [
      {
        name: "Receiving",
        href: "/stock/receiving",
        icon: ClipboardList,
        roles: ["admin", "staff"],
      },
      {
        name: "History",
        href: "/stock/history",
        icon: History,
        roles: ["admin", "staff", "viewer"],
      },
    ],
  },
  {
    name: "Users",
    href: "/users",
    icon: Users,
    roles: ["admin"],
  },
];

function NavLink({
  item,
  pathname,
}: {
  item: NavItem;
  pathname: string;
}) {
  const isActive =
    item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
  return (
    <Link href={item.href}>
      <Button
        variant={isActive ? "secondary" : "ghost"}
        className={cn("w-full justify-start gap-2")}
      >
        <item.icon className="h-4 w-4" />
        {item.name}
      </Button>
    </Link>
  );
}

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
        {navigation.map((entry) => {
          if (isSection(entry)) {
            // Check if any items in the section are visible to this role
            const visibleItems = entry.items.filter((item) =>
              item.roles.includes(userRole)
            );
            if (visibleItems.length === 0) return null;

            return (
              <div key={entry.label} className="pt-3">
                <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {entry.label}
                </p>
                <div className="space-y-1">
                  {visibleItems.map((item) => (
                    <RoleGate
                      key={item.href}
                      allowedRoles={item.roles}
                      userRole={userRole}
                    >
                      <NavLink item={item} pathname={pathname} />
                    </RoleGate>
                  ))}
                </div>
              </div>
            );
          }

          // Single nav item
          return (
            <RoleGate
              key={entry.href}
              allowedRoles={entry.roles}
              userRole={userRole}
            >
              <NavLink item={entry} pathname={pathname} />
            </RoleGate>
          );
        })}
      </nav>
    </aside>
  );
}
