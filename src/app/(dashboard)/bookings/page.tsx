import Link from 'next/link';

import { BookingList } from '@/components/bookings/booking-list';
import { BookingStatusFilter } from '@/components/bookings/booking-status-filter';
import { Button } from '@/components/ui/button';
import { canCreateBookingRequest } from '@/features/bookings/permissions';
import {
  getBookingRequests,
  parseBookingQueueFilter,
  parseBookingStatusFilter,
} from '@/features/bookings/queries';
import { requireCurrentUser } from '@/lib/current-user';
import { requireDashboardRouteAccess } from '@/lib/require-dashboard-route-access';

type BookingsPageProps = {
  searchParams: Promise<{
    queue?: string | string[];
    status?: string | string[];
  }>;
};

/**
 * Renders the internal bookings work queue with status and operational filters.
 *
 * @param props - Route props containing awaited URL search params.
 * @returns A server-rendered bookings page scoped to the current user.
 */
export default async function BookingsPage({
  searchParams,
}: BookingsPageProps) {
  const currentUser = await requireCurrentUser();
  requireDashboardRouteAccess(currentUser, 'bookings');
  const params = await searchParams;
  const status = parseBookingStatusFilter(params.status);
  const queue = parseBookingQueueFilter(params.queue);
  const bookingRequests = await getBookingRequests(currentUser, status, queue);

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

      <BookingStatusFilter selectedQueue={queue} selectedStatus={status} />
      <BookingList bookings={bookingRequests} currentUser={currentUser} />
    </div>
  );
}
