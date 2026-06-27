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
import type { BookingListItem } from '@/features/bookings/queries';
import { summarizeBookingActivities } from '@/features/bookings/utils';
import { formatDisplayDate, formatEnumLabel } from '@/lib/format';

/**
 * Formats the customer label shown for a booking list row.
 *
 * @param booking - Booking list item with its resolved display customer.
 * @returns Customer display name, multiple-customer summary, or the empty placeholder.
 */
function formatCustomerName(booking: BookingListItem) {
  const customer = booking.displayCustomer;
  const fullName = customer?.fullName?.trim();
  const name = [customer?.firstName, customer?.lastName]
    .filter((part): part is string => Boolean(part))
    .join(' ');
  const displayName = fullName || name;

  if (!displayName) {
    return booking.customers.length > 1 ? 'Multiple customers' : '\u2014';
  }

  return booking.customers.length > 1
    ? `${displayName} + ${booking.customers.length - 1} more`
    : displayName;
}

/**
 * Renders booking requests in the staff-facing list table.
 *
 * @param props - Booking rows visible to the current user.
 * @returns Booking list table or an empty-state card.
 */
export function BookingList({ bookings }: { bookings: BookingListItem[] }) {
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
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Customer name</TableHead>
              <TableHead>Activities</TableHead>
              <TableHead>Requested date</TableHead>
              <TableHead>Number of people</TableHead>
              <TableHead>Source/referrer</TableHead>
              <TableHead>Customer service owner</TableHead>
              <TableHead>Created date</TableHead>
              <TableHead>Updated date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.map((booking) => (
              <TableRow key={booking.id}>
                <TableCell>
                  <BookingStatusBadge status={booking.status} />
                </TableCell>
                <TableCell>{formatCustomerName(booking)}</TableCell>
                <TableCell>
                  {summarizeBookingActivities(
                    booking.activities,
                    booking.activityType,
                  )}
                </TableCell>
                <TableCell>{formatDisplayDate(booking.requestedDate)}</TableCell>
                <TableCell>{booking.numberOfPeople ?? '\u2014'}</TableCell>
                <TableCell>{formatEnumLabel(booking.source)}</TableCell>
                <TableCell>{booking.createdBy.name}</TableCell>
                <TableCell>{formatDisplayDate(booking.createdAt)}</TableCell>
                <TableCell>{formatDisplayDate(booking.updatedAt)}</TableCell>
                <TableCell className="text-right">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button asChild size="icon" variant="outline">
                          <Link href={`/bookings/${booking.id}`} aria-label="View booking">
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
