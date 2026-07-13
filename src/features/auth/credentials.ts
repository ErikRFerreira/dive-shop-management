import 'server-only';

import { z } from 'zod';

import { verifyPassword } from '@/features/auth/password';
import { db } from '@/lib/db';

const credentialsSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(1024),
});

/**
 * Validates credentials and resolves an active database user for Auth.js.
 *
 * Email addresses are normalized before lookup. Every rejected credential path
 * returns null, and the persisted password hash is never returned to Auth.js.
 *
 * @param credentials - The untrusted credential payload submitted to Auth.js.
 * @returns Safe authenticated user fields, or null when credentials are invalid.
 */
export async function authorizeCredentials(
  credentials: Partial<Record<'email' | 'password', unknown>>,
) {
  const parsedCredentials = credentialsSchema.safeParse(credentials);

  if (!parsedCredentials.success) {
    return null;
  }

  const email = parsedCredentials.data.email.toLowerCase();
  const user = await db.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      passwordHash: true,
      isActive: true,
    },
  });

  if (!user || !user.isActive || !user.passwordHash) {
    return null;
  }

  const isValidPassword = await verifyPassword(
    parsedCredentials.data.password,
    user.passwordHash,
  );

  if (!isValidPassword) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
  };
}
