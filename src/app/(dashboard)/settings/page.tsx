import { requireCurrentUser } from '@/lib/current-user';
import { requireDashboardRouteAccess } from '@/lib/require-dashboard-route-access';

async function SettingsPage() {
  requireDashboardRouteAccess(await requireCurrentUser(), 'settings');

  return <div>Settings Page</div>;
}

export default SettingsPage;
