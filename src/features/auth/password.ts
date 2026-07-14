import 'server-only';

import { compare, hash } from 'bcryptjs';

const PASSWORD_HASH_ROUNDS = 12;

/**
 * Creates a one-way bcrypt hash for a plaintext password.
 *
 * @param password - The plaintext password to hash on the server.
 * @returns A bcrypt password hash suitable for persistence.
 */
export async function hashPassword(password: string): Promise<string> {
  return hash(password, PASSWORD_HASH_ROUNDS);
}

/**
 * Safely compares a plaintext password with a persisted bcrypt hash.
 *
 * @param password - The plaintext credential submitted by the user.
 * @param passwordHash - The persisted bcrypt hash to verify against.
 * @returns Whether the submitted password matches the persisted hash.
 */
export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  return compare(password, passwordHash);
}
