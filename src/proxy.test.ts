import { NextRequest } from 'next/server';
import { describe, expect, test, vi } from 'vitest';

vi.mock('@/auth', () => ({
  auth: (handler: unknown) => handler,
}));

import { config, handleDashboardProxyRequest } from '@/proxy';
import type { NextAuthRequest } from 'next-auth';

/**
 * Builds an Auth.js-augmented request for Proxy behavior tests.
 *
 * @param url - Absolute request URL to evaluate.
 * @param authenticated - Whether the optimistic Auth.js session is present.
 * @returns A Next.js request carrying the requested session state.
 */
function buildProxyRequest(url: string, authenticated: boolean) {
  const request = new NextRequest(url) as NextAuthRequest;
  request.auth = authenticated
    ? {
        user: {
          id: 'user-1',
          name: 'Operations User',
          email: 'user@example.test',
        },
        expires: '2099-01-01T00:00:00.000Z',
      }
    : null;

  return request;
}

describe('handleDashboardProxyRequest', () => {
  test('redirects an unauthenticated request and preserves its path and query', () => {
    const response = handleDashboardProxyRequest(
      buildProxyRequest(
        'https://ops.example.test/bookings?status=PENDING_APPROVAL&page=2',
        false,
      ),
    );
    const location = new URL(response.headers.get('location')!);

    expect(response.status).toBe(307);
    expect(location.pathname).toBe('/login');
    expect(location.searchParams.get('callbackUrl')).toBe(
      '/bookings?status=PENDING_APPROVAL&page=2',
    );
  });

  test('allows an authenticated request to continue', () => {
    const response = handleDashboardProxyRequest(
      buildProxyRequest('https://ops.example.test/schedule', true),
    );

    expect(response.headers.get('x-middleware-next')).toBe('1');
  });
});

test('matches only the current internal dashboard route prefixes', () => {
  expect(config.matcher).toEqual([
    '/dashboard/:path*',
    '/bookings/:path*',
    '/customers/:path*',
    '/schedule/:path*',
    '/assignments/:path*',
    '/settings/:path*',
  ]);
});
