import { BookingStatus, UserRole } from '@/generated/prisma/enums';
import type {
  DashboardNeedsAttentionItem as DashboardNeedsAttentionItemData,
  DashboardScheduleItem as DashboardScheduleItemData,
} from '@/features/dashboard/types';
import type { CurrentUser } from '@/lib/current-user';
import {
  canAccessBookings,
  hasFullOperationalAccess,
} from '@/features/auth/permissions';

export type DashboardSectionUser = Pick<CurrentUser, 'id' | 'role'>;

export type DashboardAction = {
  label: string;
  href: string;
};

const NO_PRIMARY_CUSTOMER_LABEL = 'No primary customer';

/**
 * Formats the primary customer display value for dashboard rows.
 *
 * @param name - Primary customer name from the dashboard query layer.
 * @returns The provided name, or a calm missing-customer fallback.
 */
export function formatPrimaryCustomerName(name: string | null) {
  return name ?? NO_PRIMARY_CUSTOMER_LABEL;
}

/**
 * Decides whether an attention row needs its text label in addition to badges.
 *
 * @param item - Attention row being rendered.
 * @returns True for non-booking rows where the label adds operational context.
 */
export function shouldShowAttentionLabel(
  item: DashboardNeedsAttentionItemData,
) {
  return item.kind !== 'booking';
}

/**
 * Chooses the role-aware action for an attention row.
 *
 * @param item - Attention row being rendered.
 * @param currentUser - Current user role used for link visibility.
 * @returns Link metadata, or null when no safe action should be shown.
 */
export function getNeedsAttentionAction(
  item: DashboardNeedsAttentionItemData,
  currentUser: DashboardSectionUser,
): DashboardAction | null {
  if (
    isOperationsUser(currentUser) &&
    item.kind === 'booking' &&
    item.status === BookingStatus.PENDING_APPROVAL
  ) {
    return {
      label: 'Review',
      href: `/bookings/${item.bookingId}/review`,
    };
  }

  if (isOperationsUser(currentUser) && item.kind === 'schedule') {
    return {
      label: 'Assign staff',
      href: `/bookings/${item.bookingId}`,
    };
  }

  if (
    currentUser.role === UserRole.CUSTOMER_SERVICE &&
    item.kind === 'booking' &&
    item.status === BookingStatus.NEEDS_MORE_INFO
  ) {
    return {
      label: 'Fix details',
      href: `/bookings/${item.bookingId}/edit`,
    };
  }

  if (item.kind === 'booking' && item.status === BookingStatus.NEEDS_MORE_INFO) {
    return {
      label: 'View details',
      href: `/bookings/${item.bookingId}`,
    };
  }

  if (item.kind === 'schedule') {
    return {
      label: 'View booking',
      href: `/bookings/${item.bookingId}`,
    };
  }

  if (canAccessBookingDetails(currentUser)) {
    return {
      label: 'View booking',
      href: `/bookings/${item.bookingId}`,
    };
  }

  return null;
}

/**
 * Chooses the role-aware action for today's schedule row.
 *
 * @param item - Schedule row being rendered.
 * @param currentUser - Current user role used for link visibility.
 * @returns Link metadata, or null when no safe action should be shown.
 */
export function getTodaysScheduleAction(
  item: DashboardScheduleItemData,
  currentUser: DashboardSectionUser,
): DashboardAction | null {
  if (isOperationsUser(currentUser) && item.isUnassigned) {
    return {
      label: 'Assign staff',
      href: `/bookings/${item.bookingId}`,
    };
  }

  if (canAccessBookingDetails(currentUser)) {
    return {
      label: 'View booking',
      href: `/bookings/${item.bookingId}`,
    };
  }

  return null;
}

/**
 * Formats schedule customer rows into a compact comma-separated display value.
 *
 * @param item - Schedule row containing customers from the booking.
 * @returns Customer/diver names or a safe fallback.
 */
export function formatScheduleCustomers(item: DashboardScheduleItemData) {
  if (item.customers.length === 0) {
    return item.primaryCustomerName ?? 'No customers/divers recorded';
  }

  return item.customers.map((customer) => customer.name).join(', ');
}

/**
 * Checks whether a user can access booking detail routes from dashboard links.
 *
 * @param currentUser - Current user role.
 * @returns True for Admin, Manager, and Customer Service users.
 */
function canAccessBookingDetails(currentUser: DashboardSectionUser) {
  return canAccessBookings(currentUser);
}

/**
 * Checks whether a user can manage operational review and assignment work.
 *
 * @param currentUser - Current user role.
 * @returns True for Admin and Manager users.
 */
function isOperationsUser(currentUser: Pick<CurrentUser, 'role'>) {
  return hasFullOperationalAccess(currentUser);
}
