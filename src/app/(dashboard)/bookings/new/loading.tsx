import { BookingFormLoadingSkeleton } from '@/components/common/dashboard-loading-skeletons';

/**
 * Renders the loading fallback for the new booking route.
 *
 * @returns A skeleton booking form with readiness rail.
 */
export default function Loading() {
  return <BookingFormLoadingSkeleton />;
}
