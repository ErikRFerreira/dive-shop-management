import { requireDashboardRouteAccess } from '@/lib/require-dashboard-route-access';
import { requireCurrentUser } from '@/lib/current-user';

async function Schedule() {
  requireDashboardRouteAccess(await requireCurrentUser(), 'schedule');

  return <div>Schedule Page</div>;
}

export default Schedule;
