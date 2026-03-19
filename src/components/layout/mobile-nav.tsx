'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetTrigger, SheetContent, SheetClose } from '@/components/ui/sheet';
import { RoleGate } from '@/components/layout/role-gate';
import type { AppRole } from '@/types';
import {
  LayoutDashboard,
  Package,
  Layers,
  Package2,
  ClipboardList,
  ScrollText,
  Users,
  FileUp,
  PenLine,
  ReceiptText,
  BarChart3,
  Trash2,
  ClipboardCheck,
  ScanLine,
  Menu,
  XIcon,
} from 'lucide-react';

interface MobileNavProps {
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
  return 'items' in entry;
}

const navigation: NavEntry[] = [
  {
    name: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
    roles: ['admin', 'staff', 'viewer'],
  },
  {
    name: 'Items',
    href: '/items',
    icon: Package,
    roles: ['admin', 'staff', 'viewer'],
  },
  {
    label: 'Products',
    roles: ['admin', 'staff', 'viewer'],
    items: [
      {
        name: 'Semi-finished',
        href: '/products/semi-finished',
        icon: Layers,
        roles: ['admin', 'staff', 'viewer'],
      },
      {
        name: 'Finished',
        href: '/products/finished',
        icon: Package2,
        roles: ['admin', 'staff', 'viewer'],
      },
    ],
  },
  {
    label: 'Sales',
    roles: ['admin', 'staff', 'viewer'],
    items: [
      {
        name: 'Upload Sales',
        href: '/sales/upload',
        icon: FileUp,
        roles: ['admin', 'staff'],
      },
      {
        name: 'Manual Entry',
        href: '/sales/manual',
        icon: PenLine,
        roles: ['admin', 'staff'],
      },
      {
        name: 'Sales History',
        href: '/sales/history',
        icon: ReceiptText,
        roles: ['admin', 'staff', 'viewer'],
      },
    ],
  },
  {
    name: 'Z-Reading',
    href: '/z-reading',
    icon: ScanLine,
    roles: ['admin', 'staff', 'viewer'],
  },
  {
    name: 'Reports',
    href: '/reports',
    icon: BarChart3,
    roles: ['admin', 'staff', 'viewer'],
  },
  {
    label: 'Stock',
    roles: ['admin', 'staff', 'viewer'],
    items: [
      {
        name: 'Receiving',
        href: '/stock/receiving',
        icon: ClipboardList,
        roles: ['admin', 'staff'],
      },
      {
        name: 'Waste',
        href: '/stock/waste',
        icon: Trash2,
        roles: ['admin', 'staff'],
      },
      {
        name: 'Reconciliation',
        href: '/stock/reconciliation',
        icon: ClipboardCheck,
        roles: ['admin', 'staff'],
      },
    ],
  },
  {
    label: 'Management',
    roles: ['admin'],
    items: [
      { name: 'Users', href: '/users', icon: Users, roles: ['admin'] },
      { name: 'Logs', href: '/logs', icon: ScrollText, roles: ['admin'] },
    ],
  },
];

function MobileNavLink({
  item,
  pathname,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  onNavigate: () => void;
}) {
  const isActive =
    item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
  return (
    <Link href={item.href} onClick={onNavigate}>
      <Button
        variant={isActive ? 'secondary' : 'ghost'}
        className={cn('w-full justify-start gap-2')}
      >
        <item.icon className="h-4 w-4" />
        {item.name}
      </Button>
    </Link>
  );
}

export function MobileNav({ userRole }: MobileNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon-sm" className="md:hidden" />
        }
      >
        <Menu className="h-4 w-4" />
        <span className="sr-only">Open menu</span>
      </SheetTrigger>
      <SheetContent side="left">
        <div className="flex h-14 items-center justify-between border-b px-4">
          <Link
            href="/"
            className="text-lg font-semibold"
            onClick={() => setOpen(false)}
          >
            MX Inventory
          </Link>
          <SheetClose
            render={
              <Button variant="ghost" size="icon-sm" />
            }
          >
            <XIcon className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </SheetClose>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-2">
          {navigation.map((entry) => {
            if (isSection(entry)) {
              const visibleItems = entry.items.filter((item) =>
                item.roles.includes(userRole)
              );
              if (visibleItems.length === 0) return null;

              return (
                <div key={entry.label} className="pt-3">
                  <p className="mb-1 px-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    {entry.label}
                  </p>
                  <div className="space-y-1">
                    {visibleItems.map((item) => (
                      <RoleGate
                        key={item.href}
                        allowedRoles={item.roles}
                        userRole={userRole}
                      >
                        <MobileNavLink
                          item={item}
                          pathname={pathname}
                          onNavigate={() => setOpen(false)}
                        />
                      </RoleGate>
                    ))}
                  </div>
                </div>
              );
            }

            return (
              <RoleGate
                key={entry.href}
                allowedRoles={entry.roles}
                userRole={userRole}
              >
                <MobileNavLink
                  item={entry}
                  pathname={pathname}
                  onNavigate={() => setOpen(false)}
                />
              </RoleGate>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
