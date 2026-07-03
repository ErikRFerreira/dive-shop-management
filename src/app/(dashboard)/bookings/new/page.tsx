import { BookingForm } from '@/components/bookings/booking-form';
import { canCreateBookingRequest } from '@/features/bookings/permissions';
import { requireCurrentUser } from '@/lib/current-user';
import { requireDashboardRouteAccess } from '@/lib/require-dashboard-route-access';
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
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <Link
          className="mb-3 inline-flex text-sm text-muted-foreground hover:text-foreground"
          href="/bookings"
        >
          Back to bookings
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">New Booking</h1>
        <p className="text-sm text-muted-foreground">
          Capture the request before submitting it for administrative review.
        </p>
      </div>
      <BookingForm mode="create" />
    </div>
  );
}

export default NewBooking;
