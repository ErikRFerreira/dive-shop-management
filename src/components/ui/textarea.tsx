import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Renders a standard multiline text input used by dashboard forms.
 *
 * @param props - Native textarea props and optional Tailwind class overrides.
 * @returns A styled textarea element.
 */
function Textarea({
  className,
  ...props
}: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'flex min-h-20 w-full rounded-md border border-input bg-transparent px-2 py-1.5 text-sm shadow-xs outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
