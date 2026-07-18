import Image from 'next/image';

import { Spinner } from '@/components/ui/spinner';

/**
 * Renders the branded full-screen transition shown while workspace access resolves.
 *
 * @returns A lightweight, accessible loading state using the existing app theme.
 */
export function WorkspaceLoading() {
  return (
    <main
      aria-busy="true"
      aria-live="polite"
      className="flex min-h-screen items-center justify-center bg-background px-6"
    >
      <div className="flex flex-col items-center text-center">
        <Image
          src="/icon.png"
          alt="Blue Revival Dive Ops"
          width={72}
          height={72}
          className="size-18 object-contain"
          priority
        />
        <Spinner className="mt-5 size-5 text-primary" />
        <p className="mt-3 text-sm font-medium text-foreground">
          Preparing your workspace...
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Loading your latest operations.
        </p>
      </div>
    </main>
  );
}
