import { BookingPagination } from '@/components/bookings/booking-pagination';
import { BookingRowActions } from '@/components/bookings/booking-row-actions';
import { BookingStatusBadge } from '@/components/bookings/booking-status-badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type {
  BookingListPagination,
  BookingListItem,
  BookingQueueFilter,
  BookingStatusFilter,
} from '@/features/bookings/queries';
import { summarizeBookingActivities } from '@/features/bookings/utils';
import type { CurrentUser } from '@/lib/current-user';
import { formatDisplayDate, formatDisplayDateTime } from '@/lib/format';

type BookingListProps = {
  bookings: BookingListItem[];
  currentUser: Pick<CurrentUser, 'id' | 'role'>;
  pagination: BookingListPagination;
  selectedQueue?: BookingQueueFilter;
  selectedStatus?: BookingStatusFilter;
};

type BookingCustomerListItem = BookingListItem['customers'][number];

/**
 * Formats one linked customer/diver name for the booking list.
 *
 * @param bookingCustomer - Customer relation attached to a booking.
 * @returns Customer display name, or a safe fallback when no name is stored.
 */
function formatCustomerName(bookingCustomer: BookingCustomerListItem) {
  const customer = bookingCustomer.customer;
  const fullName = customer?.fullName?.trim();
  const name = [customer?.firstName, customer?.lastName]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(' ');

  return fullName || name || customer?.chineseName?.trim() || 'Unnamed customer';
}

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
 * Formats the operational date/time label for a booking list row.
 *
 * @param booking - Booking list item with optional scheduled date/time.
 * @returns Scheduled or requested date with time, `TBD`, or the empty placeholder.
 */
function formatBookingDateTime(booking: BookingListItem) {
  const date = booking.scheduleItem?.date ?? booking.requestedDate;
  const time = booking.scheduleItem?.startTime ?? booking.requestedTime;
  const trimmedTime = time?.trim();

  if (!date) {
    return '\u2014';
  }

  return `${formatDisplayDate(date)} ${trimmedTime || 'TBD'}`;
}

/**
 * Formats the staff member who created a booking request.
 *
 * @param booking - Booking list item with creator relation.
 * @returns Creator name, or the empty placeholder when no name is stored.
 */
function formatBookingCreator(booking: BookingListItem) {
  return booking.createdBy.name?.trim() || '\u2014';
}

/**
 * Renders created and edited timestamps for a booking list row.
 *
 * @param booking - Booking list item with audit timestamps.
 * @returns A compact two-line audit timestamp display.
 */
function renderBookingAuditDates(booking: BookingListItem) {
  return (
    <div className="space-y-1 whitespace-nowrap text-sm">
      <div>Created {formatDisplayDateTime(booking.createdAt)}</div>
      <div>Edited {formatDisplayDateTime(booking.updatedAt)}</div>
    </div>
  );
}

/**
 * Formats assigned staff for a booking list row without exposing emails.
 *
 * @param booking - Booking list item with optional schedule assignments.
 * @returns Staff names, `Unassigned` for scheduled rows without staff, or the empty placeholder.
 */
function formatStaffAssignments(booking: BookingListItem) {
  if (!booking.scheduleItem) {
    return '\u2014';
  }

  const staffNames = booking.scheduleItem.assignments
    .map((assignment) => assignment.user.name.trim())
    .filter(Boolean);

  return staffNames.length > 0 ? staffNames.join(', ') : 'Unassigned';
}

/**
 * Formats the hotel attached to the display customer for this booking.
 *
 * @param booking - Booking list item with customer booking relations.
 * @returns Booking-specific hotel, customer hotel fallback, or the empty placeholder.
 */
function formatBookingHotel(booking: BookingListItem) {
  const displayCustomerId = booking.displayCustomer?.id;
  const bookingCustomer =
    booking.customers.find(
      (customer) => customer.customerId === displayCustomerId,
    ) ??
    booking.customers[0] ??
    null;
  const hotel =
    bookingCustomer?.hotelAtBooking?.trim() ||
    bookingCustomer?.customer.hotel?.trim();

  return hotel || '\u2014';
}

/**
 * Renders booking requests in the staff-facing list table.
 *
 * @param props - Booking rows, pagination metadata, and current user used to resolve row actions.
 * @returns Booking list table or an empty-state card.
 */
export function BookingList({
  bookings,
  currentUser,
  pagination,
  selectedQueue,
  selectedStatus,
}: BookingListProps) {
  if (bookings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No bookings found</CardTitle>
          <CardDescription>
            There are no booking requests matching this view.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          <p>
            Showing {bookings.length} of {pagination.totalCount} bookings
          </p>
          <BookingPagination
            pagination={pagination}
            selectedQueue={selectedQueue}
            selectedStatus={selectedStatus}
          />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Customers/divers</TableHead>
              <TableHead>Activities</TableHead>
              <TableHead>Activity date/time</TableHead>
              <TableHead>Staff</TableHead>
              <TableHead>Hotel</TableHead>
              <TableHead>Created by</TableHead>
              <TableHead>Created/edited</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.map((booking) => (
              <TableRow key={booking.id}>
                <TableCell>
                  <BookingStatusBadge status={booking.status} />
                </TableCell>
                <TableCell>{renderCustomerNames(booking)}</TableCell>
                <TableCell>
                  {summarizeBookingActivities(
                    booking.activities,
                    booking.activityType,
                  )}
                </TableCell>
                <TableCell>{formatBookingDateTime(booking)}</TableCell>
                <TableCell>{formatStaffAssignments(booking)}</TableCell>
                <TableCell>{formatBookingHotel(booking)}</TableCell>
                <TableCell>{formatBookingCreator(booking)}</TableCell>
                <TableCell>{renderBookingAuditDates(booking)}</TableCell>
                <TableCell className="text-right">
                  <BookingRowActions
                    booking={booking}
                    currentUser={currentUser}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
