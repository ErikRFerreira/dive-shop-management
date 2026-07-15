import type { NextAuthRequest } from 'next-auth';
import { NextResponse } from 'next/server';

import { auth } from '@/auth';

/**
 * Applies an optimistic session check before rendering an internal dashboard route.
 *
 * The Proxy intentionally trusts only Auth.js session presence. Database-backed
 * user activity and all authorization remain enforced by the existing server
 * layouts, pages, actions, and handlers.
 *
 * @param request - Auth.js-augmented request for a matched dashboard path.
 * @returns A login redirect with the requested path, or the normal next response.
 */
export function handleDashboardProxyRequest(request: NextAuthRequest) {
  if (request.auth) {
    return NextResponse.next();
  }

  const callbackUrl = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = '/login';
  loginUrl.search = '';
  loginUrl.searchParams.set('callbackUrl', callbackUrl);

  return NextResponse.redirect(loginUrl);
}

export default auth(handleDashboardProxyRequest);

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/bookings/:path*',
    '/customers/:path*',
    '/schedule/:path*',
    '/assignments/:path*',
    '/settings/:path*',
  ],
};
