import {
  canAccessBookings,
  canAccessCustomers,
  canAccessGlobalSchedule,
  canAccessInstructorAssignments,
  canAccessPlatform,
  canAccessSettings,
} from '@/features/auth/permissions';
import type { CurrentUser } from '@/lib/current-user';
import {
  LayoutDashboard,
  ClipboardList,
  CalendarDays,
  ClipboardCheck,
  Users,
  Settings,
} from 'lucide-react';

export type DashboardRouteKey =
  | 'dashboard'
  | 'bookings'
  | 'assignments'
  | 'schedule'
  | 'customers'
  | 'settings';

type DashboardRoute = {
  key: DashboardRouteKey;
  href: string;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  canAccess: (currentUser: Pick<CurrentUser, 'role'>) => boolean;
};

export const dashboardRoutes: readonly DashboardRoute[] = [
  {
    key: 'dashboard',
    href: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    canAccess: canAccessPlatform,
  },
  {
    key: 'bookings',
    href: '/bookings',
    label: 'Bookings',
    icon: ClipboardList,
    canAccess: canAccessBookings,
  },
  {
    key: 'schedule',
    href: '/schedule',
    label: 'Schedule',
    icon: CalendarDays,
    canAccess: canAccessGlobalSchedule,
  },
  {
    key: 'assignments',
    href: '/assignments',
    label: 'My Assignments',
    icon: ClipboardCheck,
    canAccess: canAccessInstructorAssignments,
  },
  {
    key: 'customers',
    href: '/customers',
    label: 'Customers',
    icon: Users,
    canAccess: canAccessCustomers,
  },
  {
    key: 'settings',
    href: '/settings',
    label: 'Settings',
    icon: Settings,
    canAccess: canAccessSettings,
  },
];

/** Returns whether a role may access a top-level dashboard route. */
export function canAccessDashboardRoute(
  currentUser: Pick<CurrentUser, 'role'>,
  routeKey: DashboardRouteKey,
) {
  const route = dashboardRoutes.find((item) => item.key === routeKey);

  return route?.canAccess(currentUser) ?? false;
}

/** Returns only the sidebar routes the current user is authorized to access. */
export function getDashboardNavigation(currentUser: Pick<CurrentUser, 'role'>) {
  return dashboardRoutes.filter((route) => route.canAccess(currentUser));
}
