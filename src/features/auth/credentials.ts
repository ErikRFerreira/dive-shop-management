import 'server-only';

import { z } from 'zod';

import { verifyPassword } from '@/features/auth/password';
import { canAccessPlatform } from '@/features/auth/permissions';
import { db } from '@/lib/db';

export const credentialsSchema = z.object({
  email: z
    .string()
    .trim()
    .email({ error: 'Enter a valid email address.' })
    .max(254, { error: 'Enter a valid email address.' })
    .transform((email) => email.toLowerCase()),
  password: z
    .string()
    .min(1, { error: 'Enter your password.' })
    .max(1024, { error: 'Password is too long.' }),
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

  const user = await db.user.findUnique({
    where: { email: parsedCredentials.data.email },
    select: {
      id: true,
      name: true,
      email: true,
      passwordHash: true,
      isActive: true,
      role: true,
    },
  });

  if (
    !user ||
    !user.isActive ||
    !user.passwordHash ||
    !canAccessPlatform(user)
  ) {
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
