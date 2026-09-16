import type { ReactNode } from 'react';

import { AssignmentBadge } from '@/components/common/assignment-badge';
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
import { buildScheduleEventTitle } from '@/features/schedule/utils';
import { formatDisplayDate, formatEnumLabel } from '@/lib/format';

import {
  formatAssignmentActivityLine,
  formatAssignmentSlot,
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

  return (
    <section className="space-y-3">
      <AssignmentSectionHeader
        count={briefing.summary.upcomingCount}
        title="Upcoming"
      />

      {assignments.length > 0 ? (
        <div className="space-y-3">
          <Card className="overflow-visible rounded-none border-0 bg-transparent py-0 shadow-none xl:overflow-hidden xl:rounded-2xl xl:border xl:border-border xl:bg-linear-to-b xl:from-card xl:to-card-glow xl:shadow-sm">
            <CardContent className="p-0">
              <Table
                aria-label="Upcoming assignments"
                className="block w-full xl:table xl:table-fixed"
              >
                <TableHeader className="hidden xl:table-header-group">
                  <TableRow className="border-b bg-muted/40">
                    <AssignmentTableHead className="w-[13%] pl-6">
                      Date / Slot
                    </AssignmentTableHead>
                    <AssignmentTableHead className="w-[18%]">
                      Activity
                    </AssignmentTableHead>
                    <AssignmentTableHead className="w-[20%]">
                      Active participants
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
                <TableBody className="block space-y-3 [&_tr:last-child]:border xl:table-row-group xl:space-y-0 xl:[&_tr:last-child]:border-0">
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
    <TableRow className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 rounded-2xl border border-border bg-linear-to-b from-card to-card-glow p-4 shadow-sm xl:table-row xl:rounded-none xl:border-x-0 xl:border-t-0 xl:border-b xl:bg-none xl:p-0 xl:shadow-none">
      <TableCell className="col-start-1 row-start-1 whitespace-normal p-0 align-middle xl:table-cell xl:py-5 xl:pl-6 xl:align-top">
        <div className="space-y-1">
          <p className="font-medium">{formatDisplayDate(assignment.date)}</p>
          <p className="text-sm text-muted-foreground">
            {formatAssignmentSlot(assignment)}
          </p>
        </div>
      </TableCell>
      <TableCell className="col-span-2 mt-4 whitespace-normal wrap-break-word border-t border-border/70 p-0 pt-4 align-top xl:table-cell xl:mt-0 xl:border-0 xl:py-5">
        <MobileFieldLabel>Activity</MobileFieldLabel>
        <AssignmentActivitySummary assignment={assignment} />
      </TableCell>
      <TableCell className="col-span-2 mt-4 whitespace-normal wrap-break-word border-t border-border/70 p-0 pt-4 align-top xl:table-cell xl:mt-0 xl:border-0 xl:py-5">
        <MobileFieldLabel>Active participants</MobileFieldLabel>
        <AssignmentCustomerSummary assignment={assignment} />
      </TableCell>
      <TableCell className="col-span-2 mt-4 whitespace-normal wrap-break-word border-t border-border/70 p-0 pt-4 align-top xl:table-cell xl:mt-0 xl:border-0 xl:py-5">
        <MobileFieldLabel>Location</MobileFieldLabel>
        {formatHotelPickup(assignment.hotel)}
      </TableCell>
      <TableCell className="col-start-2 row-start-1 p-0 text-right align-middle xl:table-cell xl:py-5 xl:text-left xl:align-top">
        <span className="sr-only xl:hidden">Role: </span>
        <AssignmentBadge
          label={formatEnumLabel(assignment.assignmentRole)}
          variant="secondary"
          colorScheme="ocean"
        />
      </TableCell>
      <TableCell className="col-span-2 mt-4 whitespace-normal wrap-break-word border-t border-border/70 p-0 pt-4 align-top xl:table-cell xl:mt-0 xl:border-0 xl:py-5">
        <MobileFieldLabel>Notes</MobileFieldLabel>
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
 * Labels one full-width assignment detail in the compact card layout.
 *
 * @param props - Mobile-only field label content.
 * @returns An uppercase label hidden when the desktop table is active.
 */
function MobileFieldLabel({ children }: { children: ReactNode }) {
  return (
    <span className="mb-2 block text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground/80 xl:hidden">
      {children}
    </span>
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
  const title = buildScheduleEventTitle({
    activityLabel: assignment.activitySummary,
    customerName: assignment.primaryCustomerName,
    dayLabel: assignment.dayLabel,
    numberOfPeople: assignment.numberOfPeople,
  });

  return (
    <div className="space-y-1.5">
      <p className="font-medium">{title}</p>
      {assignment.activities.length > 1 ? (
        <ul className="space-y-1 text-xs text-muted-foreground">
          {assignment.activities.map((activity, index) => (
            <li
              key={`${activity.activityType ?? 'unknown'}-${activity.specialtyCourse ?? 'general'}-${index}`}
            >
              {formatAssignmentActivityLine(assignment, activity)}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/**
 * Renders primary active participant and additional active divers for an upcoming table row.
 *
 * @param props - Assignment whose customer rows should be summarized.
 * @returns Compact active participant display with missing-data fallback.
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
      <p className="text-muted-foreground">No active participants recorded</p>
    );
  }

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium uppercase text-muted-foreground">
        {formatActiveParticipantSummary(assignment.numberOfPeople)}
      </p>
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
 * Formats an active participant count for assignment table rows.
 *
 * @param count - Active operational participant count mapped from the schedule query.
 * @returns Compact count copy for assignment displays.
 */
function formatActiveParticipantSummary(count: number | null) {
  if (count === null) {
    return 'Active participants: TBD';
  }

  const label = count === 1 ? 'participant' : 'participants';

  return `${count} active ${label}`;
}
