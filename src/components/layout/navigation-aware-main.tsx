'use client';

import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-9 w-24" />
      </div>
      <div className="rounded-md border">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b p-3 last:border-0">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function NavigationAwareMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);

  // Reset when navigation completes (new pathname committed)
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setShowSkeleton(false);
  }

  // Intercept internal link clicks and immediately show skeleton
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as Element).closest('a[href]') as HTMLAnchorElement | null;
      if (!anchor || anchor.target === '_blank') return;

      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('http') || href.startsWith('//') || href.startsWith('#')) return;

      const targetPath = href.split('?')[0];
      if (targetPath === pathname) return;

      setShowSkeleton(true);
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [pathname]);

  return (
    <main className="flex-1 overflow-y-auto p-6">
      {showSkeleton ? <PageSkeleton /> : children}
    </main>
  );
}
