import { BookingForm } from '@/components/bookings/booking-form';
import PageHeader from '@/components/common/page-header';
import { mapBookingToFormValues } from '@/features/bookings/form-mappers';
import { getAvailableBookingActions } from '@/features/bookings/permissions';
import { getBookingRequestById } from '@/features/bookings/queries';
import { requireCurrentUser } from '@/lib/current-user';
import { requireDashboardRouteAccess } from '@/lib/require-dashboard-route-access';
import { notFound, redirect } from 'next/navigation';

type Props = {
  params: Promise<{ id: string }>;
};

/**
 * Renders the protected booking edit page with server-derived action availability.
 *
 * @param props - Route parameters containing the booking request ID.
 * @returns The editable booking form for authorized operational users.
 */
async function EditBookingPage({ params }: Props) {
  const currentUser = await requireCurrentUser();
  requireDashboardRouteAccess(currentUser, 'bookings');

  const { id } = await params;
  const booking = await getBookingRequestById(currentUser, id);

  if (!booking) {
    notFound();
  }

  const availableActions = getAvailableBookingActions(currentUser, booking);

  if (!availableActions.canSaveChanges) {
    redirect(`/bookings/${booking.id}`);
  }

  return (
    <>
      <PageHeader
        title="Edit Booking"
        description="Update the booking details or return it for approval when it is ready."
      />
      <BookingForm
        mode="edit"
        bookingId={booking.id}
        availableActions={availableActions}
        initialStatus={booking.status}
        initialValues={mapBookingToFormValues(booking)}
      />
    </>
  );
}

export default EditBookingPage;
