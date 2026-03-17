'use client';

import { usePathname } from 'next/navigation';
import { AdaptiveCursor } from '@/components/ui/AdaptiveCursor';

export function AdaptiveCursorWrapper() {
  const pathname = usePathname();

  // Exclude cursor from dashboard and login pages
  const isExcluded = 
    pathname?.startsWith('/dashboard') || 
    pathname === '/login' || 
    pathname?.startsWith('/auth');

  if (isExcluded) return null;

  return <AdaptiveCursor />;
}
