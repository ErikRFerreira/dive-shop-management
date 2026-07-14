import { UserRole } from '@/generated/prisma/enums';

export type AuthenticatedLandingPath = '/dashboard' | '/assignments';

const INTERNAL_REDIRECT_BASE_URL = 'https://internal.invalid';
const UNSAFE_REDIRECT_CHARACTER_PATTERN = /[\\\u0000-\u001f\u007f]/;

/**
 * Returns the default authenticated landing path for a database-backed role.
 *
 * Divemaster platform access remains outside this issue, so the existing
 * dashboard fallback is preserved without introducing a new role denial.
 *
 * @param role - Current role loaded from the active database user record.
 * @returns The operational route where the authenticated user should land.
 */
export function getDefaultLandingPath(
  role: UserRole,
): AuthenticatedLandingPath {
  if (role === UserRole.INSTRUCTOR) {
    return '/assignments';
  }

  return '/dashboard';
}

/**
 * Validates an untrusted post-login destination as a local application path.
 *
 * Only single-slash relative paths are accepted. URL parsing provides a final
 * same-origin check, while ambiguous control characters, backslashes, external
 * URLs, protocol-relative URLs, and login-loop destinations are rejected.
 *
 * @param value - Optional destination supplied through URL or form data.
 * @returns A normalized local path with its query and hash, or null when unsafe.
 */
export function validateInternalRedirectDestination(
  value: unknown,
): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const destination = value.trim();

  if (
    !destination ||
    !destination.startsWith('/') ||
    destination.startsWith('//') ||
    UNSAFE_REDIRECT_CHARACTER_PATTERN.test(destination)
  ) {
    return null;
  }

  try {
    const parsedDestination = new URL(
      destination,
      INTERNAL_REDIRECT_BASE_URL,
    );

    if (parsedDestination.origin !== INTERNAL_REDIRECT_BASE_URL) {
      return null;
    }

    const pathnameWithoutTrailingSlash =
      parsedDestination.pathname.replace(/\/+$/, '') || '/';

    if (pathnameWithoutTrailingSlash === '/login') {
      return null;
    }

    return `${parsedDestination.pathname}${parsedDestination.search}${parsedDestination.hash}`;
  } catch {
    return null;
  }
}
