import { requireDashboardRouteAccess } from '@/lib/require-dashboard-route-access';
import { requireCurrentUser } from '@/lib/current-user';

async function Customers() {
  requireDashboardRouteAccess(await requireCurrentUser(), 'customers');

  return <div>Customers Page</div>;
}

export default Customers;
