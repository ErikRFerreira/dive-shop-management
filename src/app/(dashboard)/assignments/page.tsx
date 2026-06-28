import { MyAssignmentsList } from '@/components/schedule/my-assignments-list';
import { getMyScheduleAssignments } from '@/features/schedule/queries';
import { requireCurrentUser } from '@/lib/current-user';
import { requireDashboardRouteAccess } from '@/lib/require-dashboard-route-access';

/**
 * Renders the current instructor or divemaster's read-only assignments page.
 *
 * @returns Personal schedule assignments grouped into staff-facing day buckets.
 */
async function AssignmentPage() {
  const currentUser = await requireCurrentUser();
  requireDashboardRouteAccess(currentUser, 'assignments');
  const assignments = await getMyScheduleAssignments(currentUser);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          My Assignments
        </h1>
        <p className="text-sm text-muted-foreground">
          Activities assigned to you.
        </p>
      </div>

      <MyAssignmentsList assignments={assignments} />
    </div>
  );
}

export default AssignmentPage;
