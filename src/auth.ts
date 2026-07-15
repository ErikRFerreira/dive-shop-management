import NextAuth, { type NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

import { authorizeCredentials } from '@/features/auth/credentials';
import {
  exposeUserIdInSession,
  persistUserIdInJwt,
} from '@/features/auth/session';

export const authConfig = {
  session: {
    strategy: 'jwt',
  },
  providers: [
    Credentials({
      credentials: {
        email: {
          label: 'Email',
          type: 'email',
          autoComplete: 'email',
        },
        password: {
          label: 'Password',
          type: 'password',
          autoComplete: 'current-password',
        },
      },
      authorize: authorizeCredentials,
    }),
  ],
  callbacks: {
    /** Persists the authenticated database user ID in the JWT. */
    jwt({ token, user }) {
      return persistUserIdInJwt(token, user);
    },
    /** Exposes the persisted database user ID through the server session. */
    session({ session, token }) {
      return exposeUserIdInSession(session, token);
    },
  },
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
