import 'server-only';

import { redirect } from 'next/navigation';

import { getCurrentUser as getAuthenticatedUser } from '@/features/auth/current-user';

/**
 * Loads the current active database user through the Auth.js-backed resolver.
 *
 * @returns The latest safe user fields, or null when no active session exists.
 */
export async function getCurrentUser() {
  return getAuthenticatedUser();
}

export type CurrentUser = NonNullable<
  Awaited<ReturnType<typeof getCurrentUser>>
>;

/**
 * Requires an active Auth.js-backed user for existing dashboard call sites.
 *
 * @returns The latest active database user with safe operational fields.
 */
export async function requireCurrentUser(): Promise<CurrentUser> {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/login');
  }

  return currentUser;
}
