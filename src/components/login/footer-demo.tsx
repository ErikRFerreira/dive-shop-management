'use client';

import { Spinner } from '@/components/ui/spinner';
import { demoAccounts } from '@/features/auth/demo-accounts';

type FooterDemoProps = {
  error?: string;
  pending?: boolean;
  onAccountSelect: (email: string) => void;
};

/**
 * Renders shortcuts for selecting a seeded account in an isolated demo dataset.
 *
 * @param props - Selection callback plus pending and error presentation state.
 * @returns Accessible buttons for the available demo accounts.
 */
function FooterDemo({
  error,
  pending = false,
  onAccountSelect,
}: FooterDemoProps) {
  return (
    <div className="mt-8 rounded-xl border border-border bg-muted/40 p-4">
      <p className="text-[0.7rem] font-semibold tracking-wider text-muted-foreground uppercase">
        Demo accounts
      </p>
      <ul className="mt-3 flex flex-col gap-2">
        {demoAccounts.map((account) => (
          <li key={account.role}>
            <button
              type="button"
              onClick={() => onAccountSelect(account.email)}
              aria-label={`Use ${account.role} demo account`}
              disabled={pending}
              className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
            >
              <span className="font-medium text-foreground">
                {account.role}
              </span>
              <span className="truncate font-mono text-xs text-muted-foreground">
                {account.email}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {pending ? (
        <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Spinner aria-hidden />
          Signing in to the demo...
        </p>
      ) : null}
      {error ? (
        <p className="mt-3 text-sm font-medium text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export default FooterDemo;
