import { DashboardLoadingSkeleton } from '@/components/common/dashboard-loading-skeletons';

/**
 * Renders the dashboard data fallback inside the authenticated app shell.
 *
 * @returns A skeleton matching the operational dashboard layout.
 */
export default function Loading() {
  return <DashboardLoadingSkeleton />;
}
