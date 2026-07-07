import { ScheduleLoadingSkeleton } from '@/components/common/dashboard-loading-skeletons';

/**
 * Renders the loading fallback for the schedule route.
 *
 * @returns A skeleton filter panel and calendar surface.
 */
export default function Loading() {
  return <ScheduleLoadingSkeleton />;
}
