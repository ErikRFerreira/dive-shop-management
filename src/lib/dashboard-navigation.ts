import { UserRole } from '@/generated/prisma/enums';
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
  allowedRoles: readonly UserRole[];
};

export const dashboardRoutes: readonly DashboardRoute[] = [
  {
    key: 'dashboard',
    href: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    allowedRoles: [
      UserRole.ADMIN,
      UserRole.MANAGER,
      UserRole.CUSTOMER_SERVICE,
      UserRole.INSTRUCTOR,
      UserRole.DIVEMASTER,
    ],
  },
  {
    key: 'bookings',
    href: '/bookings',
    label: 'Bookings',
    icon: ClipboardList,
    allowedRoles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.CUSTOMER_SERVICE],
  },
  {
    key: 'schedule',
    href: '/schedule',
    label: 'Schedule',
    icon: CalendarDays,
    allowedRoles: [
      UserRole.ADMIN,
      UserRole.MANAGER,
      UserRole.CUSTOMER_SERVICE,
      UserRole.INSTRUCTOR,
    ],
  },
  {
    key: 'assignments',
    href: '/assignments',
    label: 'My Assignments',
    icon: ClipboardCheck,
    allowedRoles: [UserRole.INSTRUCTOR, UserRole.DIVEMASTER],
  },
  {
    key: 'customers',
    href: '/customers',
    label: 'Customers',
    icon: Users,
    allowedRoles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.CUSTOMER_SERVICE],
  },
  {
    key: 'settings',
    href: '/settings',
    label: 'Settings',
    icon: Settings,
    allowedRoles: [UserRole.ADMIN],
  },
];

/** Returns whether a role may access a top-level dashboard route. */
export function canAccessDashboardRoute(
  currentUser: Pick<CurrentUser, 'role'>,
  routeKey: DashboardRouteKey,
) {
  const route = dashboardRoutes.find((item) => item.key === routeKey);

  return route?.allowedRoles.includes(currentUser.role) ?? false;
}

/** Returns only the sidebar routes the current user is authorized to access. */
export function getDashboardNavigation(currentUser: Pick<CurrentUser, 'role'>) {
  return dashboardRoutes.filter((route) =>
    route.allowedRoles.includes(currentUser.role),
  );
}
