import { requireCurrentUser } from '@/lib/current-user';
import { requireDashboardRouteAccess } from '@/lib/require-dashboard-route-access';
import { ComingSoon } from '@/components/common/coming-soon';

async function SettingsPage() {
  requireDashboardRouteAccess(await requireCurrentUser(), 'settings');

  return (
    <ComingSoon
      title="Coming Soon"
      description="Configuration options for the dive shop management system."
    />
  );
}

export default SettingsPage;
