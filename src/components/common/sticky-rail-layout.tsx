import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

type StickyRailLayoutProps = {
  children: ReactNode;
  rail: ReactNode;
  className?: string;
  contentClassName?: string;
  railClassName?: string;
};

/**
 * Renders a responsive two-column layout with a right rail that follows scroll.
 *
 * @param props - Main content, rail content, and optional class names for each layout region.
 * @returns A layout shell with desktop sticky rail behavior and mobile stacking.
 */
export function StickyRailLayout({
  children,
  rail,
  className,
  contentClassName,
  railClassName,
}: StickyRailLayoutProps) {
  return (
    <div
      className={cn(
        'grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start',
        className,
      )}
    >
      <div className={cn('min-w-0', contentClassName)}>{children}</div>
      <aside className={cn('lg:sticky lg:top-6', railClassName)}>{rail}</aside>
    </div>
  );
}
