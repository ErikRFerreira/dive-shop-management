import { BookingForm } from '@/components/bookings/booking-form';
import { mapBookingToFormValues } from '@/features/bookings/form-mappers';
import { canEditBooking } from '@/features/bookings/permissions';
import { getBookingRequestById } from '@/features/bookings/queries';
import { requireCurrentUser } from '@/lib/current-user';
import { requireDashboardRouteAccess } from '@/lib/require-dashboard-route-access';
import { notFound, redirect } from 'next/navigation';

type Props = {
  params: Promise<{ id: string }>;
};

async function EditBookingPage({ params }: Props) {
  const currentUser = await requireCurrentUser();
  requireDashboardRouteAccess(currentUser, 'bookings');

  const { id } = await params;
  const booking = await getBookingRequestById(currentUser, id);

  if (!booking) {
    notFound();
  }

  if (!canEditBooking(currentUser, booking.createdById, booking.status)) {
    redirect(`/bookings/${booking.id}`);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Edit booking</h1>
        <p className="text-sm text-muted-foreground">
          Update the booking details or return it for approval when it is ready.
        </p>
      </div>
      <BookingForm
        mode="edit"
        bookingId={booking.id}
        initialStatus={booking.status}
        initialValues={mapBookingToFormValues(booking)}
      />
    </div>
  );
}

export default EditBookingPage;
