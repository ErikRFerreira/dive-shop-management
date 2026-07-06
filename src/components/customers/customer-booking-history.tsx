import Link from 'next/link';
import { Eye } from 'lucide-react';

import { BookingStatusBadge } from '@/components/bookings/booking-status-badge';
import { TextFieldEmptyState } from '@/components/common/text-field-empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { CustomerBookingHistoryItem } from '@/features/customers/types';
import { summarizeBookingActivities } from '@/features/bookings/utils';
import {
  formatDisplayDate,
  formatDisplayDateTime,
  formatEnumLabel,
} from '@/lib/format';

type CustomerBookingHistoryProps = {
  bookings: CustomerBookingHistoryItem[];
};

/**
 * Formats source and referrer data for a booking history row.
 *
 * @param booking - Booking history item being displayed.
 * @returns Combined source/referrer text with a placeholder for missing values.
 */
function formatSourceReferrer(booking: CustomerBookingHistoryItem) {
  const source = formatEnumLabel(booking.source, { emptyValue: null });

  if (source && booking.referrerName) {
    return `${source} / ${booking.referrerName}`;
  }

  return source ?? booking.referrerName ?? '\u2014';
}

/**
 * Resolves the best requested date from booking-level and activity-level data.
 *
 * @param booking - Booking history item being displayed.
 * @returns Requested date from the booking or first dated activity.
 */
function getRequestedDate(booking: CustomerBookingHistoryItem) {
  return (
    booking.requestedDate ??
    booking.activities.find((activity) => activity.requestedDate)
      ?.requestedDate ??
    null
  );
}

/**
 * Resolves the best requested time from booking-level and activity-level data.
 *
 * @param booking - Booking history item being displayed.
 * @returns Requested time from the booking or first timed activity.
 */
function getRequestedTime(booking: CustomerBookingHistoryItem) {
  return (
    booking.requestedTime ??
    booking.activities.find((activity) => activity.requestedTime)
      ?.requestedTime ??
    null
  );
}

/**
 * Formats one compact operational date/time label for booking history.
 *
 * @param date - Requested or scheduled date.
 * @param time - Requested or scheduled time.
 * @returns Date and time text, falling back to TBD where needed.
 */
function formatHistoryDateTime(date: Date | null, time: string | null) {
  if (!date && !time) {
    return 'TBD';
  }

  return `${formatDisplayDate(date, { emptyValue: 'TBD' })} / ${time ?? 'TBD'}`;
}

/**
 * Formats the schedule line for the activity/history column.
 *
 * @param booking - Booking history item being displayed.
 * @returns Scheduled or requested date/time label.
 */
function formatActivitySchedule(booking: CustomerBookingHistoryItem) {
  if (booking.scheduledDate || booking.scheduledTime) {
    return `Scheduled: ${formatHistoryDateTime(
      booking.scheduledDate,
      booking.scheduledTime,
    )}`;
  }

  return `Requested: ${formatHistoryDateTime(
    getRequestedDate(booking),
    getRequestedTime(booking),
  )}`;
}

/**
 * Renders the customer's booking-specific history.
 *
 * @param props - Newest-first booking history rows.
 * @returns Booking history table or an empty-state card.
 */
export function CustomerBookingHistory({
  bookings,
}: CustomerBookingHistoryProps) {
  if (bookings.length === 0) {
    return (
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="border-b">
          <CardTitle>Booking history</CardTitle>
        </CardHeader>
        <CardContent>
          <TextFieldEmptyState message="No booking history yet." />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <CardHeader className="border-b">
        <CardTitle>Booking history</CardTitle>
        <CardDescription>
          Booking-specific details are shown as they were recorded on each
          booking.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[8.5rem]">Status</TableHead>
                <TableHead>Booking</TableHead>
                <TableHead>Activity / Schedule</TableHead>
                <TableHead>Booking role</TableHead>
                <TableHead>Source / Hotel</TableHead>
                <TableHead className="w-20 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((booking) => (
                <TableRow key={booking.bookingId}>
                  <TableCell className="whitespace-normal">
                    <BookingStatusBadge status={booking.status} />
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    <div className="space-y-1">
                      <p className="break-all font-mono text-xs font-semibold">
                        {booking.bookingId}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Created {formatDisplayDate(booking.createdAt)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Updated {formatDisplayDateTime(booking.updatedAt)}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    <div className="space-y-1">
                      <p className="font-medium">
                        {summarizeBookingActivities(
                          booking.activities,
                          booking.activityType,
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatActivitySchedule(booking)}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    <div className="space-y-1">
                      <p>{formatEnumLabel(booking.role)}</p>
                      {booking.isPrimaryContact && (
                        <Badge variant="secondary">Primary contact</Badge>
                      )}
                      <p className="text-xs text-muted-foreground">
                        People: {booking.numberOfPeople ?? '\u2014'}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    <div className="space-y-1">
                      <p>{formatSourceReferrer(booking)}</p>
                      <p className="text-xs text-muted-foreground">
                        Hotel: {booking.hotelAtBooking ?? '\u2014'}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button asChild size="icon" variant="outline">
                          <Link
                            aria-label="View booking"
                            href={`/bookings/${booking.bookingId}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>View booking</p>
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}

