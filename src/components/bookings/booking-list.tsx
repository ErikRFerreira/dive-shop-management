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
import type { CurrentUser } from '@/lib/current-user';
import { formatDisplayDate, formatEnumLabel } from '@/lib/format';
import type { BookingSource } from '@/generated/prisma/client';
import { SHOP_TIME_ZONE } from '@/lib/operational-date';

type BookingListProps = {
  bookings: BookingListItem[];
  currentUser: Pick<CurrentUser, 'id' | 'role'>;
  pagination: BookingListPagination;
  selectedQueue?: BookingQueueFilter;
  selectedStatus?: BookingStatusFilter;
};

type BookingCustomerListItem = BookingListItem['customers'][number];
type BookingActivityListItem = BookingListItem['activities'][number];

const compactDateFormatter = new Intl.DateTimeFormat('en-SG', {
  day: '2-digit',
  month: 'short',
  timeZone: SHOP_TIME_ZONE,
});

const compactTimeFormatter = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
  timeZone: SHOP_TIME_ZONE,
});

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

  return (
    fullName || name || customer?.chineseName?.trim() || 'Unnamed customer'
  );
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
 * Formats the booking source for display.
 *
 * @param source - Booking source enum value.
 * @returns Formatted source label or empty placeholder.
 */
function formatBookingSource(source: BookingSource | null | undefined) {
  return formatEnumLabel(source, { emptyValue: null }) || '\u2014';
}

/**
 * Renders the booking identity column with stacked customers, hotel, and source.
 *
 * @param booking - Booking list item with customer booking relations.
 * @returns A compact booking summary for the table identity column.
 */
function renderBookingSummary(booking: BookingListItem) {
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
 * Formats one booking activity for a dedicated table line.
 *
 * @param activity - Booking activity relation attached to the booking.
 * @returns Activity label with specialty detail when available.
 */
function formatBookingActivityName(activity: BookingActivityListItem) {
  const activityLabel = formatEnumLabel(activity.activityType, {
    emptyValue: null,
  });
  const specialtyCourse = activity.specialtyCourse?.trim();

  if (activityLabel && specialtyCourse) {
    return `${activityLabel}: ${specialtyCourse}`;
  }

  return specialtyCourse || activityLabel || '\u2014';
}

/**
 * Resolves the visible activity lines for a booking row.
 *
 * @param booking - Booking list item with activity relations and legacy fallback type.
 * @returns Ordered labels for each activity, or a single fallback label.
 */
function getBookingActivityLines(booking: BookingListItem) {
  if (booking.activities.length > 0) {
    return booking.activities.map((activity) => ({
      key: activity.id,
      label: formatBookingActivityName(activity),
    }));
  }

  return [
    {
      key: `${booking.id}-fallback-activity`,
      label:
        formatEnumLabel(booking.activityType, { emptyValue: null }) || '\u2014',
    },
  ];
}

/**
 * Formats the operational schedule label for a booking list row.
 *
 * @param booking - Booking list item with optional scheduled date/time.
 * @returns Scheduled or requested date with time, `TBD`, or the empty placeholder.
 */
function formatBookingSchedule(booking: BookingListItem) {
  const date = booking.scheduleItem?.date ?? booking.requestedDate;
  const time = booking.scheduleItem?.startTime ?? booking.requestedTime;
  const trimmedTime = time?.trim();

  if (!date) {
    return '\u2014';
  }

  return `${formatDisplayDate(date)} \u00b7 ${trimmedTime || 'TBD'}`;
}

/**
 * Renders the activity and schedule column with each activity on its own line.
 *
 * @param booking - Booking list item with activity and schedule data.
 * @returns A compact activity/schedule summary for the table.
 */
function renderActivitySchedule(booking: BookingListItem) {
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
 * Resolves assigned staff lines for display without exposing emails.
 *
 * @param booking - Booking list item with optional schedule assignments.
 * @returns Staff labels keyed by assignment, or a state placeholder.
 */
function getStaffAssignmentLines(booking: BookingListItem) {
  if (!booking.scheduleItem) {
    return [{ key: `${booking.id}-unscheduled-staff`, label: '\u2014' }];
  }

  const staffLines = booking.scheduleItem.assignments
    .map((assignment) => ({
      key: assignment.id,
      label: assignment.user.name.trim(),
    }))
    .filter((assignment) => assignment.label.length > 0);

  return staffLines.length > 0
    ? staffLines
    : [{ key: `${booking.id}-unassigned-staff`, label: 'Unassigned' }];
}

/**
 * Renders assigned staff as one visible line per person.
 *
 * @param booking - Booking list item with optional schedule assignments.
 * @returns A stacked staff assignment display.
 */
function renderStaffAssignments(booking: BookingListItem) {
  return (
    <div className="space-y-1">
      {getStaffAssignmentLines(booking).map((staff) => (
        <div key={staff.key}>{staff.label}</div>
      ))}
    </div>
  );
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
 * Renders a booking update timestamp for the compact list table.
 *
 * @param value - Booking update timestamp.
 * @returns Date and time on separate lines, or empty placeholder when missing.
 */
function renderCompactUpdatedDate(value: Date | null | undefined) {
  if (!value) {
    return <span>{'\u2014'}</span>;
  }

  return (
    <div className="space-y-0.5">
      <div className="font-medium">{compactDateFormatter.format(value)}</div>
      <div className="text-xs text-muted-foreground">
        {compactTimeFormatter.format(value)}
      </div>
    </div>
  );
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
    <div className="space-y-3">
      <Card className="overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-card to-card-glow shadow-sm py-0">
        <CardContent className="p-0">
          <Table className="table-fixed">
            <TableHeader>
              <TableRow className="border-b bg-muted/40">
                <TableHead className="h-12 w-[14%] pl-6 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground/80">
                  Status
                </TableHead>
                <TableHead className="h-12 w-[20%] text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground/80">
                  Booking
                </TableHead>
                <TableHead className="h-12 w-[30%] text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground/80">
                  Activity / Schedule
                </TableHead>
                <TableHead className="h-12 w-[20%] text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground/80">
                  Staff
                </TableHead>
                <TableHead className="h-12 w-[10%] text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground/80">
                  Updated
                </TableHead>
                <TableHead className="h-12 w-[10%] pr-6 text-right text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground/80">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((booking) => (
                <TableRow key={booking.id} className="border-b last:border-b-0">
                  <TableCell className="py-5 pl-6 align-top">
                    <BookingStatusBadge status={booking.status} />
                  </TableCell>
                  <TableCell className="whitespace-normal break-words py-5 align-top">
                    {renderBookingSummary(booking)}
                  </TableCell>
                  <TableCell className="whitespace-normal break-words py-5 align-top">
                    {renderActivitySchedule(booking)}
                  </TableCell>
                  <TableCell className="whitespace-normal break-words py-5 align-top">
                    {renderStaffAssignments(booking)}
                  </TableCell>
                  <TableCell className="py-5 align-top">
                    {renderCompactUpdatedDate(booking.updatedAt)}
                  </TableCell>
                  <TableCell className="py-5 pr-6 text-center align-top">
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

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground mb-8">
        <p>
          Showing {bookings.length} of {pagination.totalCount} bookings
        </p>
        <div>
          <BookingPagination
            pagination={pagination}
            selectedQueue={selectedQueue}
            selectedStatus={selectedStatus}
          />
        </div>
      </div>
    </div>
  );
}
