import type { Session, User } from 'next-auth';
import type { JWT } from 'next-auth/jwt';

/**
 * Persists the authenticated database user ID in an Auth.js JWT.
 *
 * @param token - The JWT being created or refreshed by Auth.js.
 * @param user - The safe user returned during initial authorization, when present.
 * @returns The JWT with the database user ID persisted when available.
 */
export function persistUserIdInJwt(token: JWT, user?: User): JWT {
  if (user?.id) {
    token.userId = user.id;
  }

  return token;
}

/**
 * Exposes the authenticated database user ID through the server session.
 *
 * @param session - The Auth.js session being returned to server code.
 * @param token - The JWT containing the persisted database user ID.
 * @returns The session with `user.id` populated when the token ID is valid.
 */
export function exposeUserIdInSession(session: Session, token: JWT): Session {
  if (typeof token.userId === 'string') {
    session.user.id = token.userId;
  }

  return session;
}
