import 'server-only';

import { redirect } from 'next/navigation';

import { db } from '@/lib/db';

const DEFAULT_DEV_USER_EMAIL = 'cs@diveshop.local';

export async function getCurrentUser() {
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  const email = process.env.DEV_USER_EMAIL ?? DEFAULT_DEV_USER_EMAIL;

  return db.user.findFirst({
    where: {
      email,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });
}

export type CurrentUser = NonNullable<
  Awaited<ReturnType<typeof getCurrentUser>>
>;

export async function requireCurrentUser(): Promise<CurrentUser> {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/login');
  }

  return currentUser;
}
