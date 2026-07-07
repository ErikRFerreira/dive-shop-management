import type { ComponentProps, ReactNode } from 'react';

import { Button } from '@/components/ui/button';

type PendingButtonProps = ComponentProps<typeof Button> & {
  pending?: boolean;
  pendingLabel: ReactNode;
};

/**
 * Renders a button that swaps to action-specific loading copy while disabled.
 *
 * @param props - Existing button props plus pending state and pending label.
 * @returns A styled button that prevents duplicate submissions while work runs.
 */
export function PendingButton({
  children,
  disabled,
  pending = false,
  pendingLabel,
  ...props
}: PendingButtonProps) {
  return (
    <Button
      aria-busy={pending || undefined}
      disabled={disabled || pending}
      {...props}
    >
      {pending ? pendingLabel : children}
    </Button>
  );
}
