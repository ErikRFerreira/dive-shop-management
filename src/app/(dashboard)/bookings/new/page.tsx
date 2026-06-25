import { BookingForm } from '@/components/bookings/booking-form';
import { canCreateBookingRequest } from '@/features/bookings/permissions';
import { requireCurrentUser } from '@/lib/current-user';
import { requireDashboardRouteAccess } from '@/lib/require-dashboard-route-access';
import { redirect } from 'next/navigation';

/** Renders the route composition for a new internal booking request. */
async function NewBooking() {
  const currentUser = await requireCurrentUser();
  requireDashboardRouteAccess(currentUser, 'bookings');

  if (!canCreateBookingRequest(currentUser)) {
    redirect('/bookings');
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
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
