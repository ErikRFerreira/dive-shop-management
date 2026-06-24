import BookingDetails from '@/components/bookings/booking-details';
import { canReviewBookingRequest } from '@/features/bookings/permissions';
import { getBookingRequestById } from '@/features/bookings/queries';
import { requireCurrentUser } from '@/lib/current-user';
import { requireDashboardRouteAccess } from '@/lib/require-dashboard-route-access';
import { notFound } from 'next/navigation';

type Props = {
  params: Promise<{ id: string }>;
};

async function BookingDetailsPage({ params }: Props) {
  const currentUser = await requireCurrentUser();
  requireDashboardRouteAccess(currentUser, 'bookings');
  const { id } = await params;
  const booking = await getBookingRequestById(currentUser, id);

  if (!booking) {
    return notFound();
  }

  return (
    <BookingDetails
      booking={booking}
      canReview={canReviewBookingRequest(currentUser)}
    />
  );
}

export default BookingDetailsPage;
