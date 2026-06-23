import Link from 'next/link';

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
import type { BookingListItem } from '@/features/bookings/queries';

const dateFormatter = new Intl.DateTimeFormat('en-SG', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'Asia/Singapore',
});

function formatDate(value: Date | null) {
  return value ? dateFormatter.format(value) : '—';
}

function formatEnum(value: string | null) {
  return value
    ? value
        .toLowerCase()
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    : '—';
}

function formatCustomerName(booking: BookingListItem) {
  const customer = booking.displayCustomer;
  const fullName = customer?.fullName?.trim();

  if (fullName) {
    return fullName;
  }

  const name = [customer?.firstName, customer?.lastName]
    .filter((part): part is string => Boolean(part))
    .join(' ');

  return name || '—';
}

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
              <TableHead>Activity type</TableHead>
              <TableHead>Specialty course</TableHead>
              <TableHead>Requested date</TableHead>
              <TableHead>Number of people</TableHead>
              <TableHead>Source/referrer</TableHead>
              <TableHead>Customer service owner</TableHead>
              <TableHead>Created date</TableHead>
              <TableHead>Updated date</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.map((booking) => (
              <TableRow key={booking.id}>
                <TableCell>
                  <BookingStatusBadge status={booking.status} />
                </TableCell>
                <TableCell>{formatCustomerName(booking)}</TableCell>
                <TableCell>{formatEnum(booking.activityType)}</TableCell>
                <TableCell>{booking.specialtyCourse ?? 'â€”'}</TableCell>
                <TableCell>{formatDate(booking.requestedDate)}</TableCell>
                <TableCell>{booking.numberOfPeople ?? '—'}</TableCell>
                <TableCell>{formatEnum(booking.source)}</TableCell>
                <TableCell>{booking.createdBy.name}</TableCell>
                <TableCell>{formatDate(booking.createdAt)}</TableCell>
                <TableCell>{formatDate(booking.updatedAt)}</TableCell>
                <TableCell>
                  <Button asChild size="sm" variant="link">
                    <Link href={`/bookings/${booking.id}`}>Open</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
