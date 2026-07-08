import type { ReactNode } from 'react';

import { EmptyState } from '@/components/common/empty-state';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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

import {
  formatAssignmentActivityLine,
  formatAssignmentTime,
  formatHotelPickup,
} from './my-assignments-list-formatters';
import { AssignmentSectionHeader } from './my-assignments-section-header';

type UpcomingAssignmentsTableProps = {
  briefing: MyScheduleAssignmentBriefing;
};

/**
 * Renders the scalable upcoming assignment table.
 *
 * @param props - Briefing payload containing capped upcoming rows and count metadata.
 * @returns A bookings-style table or compact empty-state card for future assignments.
 */
export function UpcomingAssignmentsTable({
  briefing,
}: UpcomingAssignmentsTableProps) {
  const assignments = briefing.upcomingAssignments;
  console.log(assignments);
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
        <Badge
          variant="secondary"
          className="bg-ocean/10 text-ocean ring-ocean/20 flex items-center gap-2"
        >
          <span className="size-1.5 rounded-full bg-current" aria-hidden />
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
    </TableRow>
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
    return (
      <p className="text-muted-foreground">No customers/divers recorded</p>
    );
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
