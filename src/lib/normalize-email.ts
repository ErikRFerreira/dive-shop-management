/**
 * Normalizes a staff login email for authentication and persistence.
 *
 * @param email - Valid email text that may contain surrounding whitespace or uppercase letters.
 * @returns The trimmed, lowercase email used as the canonical account identifier.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
