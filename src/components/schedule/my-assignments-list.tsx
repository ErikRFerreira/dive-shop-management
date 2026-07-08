import type { MyScheduleAssignmentBriefing } from '@/features/schedule/types';

import { AssignmentCardSection } from './my-assignments-card';
import { AssignmentSummaryCards } from './my-assignments-summary-cards';
import { UpcomingAssignmentsTable } from './my-assignments-table';

type MyAssignmentsListProps = {
  briefing: MyScheduleAssignmentBriefing;
};

/**
 * Renders the current user's daily assignment briefing and capped upcoming list.
 *
 * @param props - Date-bucketed personal assignment briefing from the server query.
 * @returns A read-only instructor assignment page with summary, cards, and a scalable table.
 */
export function MyAssignmentsList({ briefing }: MyAssignmentsListProps) {
  return (
    <div className="space-y-6">
      <AssignmentSummaryCards briefing={briefing} />

      <AssignmentCardSection
        assignments={briefing.todayAssignments}
        emptyDescription="Assigned activities for today will appear here after a manager adds you to the schedule."
        emptyTitle="No assigned activities today."
        title="Today"
      />

      <AssignmentCardSection
        assignments={briefing.tomorrowAssignments}
        emptyDescription="Assigned activities for tomorrow will appear here after a manager adds you to the schedule."
        emptyTitle="No assigned activities tomorrow."
        title="Tomorrow"
      />

      <UpcomingAssignmentsTable briefing={briefing} />
    </div>
  );
}
