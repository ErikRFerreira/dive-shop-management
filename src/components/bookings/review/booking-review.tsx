import { BookingMainSections } from '@/components/bookings/booking-main-sections';
import { BookingStatusBadge } from '@/components/bookings/booking-status-badge';
import { StickyRailLayout } from '@/components/common/sticky-rail-layout';
import type { BookingDetailsItem } from '@/features/bookings/queries';
import {
  getBookingReviewReadiness,
  getMissingBookingReviewInformation,
} from '@/features/bookings/review-requirements';
import Link from 'next/link';
import {
  getReviewActivities,
  reviewActivitiesIncludeFunDive,
} from './booking-review-activities';
import { BookingReviewSidebar } from './booking-review-sidebar';
import { ArrowLeft } from 'lucide-react';

type BookingReviewProps = {
  booking: BookingDetailsItem;
  canApprove: boolean;
};

/**
 * Renders the admin review page for one booking request.
 *
 * @param props - Booking detail payload and approval permission flag.
 * @returns Admin review UI with a sticky decision rail and ordered review sections.
 */
export function BookingReview({ booking, canApprove }: BookingReviewProps) {
  const activities = getReviewActivities(booking);
  const includesFunDive = reviewActivitiesIncludeFunDive(activities);
  const missingInformation = getMissingBookingReviewInformation(booking);
  const reviewReadiness = getBookingReviewReadiness(booking);

  return (
    <StickyRailLayout
      className="lg:grid-cols-[minmax(0,1fr)_26rem]"
      contentClassName="space-y-6"
      railClassName="space-y-6"
      rail={
        <BookingReviewSidebar
          bookingId={booking.id}
          canApprove={canApprove}
          adminNotes={booking.adminNotes}
          missingInformation={missingInformation}
          reviewReadiness={reviewReadiness}
          status={booking.status}
        />
      }
    >
      <header className="space-y-4">
        <Link
          className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          href={`/bookings/${booking.id}`}
        >
          <ArrowLeft className="size-4" />
          Back to booking details
        </Link>
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-heading text-2xl font-semibold tracking-tight text-balance">
              Admin review
            </h1>
            <BookingStatusBadge status={booking.status} />
          </div>
          <p className="font-mono text-sm text-muted-foreground">
            Booking ID: {booking.id}
          </p>
        </div>
      </header>

      <BookingMainSections
        activities={activities}
        booking={booking}
        includesFunDive={includesFunDive}
        internalNotesVariant="review"
        summaryTitle="Booking summary"
        summaryVariant="review"
      />
    </StickyRailLayout>
  );
}
