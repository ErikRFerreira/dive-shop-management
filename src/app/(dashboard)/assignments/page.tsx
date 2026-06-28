import { requireCurrentUser } from '@/lib/current-user';
import { requireDashboardRouteAccess } from '@/lib/require-dashboard-route-access';

/**
 * Renders the personal assignments route shell with server-side access checks.
 *
 * @returns Placeholder content for the future read-only My Assignments UI.
 */
async function AssignmentPage() {
  const currentUser = await requireCurrentUser();
  requireDashboardRouteAccess(currentUser, 'assignments');

  return <div>Assignment Page</div>;
}

export default AssignmentPage;
