import type { ReactNode } from 'react';

import { EmptyState } from '@/components/common/empty-state';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type {
  MyScheduleAssignment,
  MyScheduleAssignmentBriefing,
} from '@/features/schedule/types';
import { formatDisplayDate, formatEnumLabel } from '@/lib/format';

type MyAssignmentsListProps = {
  briefing: MyScheduleAssignmentBriefing;
};

type MyAssignmentCardProps = {
  assignment: MyScheduleAssignment;
};

type AssignmentSectionProps = {
  assignments: MyScheduleAssignment[];
  emptyDescription: string;
  emptyTitle: string;
  title: string;
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

/**
 * Renders the compact top summary cards for the personal assignment briefing.
 *
 * @param props - Briefing payload containing summary counts and next assignment metadata.
 * @returns Four compact operational summary cards.
 */
function AssignmentSummaryCards({
  briefing,
}: {
  briefing: MyScheduleAssignmentBriefing;
}) {
  const nextAssignment = briefing.summary.nextAssignment;

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <AssignmentSummaryCard
        label="Today"
        value={String(briefing.summary.todayCount)}
      />
      <AssignmentSummaryCard
        label="Tomorrow"
        value={String(briefing.summary.tomorrowCount)}
      />
      <AssignmentSummaryCard
        label="Upcoming"
        value={String(briefing.summary.upcomingCount)}
      />
      <AssignmentSummaryCard
        label="Next assignment"
        value={
          nextAssignment
            ? formatDisplayDate(nextAssignment.date)
            : 'None scheduled'
        }
        detail={nextAssignment?.activitySummary}
      />
    </div>
  );
}

/**
 * Renders one compact assignment briefing summary card.
 *
 * @param props - Summary label, value, and optional supporting detail.
 * @returns A compact card matching the dashboard visual language.
 */
function AssignmentSummaryCard({
  detail,
  label,
  value,
}: {
  detail?: string;
  label: string;
  value: string;
}) {
  return (
    <Card className="rounded-2xl border border-border bg-linear-to-b from-card to-card-glow shadow-sm">
      <CardHeader className="space-y-1 p-4">
        <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
          {label}
        </p>
        <CardTitle className="text-2xl font-semibold tracking-tight">
          {value}
        </CardTitle>
        {detail ? (
          <p className="line-clamp-1 text-sm text-muted-foreground">
            {detail}
          </p>
        ) : null}
      </CardHeader>
    </Card>
  );
}

/**
 * Renders a Today or Tomorrow assignment section using detailed assignment cards.
 *
 * @param props - Section title, assignments, and compact empty-state copy.
 * @returns Detailed assignment cards or a compact reusable empty-state card.
 */
function AssignmentCardSection({
  assignments,
  emptyDescription,
  emptyTitle,
  title,
}: AssignmentSectionProps) {
  return (
    <section className="space-y-3">
      <AssignmentSectionHeader count={assignments.length} title={title} />

      {assignments.length > 0 ? (
        <div className="space-y-3">
          {assignments.map((assignment) => (
            <MyAssignmentCard
              assignment={assignment}
              key={assignment.scheduleItemId}
            />
          ))}
        </div>
      ) : (
        <EmptyState description={emptyDescription} title={emptyTitle} />
      )}
    </section>
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
    <Card className="rounded-2xl border border-border bg-linear-to-b from-card to-card-glow shadow-sm">
      <CardHeader className="gap-3 border-b border-border px-5 md:flex md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-base">
            {assignment.activitySummary}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {assignment.primaryCustomerName ?? 'Customer not recorded'}
          </p>
        </div>
        <Badge variant="secondary">
          {formatEnumLabel(assignment.assignmentRole)}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4 p-5">
        <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <AssignmentDetail
            label="Date"
            value={formatDisplayDate(assignment.date)}
          />
          <AssignmentDetail
            label="Time"
            value={formatAssignmentTime(assignment)}
          />
          <AssignmentDetail
            label="Location"
            value={formatHotelPickup(assignment.hotel)}
          />
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
                  {formatAssignmentActivityLine(assignment, activity)}
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
 * Renders the scalable upcoming assignment table.
 *
 * @param props - Briefing payload containing capped upcoming rows and count metadata.
 * @returns A bookings-style table or compact empty-state card for future assignments.
 */
function UpcomingAssignmentsTable({
  briefing,
}: {
  briefing: MyScheduleAssignmentBriefing;
}) {
  const assignments = briefing.upcomingAssignments;

  return (
    <section className="space-y-3">
      <AssignmentSectionHeader
        count={briefing.summary.upcomingCount}
        title="Upcoming"
      />

      {assignments.length > 0 ? (
        <div className="space-y-3">
          <Card className="overflow-hidden rounded-2xl border border-border bg-linear-to-b from-card to-card-glow py-0 shadow-sm">
            <CardContent className="p-0">
              <Table className="table-fixed">
                <TableHeader>
                  <TableRow className="border-b bg-muted/40">
                    <AssignmentTableHead className="w-[13%] pl-6">
                      Date / Time
                    </AssignmentTableHead>
                    <AssignmentTableHead className="w-[18%]">
                      Activity
                    </AssignmentTableHead>
                    <AssignmentTableHead className="w-[20%]">
                      Customer / Divers
                    </AssignmentTableHead>
                    <AssignmentTableHead className="w-[16%]">
                      Location
                    </AssignmentTableHead>
                    <AssignmentTableHead className="w-[12%]">
                      Role
                    </AssignmentTableHead>
                    <AssignmentTableHead className="w-[14%]">
                      Notes
                    </AssignmentTableHead>
                    <AssignmentTableHead className="w-[7%] pr-6 text-right">
                      Actions
                    </AssignmentTableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map((assignment) => (
                    <UpcomingAssignmentRow
                      assignment={assignment}
                      key={assignment.scheduleItemId}
                    />
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <p className="text-sm text-muted-foreground">
            {formatUpcomingShowingCopy(
              assignments.length,
              briefing.summary.upcomingCount,
              briefing.upcomingLimit,
            )}
          </p>
        </div>
      ) : (
        <EmptyState
          description="Future assigned activities will appear here after they are scheduled."
          title="No upcoming assigned activities."
        />
      )}
    </section>
  );
}

/**
 * Renders one table header cell with assignment-list table styling.
 *
 * @param props - Table head content and optional width/alignment classes.
 * @returns A styled table header cell.
 */
function AssignmentTableHead({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <TableHead
      className={`h-12 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground/80 ${className}`}
    >
      {children}
    </TableHead>
  );
}

/**
 * Renders one upcoming assignment row in the scalable table.
 *
 * @param props - Assignment row to display.
 * @returns A read-only table row with no workflow or assignment-management controls.
 */
function UpcomingAssignmentRow({
  assignment,
}: {
  assignment: MyScheduleAssignment;
}) {
  return (
    <TableRow className="border-b last:border-b-0">
      <TableCell className="whitespace-normal py-5 pl-6 align-top">
        <div className="space-y-1">
          <p className="font-medium">{formatDisplayDate(assignment.date)}</p>
          <p className="text-sm text-muted-foreground">
            {formatAssignmentTime(assignment)}
          </p>
        </div>
      </TableCell>
      <TableCell className="whitespace-normal wrap-break-word py-5 align-top">
        <AssignmentActivitySummary assignment={assignment} />
      </TableCell>
      <TableCell className="whitespace-normal wrap-break-word py-5 align-top">
        <AssignmentCustomerSummary assignment={assignment} />
      </TableCell>
      <TableCell className="whitespace-normal wrap-break-word py-5 align-top">
        {formatHotelPickup(assignment.hotel)}
      </TableCell>
      <TableCell className="py-5 align-top">
        <Badge variant="secondary">
          {formatEnumLabel(assignment.assignmentRole)}
        </Badge>
      </TableCell>
      <TableCell className="whitespace-normal wrap-break-word py-5 align-top">
        {assignment.scheduleNotes ? (
          <p className="whitespace-pre-wrap">{assignment.scheduleNotes}</p>
        ) : (
          <p className="text-muted-foreground">No notes</p>
        )}
      </TableCell>
      <TableCell className="py-5 pr-6 text-right align-top">
        <span className="text-sm text-muted-foreground">Read-only</span>
      </TableCell>
    </TableRow>
  );
}

/**
 * Renders a section title and assignment count.
 *
 * @param props - Section title and count to display.
 * @returns A compact section header.
 */
function AssignmentSectionHeader({
  count,
  title,
}: {
  count: number;
  title: string;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <p className="text-sm text-muted-foreground">
        {count === 1 ? '1 assigned activity' : `${count} assigned activities`}
      </p>
    </div>
  );
}

/**
 * Renders activity summary details for an upcoming table row.
 *
 * @param props - Assignment whose activity details should be summarized.
 * @returns Compact activity summary with optional stacked activity lines.
 */
function AssignmentActivitySummary({
  assignment,
}: {
  assignment: MyScheduleAssignment;
}) {
  return (
    <div className="space-y-1.5">
      <p className="font-medium">{assignment.activitySummary}</p>
      {assignment.activities.length > 1 ? (
        <ul className="space-y-1 text-xs text-muted-foreground">
          {assignment.activities.map((activity) => (
            <li key={activity.id}>
              {formatAssignmentActivityLine(assignment, activity)}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/**
 * Renders primary customer and additional divers for an upcoming table row.
 *
 * @param props - Assignment whose customer rows should be summarized.
 * @returns Compact customer/diver display with missing-data fallback.
 */
function AssignmentCustomerSummary({
  assignment,
}: {
  assignment: MyScheduleAssignment;
}) {
  const primaryCustomer =
    assignment.customers.find((customer) => customer.isPrimaryContact) ??
    assignment.customers[0] ??
    null;
  const additionalCustomers = assignment.customers.filter(
    (customer) => customer !== primaryCustomer,
  );

  if (!primaryCustomer) {
    return <p className="text-muted-foreground">No customers/divers recorded</p>;
  }

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-medium">{primaryCustomer.name}</p>
        {primaryCustomer.isPrimaryContact ? (
          <Badge className="h-5 px-1.5 text-[10px]" variant="secondary">
            Primary
          </Badge>
        ) : null}
      </div>
      {additionalCustomers.length > 0 ? (
        <ul className="space-y-1 text-sm text-muted-foreground">
          {additionalCustomers.map((customer, index) => (
            <li key={`${customer.role}-${customer.name}-${index}`}>
              {customer.name}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
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
        <ul className="space-y-1.5 text-sm">
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
 * Formats one booking activity line for cards and table rows.
 *
 * @param assignment - Parent assignment used for fallback activity label.
 * @param activity - Activity row attached to the booking.
 * @returns Activity label plus specialty course when one is recorded.
 */
function formatAssignmentActivityLine(
  assignment: MyScheduleAssignment,
  activity: MyScheduleAssignment['activities'][number],
) {
  const activityLabel = activity.activityLabel ?? assignment.activityLabel;

  return activity.specialtyCourse
    ? `${activityLabel} - ${activity.specialtyCourse}`
    : activityLabel;
}

/**
 * Formats an assignment's start and end time for compact display.
 *
 * @param assignment - Assignment containing normalized time fields.
 * @returns `Time TBD`, a start time, or a start/end time range.
 */
function formatAssignmentTime(assignment: MyScheduleAssignment) {
  if (assignment.isTimeTbd || !assignment.startTime) {
    return 'Time TBD';
  }

  return assignment.endTime
    ? `${assignment.startTime} - ${assignment.endTime}`
    : assignment.startTime;
}

/**
 * Formats operational hotel or pickup information with a consistent missing-value label.
 *
 * @param hotel - Hotel or pickup text mapped from the schedule assignment query.
 * @returns Recorded hotel/pickup text, or the staff-facing missing-value copy.
 */
function formatHotelPickup(hotel: string | null) {
  return hotel ? `Hotel / pickup: ${hotel}` : 'Hotel / pickup: Not recorded';
}

/**
 * Formats the bounded upcoming table footer copy.
 *
 * @param visibleCount - Number of upcoming rows rendered.
 * @param totalCount - Total number of matching upcoming assignments.
 * @param limit - Maximum upcoming rows loaded for the table.
 * @returns Staff-facing copy explaining the bounded upcoming list.
 */
function formatUpcomingShowingCopy(
  visibleCount: number,
  totalCount: number,
  limit: number,
) {
  if (totalCount > visibleCount && visibleCount === limit) {
    return `Showing next ${limit} assignments`;
  }

  return `Showing all ${visibleCount} upcoming assignments`;
}
