'use client';

/** Demo accounts surfaced for an internal tool as muted helper content. */
const demoAccounts = [
  { role: 'Admin', email: 'admin@diveshop.local' },
  { role: 'Customer Service', email: 'cs@diveshop.local' },
  { role: 'Instructor', email: 'erik@diveshop.local' },
];

type FooterDemoProps = {
  onAccountSelect: (email: string) => void;
};

/**
 * Renders development-only shortcuts for selecting a seeded demo account.
 *
 * This component must never be rendered in production because it exposes
 * internal development account identifiers.
 *
 * @param props - Callback invoked with the selected seeded account email.
 * @returns Accessible buttons for the local development accounts.
 */
function FooterDemo({ onAccountSelect }: FooterDemoProps) {
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
    </div>
  );
}

export default FooterDemo;
