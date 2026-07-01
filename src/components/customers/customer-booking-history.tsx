import Link from 'next/link';
import { Eye } from 'lucide-react';

import { BookingStatusBadge } from '@/components/bookings/booking-status-badge';
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
import { formatDisplayDate, formatEnumLabel } from '@/lib/format';

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
      <Card>
        <CardHeader>
          <CardTitle>Booking history</CardTitle>
          <CardDescription>
            This customer has no booking history yet.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Booking history</CardTitle>
        <CardDescription>
          Booking-specific details are shown as they were recorded on each
          booking.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Booking</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Activities</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Primary contact</TableHead>
              <TableHead>People</TableHead>
              <TableHead>Source/referrer</TableHead>
              <TableHead>Hotel at booking</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.map((booking) => (
              <TableRow key={booking.bookingId}>
                <TableCell>
                  <BookingStatusBadge status={booking.status} />
                </TableCell>
                <TableCell>{booking.bookingId}</TableCell>
                <TableCell>{formatDisplayDate(booking.date)}</TableCell>
                <TableCell>
                  {summarizeBookingActivities(
                    booking.activities,
                    booking.activityType,
                  )}
                </TableCell>
                <TableCell>{formatEnumLabel(booking.role)}</TableCell>
                <TableCell>{booking.isPrimaryContact ? 'Yes' : 'No'}</TableCell>
                <TableCell>{booking.numberOfPeople ?? '\u2014'}</TableCell>
                <TableCell>{formatSourceReferrer(booking)}</TableCell>
                <TableCell>{booking.hotelAtBooking ?? '\u2014'}</TableCell>
                <TableCell className="text-right">
                  <TooltipProvider>
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
                  </TooltipProvider>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

