import BookingDetails from '@/components/bookings/booking-details';
import {
  canResubmitBookingForApproval,
  canReviewBookingRequest,
} from '@/features/bookings/permissions';
import { getBookingRequestById } from '@/features/bookings/queries';
import { BookingStatus } from '@/generated/prisma/enums';
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
      canResubmit={
        booking.status === BookingStatus.NEEDS_MORE_INFO &&
        canResubmitBookingForApproval(currentUser, booking.createdById)
      }
    />
  );
}

export default BookingDetailsPage;
