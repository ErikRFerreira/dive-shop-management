import { AdminDashboardSummary } from '@/components/dashboard/admin-dashboard-summary';
import { CustomerServiceDashboardSummary } from '@/components/dashboard/customer-service-dashboard-summary';
import { InstructorDashboardSummary } from '@/components/dashboard/instructor-dashboard-summary';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  getDashboardSummaryForCurrentUser,
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
  const summary = await getDashboardSummaryForCurrentUser(currentUser);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Operational summary for your current workflow.
        </p>
      </div>

      <DashboardSummaryContent summary={summary} />
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

  return <DashboardEmptyState />;
}

/**
 * Renders a neutral dashboard state for roles without summary cards in this task.
 *
 * @returns A small card explaining that there are no dashboard summaries.
 */
function DashboardEmptyState() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>No dashboard summaries</CardTitle>
        <CardDescription>
          There are no operational summary cards for your role yet.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

export default Dashboard;
