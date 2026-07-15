import { notFound, redirect } from 'next/navigation';

import { BookingReview } from '@/components/bookings/booking-review';
import {
  getAvailableBookingActions,
  canReviewBookingRequest,
} from '@/features/bookings/permissions';
import { getBookingRequestById } from '@/features/bookings/queries';
import { getDefaultLandingPath } from '@/features/auth/redirects';
import { requireCurrentUser } from '@/lib/current-user';
import { requireDashboardRouteAccess } from '@/lib/require-dashboard-route-access';

type Props = {
  params: Promise<{ id: string }>;
};

/** Renders the protected booking review screen for authorized operations users. */
async function ReviewBooking({ params }: Props) {
  const currentUser = await requireCurrentUser();
  requireDashboardRouteAccess(currentUser, 'bookings');

  if (!canReviewBookingRequest(currentUser)) {
    redirect(getDefaultLandingPath(currentUser.role));
  }

  const { id } = await params;
  const booking = await getBookingRequestById(currentUser, id);

  if (!booking) {
    notFound();
  }

  const availableActions = getAvailableBookingActions(currentUser, booking);

  if (!availableActions.canOpenReview) {
    redirect(`/bookings/${booking.id}`);
  }

  return (
    <BookingReview
      booking={booking}
      availableActions={availableActions}
    />
  );
}

export default ReviewBooking;
