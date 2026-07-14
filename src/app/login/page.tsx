import { redirect } from 'next/navigation';

import AuthShell from '@/components/login/auth-shell';
import LoginForm from '@/components/login/login-form';
import { getCurrentUser } from '@/features/auth/current-user';
import {
  getDefaultLandingPath,
  validateInternalRedirectDestination,
} from '@/features/auth/redirects';

/** Demo accounts surfaced for an internal tool as muted helper content. */
const demoAccounts = [
  { role: 'Admin', email: 'admin@diveshop.local' },
  { role: 'Customer Service', email: 'cs@diveshop.local' },
  { role: 'Instructor', email: 'erik@diveshop.local' },
];

type LoginPageProps = {
  searchParams: Promise<{
    callbackUrl?: string | string[];
  }>;
};

/**
 * Renders the branded internal login experience for unauthenticated users.
 *
 * Active authenticated users are returned to the dashboard, and development
 * account identifiers are never included in the production response.
 *
 * @param props - Login URL search parameters containing an optional callback.
 * @returns The public login page or an authenticated redirect.
 */
export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const redirectDestination = validateInternalRedirectDestination(
    params.callbackUrl,
  );
  const currentUser = await getCurrentUser();

  if (currentUser) {
    return redirect(
      redirectDestination ?? getDefaultLandingPath(currentUser.role),
    );
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
      <LoginForm redirectTo={redirectDestination} />
    </AuthShell>
  );
}
