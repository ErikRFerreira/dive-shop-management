import AuthShell from '@/components/login/auth-shell';
import LoginExperience from '@/components/login/login-experience';
import { getCurrentUser } from '@/features/auth/current-user';
import {
  getDefaultLandingPath,
  validateInternalRedirectDestination,
} from '@/features/auth/redirects';
import { redirect } from 'next/navigation';

type LoginPageProps = {
  searchParams: Promise<{
    callbackUrl?: string | string[];
  }>;
};

/**
 * Renders the branded internal login experience for unauthenticated users.
 *
 * Active authenticated users are returned to their role-appropriate landing
 * route. Seed account identifiers are available only for the demo schema.
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

  const showDemoAccountSelector = process.env.DATABASE_SCHEMA === 'demo';

  return (
    <AuthShell
      title="Welcome back"
      description="Sign in to access Blue Revival Dive Ops."
    >
      <LoginExperience
        redirectTo={redirectDestination}
        showDemoAccountSelector={showDemoAccountSelector}
      />
    </AuthShell>
  );
}
