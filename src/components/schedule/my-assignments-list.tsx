import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type {
  MyScheduleAssignment,
  MyScheduleAssignmentGroupKey,
} from '@/features/schedule/types';
import { groupMyScheduleAssignmentsByDay } from '@/features/schedule/utils';
import { formatDisplayDate, formatEnumLabel } from '@/lib/format';

type MyAssignmentsListProps = {
  assignments: MyScheduleAssignment[];
};

type MyAssignmentCardProps = {
  assignment: MyScheduleAssignment;
};

type InstructorScheduleEmptyStateProps = {
  title?: string;
  description?: string;
};

const assignmentGroupLabels: Record<MyScheduleAssignmentGroupKey, string> = {
  today: 'Today',
  tomorrow: 'Tomorrow',
  upcoming: 'Upcoming',
};

const assignmentGroupEmptyMessages: Record<MyScheduleAssignmentGroupKey, string> =
  {
    today: 'You have no assigned activities today.',
    tomorrow: 'You have no assigned activities tomorrow.',
    upcoming: 'You have no upcoming assigned activities.',
  };

/**
 * Renders the current user's assigned schedule items grouped by staff-facing day buckets.
 *
 * @param props - Personal assignment rows returned by the server query.
 * @returns A compact read-only assignment list with empty states.
 */
export function MyAssignmentsList({ assignments }: MyAssignmentsListProps) {
  if (assignments.length === 0) {
    return <InstructorScheduleEmptyState />;
  }

  const groups = groupMyScheduleAssignmentsByDay(assignments);
  const groupsByKey = new Map(groups.map((group) => [group.key, group]));

  return (
    <div className="space-y-4">
      {Object.entries(assignmentGroupLabels).map(([key, label]) => {
        const groupKey = key as MyScheduleAssignmentGroupKey;
        const group = groupsByKey.get(groupKey);
        const items = group?.items ?? [];

        return (
          <section className="space-y-3" key={groupKey}>
            <div>
              <h2 className="text-lg font-semibold tracking-tight">{label}</h2>
              <p className="text-sm text-muted-foreground">
                {items.length === 1
                  ? '1 assigned activity'
                  : `${items.length} assigned activities`}
              </p>
            </div>

            {items.length > 0 ? (
              <div className="space-y-3">
                {items.map((assignment) => (
                  <MyAssignmentCard
                    assignment={assignment}
                    key={assignment.scheduleItemId}
                  />
                ))}
              </div>
            ) : (
              <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                {assignmentGroupEmptyMessages[groupKey]}
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}

/**
 * Renders one read-only assignment summary card.
 *
 * @param props - Assignment details for one scheduled activity.
 * @returns A compact card with schedule, booking, and current-user role details.
 */
export function MyAssignmentCard({ assignment }: MyAssignmentCardProps) {
  return (
    <Card>
      <CardHeader className="gap-3 md:flex md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-base">
            {assignment.activitySummary}
          </CardTitle>
          <CardDescription>
            {assignment.primaryCustomerName ?? 'Customer not recorded'}
          </CardDescription>
        </div>
        <Badge variant="secondary">
          {formatEnumLabel(assignment.assignmentRole)}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <AssignmentDetail label="Date" value={formatDisplayDate(assignment.date)} />
          <AssignmentDetail
            label="Time"
            value={formatAssignmentTime(assignment)}
          />
          {assignment.hotel ? (
            <AssignmentDetail label="Hotel" value={assignment.hotel} />
          ) : null}
        </dl>

        <AssignmentCustomersSection customers={assignment.customers} />

        {assignment.activities.length > 0 ? (
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase text-muted-foreground">
              Activities
            </p>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {assignment.activities.map((activity) => (
                <li key={activity.id}>
                  {activity.activityLabel ?? assignment.activityLabel}
                  {activity.specialtyCourse
                    ? ` - ${activity.specialtyCourse}`
                    : ''}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {assignment.scheduleNotes ? (
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase text-muted-foreground">
              Schedule notes
            </p>
            <p className="whitespace-pre-wrap text-sm">
              {assignment.scheduleNotes}
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

/**
 * Renders the customer/diver list for a personal assignment card.
 *
 * @param props - Customer/diver rows attached to the scheduled booking.
 * @returns A compact uppercase-labeled customer/diver section.
 */
function AssignmentCustomersSection({
  customers,
}: {
  customers: MyScheduleAssignment['customers'];
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase text-muted-foreground">
        Customers/divers
      </p>
      {customers.length > 0 ? (
        <ul className="space-y-1 text-sm">
          {customers.map((customer, index) => (
            <li
              className="flex flex-wrap items-center gap-2"
              key={`${customer.role}-${customer.name}-${index}`}
            >
              <span>{customer.name}</span>
              {customer.isPrimaryContact ? (
                <Badge className="h-5 px-1.5 text-[10px]" variant="secondary">
                  Primary
                </Badge>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          No customers/divers recorded
        </p>
      )}
    </div>
  );
}

/**
 * Renders an empty state for staff who have no matching assignments.
 *
 * @param props - Optional title and description overrides for section-specific states.
 * @returns A compact card explaining that no assignments are available.
 */
export function InstructorScheduleEmptyState({
  title = 'You have no assigned activities today or upcoming',
  description = 'Assigned activities will appear here after a manager adds you to the schedule.',
}: InstructorScheduleEmptyStateProps = {}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}

/**
 * Renders a compact label/value pair for assignment cards.
 *
 * @param props - Detail label and formatted value to display.
 * @returns A definition-list item for one assignment attribute.
 */
function AssignmentDetail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}

/**
 * Formats an assignment's start and end time for compact display.
 *
 * @param assignment - Assignment containing normalized time fields.
 * @returns `TBD`, a start time, or a start/end time range.
 */
function formatAssignmentTime(assignment: MyScheduleAssignment) {
  if (assignment.isTimeTbd || !assignment.startTime) {
    return 'TBD';
  }

  return assignment.endTime
    ? `${assignment.startTime} - ${assignment.endTime}`
    : assignment.startTime;
}
