import { AdminDashboardSummary } from '@/components/dashboard/admin-dashboard-summary';
import { CustomerServiceDashboardSummary } from '@/components/dashboard/customer-service-dashboard-summary';
import { InstructorDashboardSummary } from '@/components/dashboard/instructor-dashboard-summary';
import { NeedsAttentionSection } from '@/components/dashboard/needs-attention-section';
import { RecentActivitySection } from '@/components/dashboard/recent-activity-section';
import { TodaysScheduleSection } from '@/components/dashboard/todays-schedule-section';
import { EmptyState } from '@/components/common/empty-state';
import { getDashboardOverviewForCurrentUser } from '@/features/dashboard/queries';
import type { DashboardSummary } from '@/features/dashboard/types';
import { requireDashboardRouteAccess } from '@/lib/require-dashboard-route-access';
import { requireCurrentUser } from '@/lib/current-user';
import PageHeader from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import Link from 'next/dist/client/link';
import { canCreateBookingRequest } from '@/features/bookings/permissions';
import { Plus } from 'lucide-react';

/**
 * Renders the role-aware operational dashboard for the authenticated user.
 *
 * @returns A server-rendered dashboard page with role-scoped summary cards.
 */
async function Dashboard() {
  const currentUser = await requireCurrentUser();
  requireDashboardRouteAccess(currentUser, 'dashboard');
  const overview = await getDashboardOverviewForCurrentUser(currentUser);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader
          title="Dashboard"
          description="Operational overview for Blue Revival"
        />

        {canCreateBookingRequest(currentUser) ? (
          <Button asChild className="shadow-sm shadow-primary/20">
            <Link href="/bookings/new">
              <Plus className="size-4" />
              Create Booking
            </Link>
          </Button>
        ) : null}
      </div>

      <DashboardSummaryContent summary={overview.summary} />

      <div className="grid gap-6 xl:grid-cols-2">
        <NeedsAttentionSection
          currentUser={currentUser}
          items={overview.needsAttention}
        />
        <TodaysScheduleSection
          currentUser={currentUser}
          items={overview.todaysSchedule}
        />
      </div>

      <RecentActivitySection items={overview.recentActivity} />
    </>
  );
}

/**
 * Selects the dashboard summary card group for an already-scoped summary.
 *
 * @param props - The dashboard summary returned by the server query layer.
 * @returns The role-specific summary cards or a neutral empty state.
 */
function DashboardSummaryContent({ summary }: { summary: DashboardSummary }) {
  if (summary.kind === 'admin') {
    return <AdminDashboardSummary summary={summary} />;
  }

  if (summary.kind === 'customer-service') {
    return <CustomerServiceDashboardSummary summary={summary} />;
  }

  if (summary.kind === 'instructor') {
    return <InstructorDashboardSummary summary={summary} />;
  }

  return (
    <EmptyState
      title="No dashboard summaries"
      description="There are no operational summary cards for your role yet."
    />
  );
}

export default Dashboard;
