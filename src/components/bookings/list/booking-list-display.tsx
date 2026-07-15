import type { BookingListItem } from '@/features/bookings/queries';
import { getActiveBookingParticipants } from '@/features/bookings/participants';
import { BookingStatus } from '@/generated/prisma/enums';
import {
  formatBookingHotel,
  formatBookingSchedule,
  formatBookingSource,
  formatCompactUpdatedDateParts,
  formatCustomerName,
  getBookingActivityLines,
  getStaffAssignmentLines,
} from './booking-list-formatters';

const NO_NEEDS_MORE_INFO_NOTE = 'No admin note provided.';

/**
 * Resolves the compact Admin request shown for a Needs More Info booking.
 *
 * @param booking - Booking list item containing workflow and legacy review notes.
 * @returns The latest request, a legacy admin-note fallback, or null for other statuses.
 */
function getNeedsMoreInfoRequest(booking: BookingListItem) {
  if (booking.status !== BookingStatus.NEEDS_MORE_INFO) {
    return null;
  }

  return (
    booking.needsMoreInfoReason?.trim() ||
    booking.adminNotes?.trim() ||
    NO_NEEDS_MORE_INFO_NOTE
  );
}

/**
 * Renders the compact Admin request metadata for a Needs More Info booking.
 *
 * @param booking - Booking list item whose current status controls visibility.
 * @returns A two-line request preview, or null when the booking has another status.
 */
function renderNeedsMoreInfoRequest(booking: BookingListItem) {
  const request = getNeedsMoreInfoRequest(booking);

  if (!request) {
    return null;
  }

  return (
    <p
      className="line-clamp-2 text-xs leading-relaxed text-muted-foreground"
      title={request}
    >
      <span className="font-medium text-foreground">Needs more info:</span>{' '}
      {request}
    </p>
  );
}

/**
 * Returns active booking participants with the display customer first.
 *
 * @param booking - Booking list item with customer booking relations.
 * @returns Active participants ordered for compact operational display.
 */
function getOrderedActiveParticipants(booking: BookingListItem) {
  const activeParticipants = getActiveBookingParticipants(booking.customers);
  const displayCustomerId = booking.displayCustomer?.id;
  const displayParticipant = activeParticipants.find(
    (participant) => participant.customerId === displayCustomerId,
  );

  if (!displayParticipant) {
    return activeParticipants;
  }

  return [
    displayParticipant,
    ...activeParticipants.filter(
      (participant) => participant.customerId !== displayParticipant.customerId,
    ),
  ];
}

/**
 * Renders active customers/divers attached to a booking as visible line items.
 *
 * @param booking - Booking list item with customer booking relations.
 * @returns A stacked active participant list, or a safe fallback when none are active.
 */
function renderActiveCustomerNames(booking: BookingListItem) {
  const activeParticipants = getOrderedActiveParticipants(booking);

  if (activeParticipants.length === 0) {
    return <p className="text-muted-foreground">No active participants</p>;
  }

  return (
    <div className="space-y-1">
      {activeParticipants.map((bookingCustomer) => (
        <div key={bookingCustomer.customerId}>
          {formatCustomerName(bookingCustomer)}
        </div>
      ))}
    </div>
  );
}

/**
 * Renders the booking identity column with stacked customers, hotel, and source.
 *
 * @param booking - Booking list item with customer booking relations.
 * @returns A compact booking summary for the table identity column.
 */
export function renderBookingSummary(booking: BookingListItem) {
  return (
    <div className="space-y-2">
      <div className="space-y-1 font-medium text-foreground">
        {renderActiveCustomerNames(booking)}
      </div>
      <div className="space-y-0.5 text-sm text-muted-foreground">
        <div>Active participants: {booking.activeParticipantCount}</div>
        <div>Hotel: {formatBookingHotel(booking)}</div>
        <div>Source: {formatBookingSource(booking.source)}</div>
      </div>
    </div>
  );
}

/**
 * Renders the activity and schedule column with each activity on its own line
 * and the current Admin request when the booking needs more information.
 *
 * @param booking - Booking list item with activity and schedule data.
 * @returns A compact activity/schedule summary for the table.
 */
export function renderActivitySchedule(booking: BookingListItem) {
  return (
    <div className="space-y-2">
      <div className="space-y-1 font-medium text-foreground">
        {getBookingActivityLines(booking).map((activity) => (
          <div key={activity.key}>{activity.label}</div>
        ))}
      </div>
      <div className="text-sm text-muted-foreground">
        {formatBookingSchedule(booking)}
      </div>
      {renderNeedsMoreInfoRequest(booking)}
    </div>
  );
}

/**
 * Renders assigned staff as one visible line per person.
 *
 * @param booking - Booking list item with optional schedule assignments.
 * @returns A stacked staff assignment display.
 */
export function renderStaffAssignments(booking: BookingListItem) {
  return (
    <div className="space-y-1">
      {getStaffAssignmentLines(booking).map((staff) => (
        <div key={staff.key}>{staff.label}</div>
      ))}
    </div>
  );
}

/**
 * Renders a booking update timestamp for the compact list table.
 *
 * @param value - Booking update timestamp.
 * @returns Date and time on separate lines, or empty placeholder when missing.
 */
export function renderCompactUpdatedDate(value: Date | null | undefined) {
  const parts = formatCompactUpdatedDateParts(value);

  if (!parts) {
    return <span>{'\u2014'}</span>;
  }

  return (
    <div className="space-y-0.5">
      <div className="font-medium">{parts.date}</div>
      <div className="text-xs text-muted-foreground">{parts.time}</div>
    </div>
  );
}
