import Link from 'next/link';

import { BookingStatusBadge } from '@/components/bookings/booking-status-badge';
import { Card, CardContent } from '@/components/ui/card';
import type { BookingDetailsItem } from '@/features/bookings/queries';
import {
  getBookingReviewReadiness,
  getMissingBookingReviewInformation,
} from '@/features/bookings/review-requirements';
import { summarizeBookingActivities } from '@/features/bookings/utils';
import {
  getReviewActivities,
  getReviewOverviewRequestedDateTime,
  reviewActivitiesIncludeFunDive,
} from './booking-review-activities';
import {
  Field,
  formatCustomerName,
  formatDate,
  formatEnum,
  formatSourceReferrer,
  formatTimeOrTbd,
  getPrimaryBookingCustomer,
} from './booking-review-display';
import { BookingReviewMainSections } from './booking-review-sections';
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
 * @returns Admin review UI with main detail sections and decision sidebar.
 */
export function BookingReview({ booking, canApprove }: BookingReviewProps) {
  const activities = getReviewActivities(booking);
  const includesFunDive = reviewActivitiesIncludeFunDive(activities);
  const missingInformation = getMissingBookingReviewInformation(booking);
  const reviewReadiness = getBookingReviewReadiness(booking);
  const requested = getReviewOverviewRequestedDateTime(booking, activities);
  const primaryCustomer = getPrimaryBookingCustomer(booking);

  return (
    <>
      <header className="flex flex-wrap items-start justify-between gap-4">
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
        <Link
          className="inline-flex w-fit items-center gap-1.5 mb-4 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          href={`/bookings/${booking.id}`}
        >
          <ArrowLeft className="size-4" />
          Back to booking details
        </Link>
      </header>

      <Card>
        <CardContent className="grid gap-4 pt-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Booking ID" value={booking.id} />
          <Field label="Status" value={formatEnum(booking.status)} />
          <Field
            label="Requested date"
            value={formatDate(requested.requestedDate)}
          />
          <Field
            label="Requested time"
            value={formatTimeOrTbd(requested.requestedTime)}
          />
          <Field
            label="Activity summary"
            value={summarizeBookingActivities(
              booking.activities,
              booking.activityType,
            )}
          />
          <Field label="Total participants" value={booking.numberOfPeople} />
          <Field
            label="Primary customer"
            value={formatCustomerName(primaryCustomer?.customer ?? null)}
          />
          <Field
            label="Source / referrer"
            value={formatSourceReferrer(booking)}
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_26rem]">
        <BookingReviewMainSections
          booking={booking}
          activities={activities}
          includesFunDive={includesFunDive}
        />
        <BookingReviewSidebar
          bookingId={booking.id}
          canApprove={canApprove}
          adminNotes={booking.adminNotes}
          missingInformation={missingInformation}
          reviewReadiness={reviewReadiness}
          status={booking.status}
        />
      </div>
    </>
  );
}
