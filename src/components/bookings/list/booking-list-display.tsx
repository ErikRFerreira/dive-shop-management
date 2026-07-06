import type { BookingListItem } from '@/features/bookings/queries';
import {
  formatBookingHotel,
  formatBookingSchedule,
  formatBookingSource,
  formatCompactUpdatedDateParts,
  formatCustomerName,
  getBookingActivityLines,
  getStaffAssignmentLines,
} from './booking-list-formatters';

/**
 * Renders every customer/diver attached to a booking as visible line items.
 *
 * @param booking - Booking list item with customer booking relations.
 * @returns A stacked customer list, or a safe fallback when no customers exist.
 */
function renderCustomerNames(booking: BookingListItem) {
  if (booking.customers.length === 0) {
    return 'No primary customer';
  }

  return (
    <div className="space-y-1">
      {booking.customers.map((bookingCustomer) => (
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
        {renderCustomerNames(booking)}
      </div>
      <div className="space-y-0.5 text-sm text-muted-foreground">
        <div>Hotel: {formatBookingHotel(booking)}</div>
        <div>Source: {formatBookingSource(booking.source)}</div>
      </div>
    </div>
  );
}

/**
 * Renders the activity and schedule column with each activity on its own line.
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
