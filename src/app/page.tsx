import { redirect } from 'next/navigation';

import { getCurrentUser } from '@/features/auth/current-user';
import { getDefaultLandingPath } from '@/features/auth/redirects';

/**
 * Redirects the root route according to the active database-backed user.
 *
 * @returns A redirect response to login or the user's default operational route.
 */
export default async function Home() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return redirect('/login');
  }

  return redirect(getDefaultLandingPath(currentUser.role));
}
