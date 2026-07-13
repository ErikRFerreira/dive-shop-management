import { redirect } from 'next/navigation';

import AuthShell from '@/components/login/auth-shell';
import LoginForm from '@/components/login/login-form';
import { getCurrentUser } from '@/features/auth/current-user';

/** Demo accounts surfaced for an internal tool as muted helper content. */
const demoAccounts = [
  { role: 'Admin', email: 'admin@diveshop.local' },
  { role: 'Customer Service', email: 'cs@diveshop.local' },
  { role: 'Instructor', email: 'mark@diveshop.local' },
];

/**
 * Renders the branded internal login experience for unauthenticated users.
 *
 * Active authenticated users are returned to the dashboard, and development
 * account identifiers are never included in the production response.
 */
export default async function LoginPage() {
  const currentUser = await getCurrentUser();

  if (currentUser) {
    redirect('/dashboard');
  }

  return (
    <AuthShell
      title="Welcome back"
      description="Sign in to access Blue Revival Dive Ops."
      footer={
        process.env.NODE_ENV === 'development' ? (
          <div className="mt-8 rounded-xl border border-border bg-muted/40 p-4">
            <p className="text-[0.7rem] font-semibold tracking-wider text-muted-foreground uppercase">
              Demo accounts
            </p>
            <ul className="mt-3 flex flex-col gap-2">
              {demoAccounts.map((account) => (
                <li
                  key={account.role}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="font-medium text-foreground">
                    {account.role}
                  </span>
                  <span className="truncate font-mono text-xs text-muted-foreground">
                    {account.email}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : undefined
      }
    >
      <LoginForm />
    </AuthShell>
  );
}
