import type {
  ActivityType,
  BookingCustomerRole,
} from '@/generated/prisma/enums';
import { BookingCustomerRole as BookingCustomerRoleValue } from '@/generated/prisma/enums';
import { formatEnumLabel } from '@/lib/format';
import { formatScheduleActivityLabel } from '@/features/schedule/utils';
import type {
  DashboardNeedsAttentionBookingRecord,
  DashboardRecentActivityBookingRecord,
} from '@/features/bookings/dashboard-queries';
import type {
  DashboardScheduleAttentionRecord,
  DashboardTodayScheduleRecord,
} from '@/features/schedule/dashboard-queries';
import type {
  DashboardNeedsAttentionItem,
  DashboardRecentActivityItem,
  DashboardScheduleAssignment,
  DashboardScheduleItem,
} from './types';

/**
 * Maps a booking row into a dashboard needs-attention item.
 *
 * @param booking - The selected booking request and compact relations.
 * @returns A display-ready attention item for booking workflow queues.
 */
export function mapBookingToNeedsAttentionItem(
  booking: DashboardNeedsAttentionBookingRecord,
): DashboardNeedsAttentionItem {
  return {
    id: `booking-${booking.id}`,
    kind: 'booking',
    label: getNeedsAttentionBookingLabel(booking.status),
    bookingId: booking.id,
    scheduleItemId: null,
    status: booking.status,
    activitySummary: summarizeActivities(
      booking.activities,
      booking.activityType,
    ),
    primaryCustomerName: getPrimaryCustomerName(booking.customers),
    detail: getNeedsAttentionBookingDetail(booking),
    date: booking.requestedDate,
    updatedAt: booking.updatedAt,
  };
}

/**
 * Maps an unassigned schedule row into a dashboard needs-attention item.
 *
 * @param scheduleItem - The selected schedule row and compact relations.
 * @returns A display-ready attention item for unassigned scheduled activities.
 */
export function mapScheduleItemToNeedsAttentionItem(
  scheduleItem: DashboardScheduleAttentionRecord,
): DashboardNeedsAttentionItem {
  return {
    id: `schedule-${scheduleItem.id}`,
    kind: 'schedule',
    label: 'scheduled activity needs staff assignment',
    bookingId: scheduleItem.bookingRequestId,
    scheduleItemId: scheduleItem.id,
    status: scheduleItem.bookingRequest.status,
    activitySummary: summarizeActivities(
      scheduleItem.bookingRequest.activities,
      scheduleItem.activityType,
    ),
    primaryCustomerName: getPrimaryCustomerName(
      scheduleItem.bookingRequest.customers,
    ),
    detail: scheduleItem.startTime?.trim() || 'TBD',
    date: scheduleItem.date,
    updatedAt: scheduleItem.updatedAt,
  };
}

/**
 * Maps a schedule row into the compact dashboard schedule shape.
 *
 * @param scheduleItem - The selected schedule row and compact relations.
 * @returns A dashboard-friendly schedule item without raw Prisma nesting.
 */
export function mapScheduleItemToDashboardScheduleItem(
  scheduleItem: DashboardTodayScheduleRecord,
): DashboardScheduleItem {
  const booking = scheduleItem.bookingRequest;
  const startTime = scheduleItem.startTime?.trim() || null;
  const assignments = mapDashboardScheduleAssignments(scheduleItem.assignments);

  return {
    scheduleItemId: scheduleItem.id,
    bookingId: booking.id,
    date: scheduleItem.date,
    startTime,
    isTimeTbd: startTime === null,
    activityType: scheduleItem.activityType,
    activityLabel: formatScheduleActivityLabel(scheduleItem.activityType),
    activitySummary: summarizeActivities(
      booking.activities,
      scheduleItem.activityType,
    ),
    primaryCustomerName: getPrimaryCustomerName(booking.customers),
    customers: mapDashboardScheduleCustomers(booking.customers),
    numberOfPeople: booking.numberOfPeople,
    hotel: getScheduleHotel(booking.customers),
    assignments,
    assignedStaffNames: assignments.map((assignment) => assignment.user.name),
    isUnassigned: assignments.length === 0,
  };
}

/**
 * Maps a booking row into a recent dashboard activity item.
 *
 * @param booking - The selected booking request and compact relations.
 * @returns A simple activity item derived from the booking's current status.
 */
export function mapBookingToRecentActivityItem(
  booking: DashboardRecentActivityBookingRecord,
): DashboardRecentActivityItem {
  return {
    id: `activity-${booking.id}`,
    bookingId: booking.id,
    label: getRecentActivityLabel(booking.status),
    status: booking.status,
    occurredAt: booking.updatedAt,
    activitySummary: summarizeActivities(
      booking.activities,
      booking.activityType,
    ),
    primaryCustomerName: getPrimaryCustomerName(booking.customers),
  };
}

/**
 * Maps selected assignment rows into dashboard-safe assignment details.
 *
 * @param assignments - Assignment rows selected with a schedule item.
 * @returns Staff assignment details safe for dashboard display.
 */
function mapDashboardScheduleAssignments(
  assignments: DashboardTodayScheduleRecord['assignments'],
): DashboardScheduleAssignment[] {
  return assignments.map((assignment) => ({
    id: assignment.id,
    userId: assignment.userId,
    role: assignment.role,
    user: {
      id: assignment.user.id,
      name: assignment.user.name,
      email: assignment.user.email,
      role: assignment.user.role,
    },
  }));
}

/**
 * Maps booking customer links into compact dashboard customer rows.
 *
 * @param customers - Booking customer rows selected through a schedule item.
 * @returns Customer/diver rows in query order with safe display names.
 */
function mapDashboardScheduleCustomers(
  customers: DashboardTodayScheduleRecord['bookingRequest']['customers'],
) {
  return customers.map((bookingCustomer) => ({
    name: formatCustomerDisplayName(bookingCustomer.customer),
    chineseName: bookingCustomer.customer.chineseName?.trim() || null,
    isPrimaryContact:
      bookingCustomer.role === BookingCustomerRoleValue.PRIMARY_CONTACT,
    role: bookingCustomer.role,
  }));
}

/**
 * Summarizes the activity list for compact dashboard display.
 *
 * @param activities - Ordered activity rows selected with a booking or schedule.
 * @param fallbackActivityType - The booking or schedule activity used as fallback.
 * @returns A compact activity summary.
 */
function summarizeActivities(
  activities: Array<{ activityType: ActivityType | null }>,
  fallbackActivityType: ActivityType | null,
) {
  const labels = activities
    .map((activity) =>
      activity.activityType
        ? formatScheduleActivityLabel(activity.activityType)
        : null,
    )
    .filter((label): label is string => label !== null);

  if (labels.length === 0) {
    return fallbackActivityType
      ? formatScheduleActivityLabel(fallbackActivityType)
      : formatEnumLabel(null);
  }

  if (labels.length === 1) {
    return labels[0];
  }

  if (labels.length === 2) {
    return `${labels[0]} + ${labels[1]}`;
  }

  return `${labels[0]} + ${labels.length - 1} more`;
}

/**
 * Returns the primary contact name for compact dashboard display.
 *
 * @param customers - Booking customer rows ordered by creation time.
 * @returns Primary contact name, first customer name, or null.
 */
function getPrimaryCustomerName(
  customers: Array<{
    role: BookingCustomerRole;
    customer: {
      fullName: string | null;
      firstName: string | null;
      lastName: string | null;
      chineseName: string | null;
    };
  }>,
) {
  const displayCustomer =
    customers.find(
      (bookingCustomer) =>
        bookingCustomer.role === BookingCustomerRoleValue.PRIMARY_CONTACT,
    ) ?? customers[0];

  return displayCustomer ? formatCustomerName(displayCustomer.customer) : null;
}

/**
 * Returns the best available hotel for a scheduled booking.
 *
 * @param customers - Booking customer rows selected through a schedule item.
 * @returns Hotel-at-booking, customer hotel, or null.
 */
function getScheduleHotel(
  customers: DashboardTodayScheduleRecord['bookingRequest']['customers'],
) {
  const displayCustomer =
    customers.find(
      (bookingCustomer) =>
        bookingCustomer.role === BookingCustomerRoleValue.PRIMARY_CONTACT,
    ) ?? customers[0];

  return (
    displayCustomer?.hotelAtBooking?.trim() ||
    displayCustomer?.customer.hotel?.trim() ||
    null
  );
}

/**
 * Formats a customer name for compact dashboard display.
 *
 * @param customer - Customer name fields selected from the booking relation.
 * @returns English name, Chinese name, or null.
 */
function formatCustomerName(customer: {
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
  chineseName: string | null;
}) {
  const englishName = formatCustomerEnglishName(customer);
  const chineseName = customer.chineseName?.trim();

  return englishName || chineseName || null;
}

/**
 * Formats a customer name for detailed dashboard customer/diver lists.
 *
 * @param customer - Customer name fields selected from the booking relation.
 * @returns English and Chinese names together, Chinese-only, or a safe fallback.
 */
function formatCustomerDisplayName(customer: {
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
  chineseName: string | null;
}) {
  const englishName = formatCustomerEnglishName(customer);
  const chineseName = customer.chineseName?.trim();

  if (englishName && chineseName) {
    return `${englishName} / ${chineseName}`;
  }

  return englishName || chineseName || 'Unnamed customer';
}

/**
 * Formats the English portion of a customer name.
 *
 * @param customer - Customer name fields selected from the booking relation.
 * @returns Full name, first/last name, or null when no English name is available.
 */
function formatCustomerEnglishName(customer: {
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
}) {
  const fullName = customer.fullName?.trim();
  if (fullName) {
    return fullName;
  }

  const name = [customer.firstName, customer.lastName]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(' ')
    .trim();

  return name || null;
}

/**
 * Returns the operational label for a booking attention item.
 *
 * @param status - Current booking workflow status.
 * @returns A short dashboard label.
 */
function getNeedsAttentionBookingLabel(
  status: DashboardNeedsAttentionBookingRecord['status'],
) {
  if (status === 'PENDING_APPROVAL') {
    return 'booking pending approval';
  }

  if (status === 'NEEDS_MORE_INFO') {
    return 'booking needs more information';
  }

  if (status === 'DRAFT') {
    return 'draft booking not submitted';
  }

  return 'booking needs attention';
}

/**
 * Returns compact extra detail for a booking attention item.
 *
 * @param booking - The booking row being mapped.
 * @returns Needs-more-info reason, requested time, or null.
 */
function getNeedsAttentionBookingDetail(
  booking: DashboardNeedsAttentionBookingRecord,
) {
  if (booking.status === 'NEEDS_MORE_INFO') {
    return booking.needsMoreInfoReason?.trim() || null;
  }

  return booking.requestedTime?.trim() || null;
}

/**
 * Returns the simple recent activity label for a booking status.
 *
 * @param status - Current booking workflow status.
 * @returns A short activity label for dashboard display.
 */
function getRecentActivityLabel(
  status: DashboardRecentActivityBookingRecord['status'],
) {
  if (status === 'PENDING_APPROVAL') {
    return 'Booking submitted for approval';
  }

  if (status === 'NEEDS_MORE_INFO') {
    return 'More information requested';
  }

  if (status === 'SCHEDULED') {
    return 'Booking approved and scheduled';
  }

  return 'booking updated';
}
