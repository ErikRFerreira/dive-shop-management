import 'server-only';

import { cache } from 'react';

import { auth } from '@/auth';
import { canAccessPlatform } from '@/features/auth/permissions';
import { db } from '@/lib/db';

/**
 * Loads the latest active user record for the authenticated Auth.js session.
 *
 * The session supplies only the database user ID. Role and active status are
 * always resolved from Prisma so authorization never trusts stale JWT data.
 *
 * @returns The current safe user record, or null when unauthenticated, inactive,
 * or assigned a non-platform role.
 */
export const getCurrentUser = cache(async function getCurrentUser() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return null;
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
    },
  });

  if (!user?.isActive || !canAccessPlatform(user)) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
});

export type AuthenticatedUser = NonNullable<
  Awaited<ReturnType<typeof getCurrentUser>>
>;
