import PageHeader from '@/components/common/page-header';
import { MyAssignmentsList } from '@/components/schedule/my-assignments-list';
import { getMyScheduleAssignmentBriefing } from '@/features/schedule/queries';
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
  const briefing = await getMyScheduleAssignmentBriefing(currentUser);

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Assignments"
        description="Activities assigned to you."
      />

      <MyAssignmentsList briefing={briefing} />
    </div>
  );
}

export default AssignmentPage;
