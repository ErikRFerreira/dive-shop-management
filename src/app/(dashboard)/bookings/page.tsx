import Link from 'next/link';
import { BookingList } from '@/components/bookings/booking-list';
import { BookingsListShell } from '@/components/bookings/list/bookings-list-shell';
import { Button } from '@/components/ui/button';
import { canCreateBookingRequest } from '@/features/bookings/permissions';
import {
  getBookingRequests,
  parseBookingPageParam,
  parseBookingPageSizeParam,
  parseBookingQueueFilter,
  parseBookingSortParam,
  parseBookingStatusFilter,
} from '@/features/bookings/queries';
import { requireCurrentUser } from '@/lib/current-user';
import { requireDashboardRouteAccess } from '@/lib/require-dashboard-route-access';
import { Plus } from 'lucide-react';
import PageHeader from '@/components/common/page-header';

type BookingsPageProps = {
  searchParams: Promise<{
    queue?: string | string[];
    status?: string | string[];
    sort?: string | string[];
    page?: string | string[];
    pageSize?: string | string[];
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
  const sort = parseBookingSortParam(params.sort);
  const page = parseBookingPageParam(params.page);
  const pageSize = parseBookingPageSizeParam(params.pageSize);
  const { bookings, pagination } = await getBookingRequests(
    currentUser,
    status,
    queue,
    { page, pageSize },
    sort,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader
          title="Bookings"
          description="Review and track booking requests."
        />

        {canCreateBookingRequest(currentUser) ? (
          <Button asChild className="shadow-sm shadow-primary/20">
            <Link href="/bookings/new">
              <Plus className="size-4" />
              Create Booking
            </Link>
          </Button>
        ) : null}
      </div>

      <BookingsListShell
        pageSize={pageSize}
        selectedQueue={queue}
        selectedSort={sort}
        selectedStatus={status}
      >
        <BookingList
          bookings={bookings}
          currentUser={currentUser}
          pagination={pagination}
          selectedQueue={queue}
          selectedSort={sort}
          selectedStatus={status}
        />
      </BookingsListShell>
    </div>
  );
}
