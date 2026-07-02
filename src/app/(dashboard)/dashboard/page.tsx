import { AdminDashboardSummary } from '@/components/dashboard/admin-dashboard-summary';
import { CustomerServiceDashboardSummary } from '@/components/dashboard/customer-service-dashboard-summary';
import {
  DashboardEmptyState,
  NeedsAttentionSection,
  RecentActivitySection,
  TodaysScheduleSection,
} from '@/components/dashboard/dashboard-operational-sections';
import { InstructorDashboardSummary } from '@/components/dashboard/instructor-dashboard-summary';
import {
  getDashboardOverviewForCurrentUser,
  type DashboardSummary,
} from '@/features/dashboard/queries';
import { requireDashboardRouteAccess } from '@/lib/require-dashboard-route-access';
import { requireCurrentUser } from '@/lib/current-user';

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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Operational summary for your current workflow.
        </p>
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
    </div>
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
    <DashboardEmptyState
      title="No dashboard summaries"
      description="There are no operational summary cards for your role yet."
    />
  );
}

export default Dashboard;
