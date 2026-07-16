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
 * Active authenticated users are returned to the dashboard, and demo account
 * identifiers are included only in local development or Vercel Preview.
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

  // DEMO ENVIRONMENTS ONLY: this password is sent to the browser to fill seeded
  // credentials. The guard must remain so it is never exposed in a Vercel
  // Production response.
  const demoPassword =
    process.env.NODE_ENV === 'development' ||
    process.env.VERCEL_ENV === 'preview'
      ? process.env.SEED_USER_PASSWORD
      : undefined;

  return (
    <AuthShell
      title="Welcome back"
      description="Sign in to access Blue Revival Dive Ops."
    >
      <LoginExperience
        redirectTo={redirectDestination}
        demoPassword={demoPassword}
      />
    </AuthShell>
  );
}
