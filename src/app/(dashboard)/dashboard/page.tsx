import { requireDashboardRouteAccess } from '@/lib/require-dashboard-route-access';
import { requireCurrentUser } from '@/lib/current-user';

async function Dashboard() {
  requireDashboardRouteAccess(await requireCurrentUser(), 'dashboard');

  return <div>Dashboard Page</div>;
}

export default Dashboard;
