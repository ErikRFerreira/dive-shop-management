import { BookingForm } from '@/components/bookings/booking-form';
import PageHeader from '@/components/common/page-header';
import { canCreateBookingRequest } from '@/features/bookings/permissions';
import { requireCurrentUser } from '@/lib/current-user';
import { requireDashboardRouteAccess } from '@/lib/require-dashboard-route-access';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

/** Renders the route composition for a new internal booking request. */
async function NewBooking() {
  const currentUser = await requireCurrentUser();
  requireDashboardRouteAccess(currentUser, 'bookings');

  if (!canCreateBookingRequest(currentUser)) {
    redirect('/bookings');
  }

  return (
    <>
      <div>
        <Link
          className="inline-flex w-fit items-center gap-1.5 mb-4 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          href="/bookings"
        >
          <ArrowLeft className="size-4" />
          Back to bookings
        </Link>
        <PageHeader
          title="New Booking"
          description="Capture the request before submitting it for administrative review."
        />
      </div>
      <BookingForm mode="create" />
    </>
  );
}

export default NewBooking;
