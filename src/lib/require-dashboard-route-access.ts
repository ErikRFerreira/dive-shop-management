import 'server-only';

import { redirect } from 'next/navigation';

import {
  canAccessDashboardRoute,
  type DashboardRouteKey,
} from '@/lib/dashboard-navigation';
import type { CurrentUser } from '@/lib/current-user';
import { getDefaultLandingPath } from '@/features/auth/redirects';

/** Redirects authenticated users away from dashboard routes their role cannot access. */
export function requireDashboardRouteAccess(
  currentUser: CurrentUser,
  routeKey: DashboardRouteKey,
) {
  if (!canAccessDashboardRoute(currentUser, routeKey)) {
    redirect(getDefaultLandingPath(currentUser.role));
  }
}
