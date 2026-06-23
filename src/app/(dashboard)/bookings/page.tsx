import Link from 'next/link';

import { BookingList } from '@/components/bookings/booking-list';
import { BookingStatusFilter } from '@/components/bookings/booking-status-filter';
import { Button } from '@/components/ui/button';
import { canCreateBookingRequest } from '@/features/bookings/permissions';
import {
  getBookingRequests,
  parseBookingStatusFilter,
} from '@/features/bookings/queries';
import { requireCurrentUser } from '@/lib/current-user';

type BookingsPageProps = {
  searchParams: Promise<{ status?: string | string[] }>;
};

export default async function BookingsPage({
  searchParams,
}: BookingsPageProps) {
  const currentUser = await requireCurrentUser();
  const status = parseBookingStatusFilter((await searchParams).status);
  const bookingRequests = await getBookingRequests(currentUser, status);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Bookings</h1>
          <p className="text-sm text-muted-foreground">
            Review and track booking requests.
          </p>
        </div>

        {canCreateBookingRequest(currentUser) ? (
          <Button asChild>
            <Link href="/bookings/new">Create Booking</Link>
          </Button>
        ) : null}
      </div>

      <BookingStatusFilter selectedStatus={status} />
      <BookingList bookings={bookingRequests} />
    </div>
  );
}
