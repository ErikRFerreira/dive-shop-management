import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

/**
 * Renders a non-interactive skeleton block for route and component loading UI.
 *
 * @param props - Standard div props used to size and place the skeleton block.
 * @returns A muted animated placeholder that preserves page layout while loading.
 */
export function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-md bg-muted', className)}
      {...props}
    />
  );
}
