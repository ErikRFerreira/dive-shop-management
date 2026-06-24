import 'server-only';

import { redirect } from 'next/navigation';

import {
  canAccessDashboardRoute,
  type DashboardRouteKey,
} from '@/lib/dashboard-navigation';
import type { CurrentUser } from '@/lib/current-user';

/** Redirects authenticated users away from dashboard routes their role cannot access. */
export function requireDashboardRouteAccess(
  currentUser: CurrentUser,
  routeKey: DashboardRouteKey,
) {
  if (!canAccessDashboardRoute(currentUser, routeKey)) {
    redirect('/dashboard');
  }
}
