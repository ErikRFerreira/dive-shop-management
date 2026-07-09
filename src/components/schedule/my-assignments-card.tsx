import { AssignmentBadge } from '@/components/common/assignment-badge';
import { EmptyState } from '@/components/common/empty-state';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { MyScheduleAssignment } from '@/features/schedule/types';
import { formatDisplayDate, formatEnumLabel } from '@/lib/format';

import {
  formatAssignmentTime,
  formatHotelPickup,
} from './my-assignments-list-formatters';
import { AssignmentSectionHeader } from './my-assignments-section-header';

import { Clock, MapPin, Users, StickyNote } from 'lucide-react';

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
 * Renders a Today or Tomorrow assignment section using detailed assignment cards.
 *
 * @param props - Section title, assignments, and compact empty-state copy.
 * @returns Detailed assignment cards or a compact reusable empty-state card.
 */
export function AssignmentCardSection({
  assignments,
  emptyDescription,
  emptyTitle,
  title,
}: AssignmentSectionProps) {
  return (
    <section className="space-y-3">
      <AssignmentSectionHeader count={assignments.length} title={title} />

      {assignments.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
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
    <Card className="rounded-2xl border border-border bg-gradient-to-b from-card to-card-glow p-5 shadow-sm">
      <CardHeader className="gap-3 px-1 md:flex md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-base">
            {[assignment.activitySummary, assignment.dayLabel]
              .filter(Boolean)
              .join(' / ')}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {assignment.primaryCustomerName ?? 'Customer not recorded'}
          </p>
        </div>
        <AssignmentBadge
          label={formatEnumLabel(assignment.assignmentRole)}
          variant="secondary"
          colorScheme="ocean"
        />
      </CardHeader>
      <CardContent className="space-y-4 px-1 mt-1">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <AssignmentDetail
            label="Date & Time"
            value={`${formatDisplayDate(assignment.date)} ·  ${formatAssignmentTime(assignment)}`}
            icon={Clock}
          />
          <AssignmentCustomersSection
            customers={assignment.customers}
            icon={Users}
            numberOfPeople={assignment.numberOfPeople}
          />

          <AssignmentDetail
            label="Hotel / Pickup"
            value={formatHotelPickup(assignment.hotel)}
            icon={MapPin}
          />

          {assignment.scheduleNotes ? (
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Schedule notes
              </p>
              <p className="whitespace-pre-wrap text-sm">
                {assignment.scheduleNotes}
              </p>
            </div>
          ) : (
            <AssignmentDetail
              label="Schedule notes"
              value="No notes"
              icon={StickyNote}
            />
          )}
        </dl>
      </CardContent>
    </Card>
  );
}

/**
 * Renders the active customer/diver list for a personal assignment card.
 *
 * @param props - Customer/diver rows attached to the scheduled booking.
 * @returns A compact uppercase-labeled active participant section.
 */
function AssignmentCustomersSection({
  customers,
  icon: Icon,
  numberOfPeople,
}: {
  customers: MyScheduleAssignment['customers'];
  icon: React.ComponentType<{ className?: string }>;
  numberOfPeople: MyScheduleAssignment['numberOfPeople'];
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase text-muted-foreground flex items-center gap-2">
        <Icon
          className="mt-0.5 size-4 shrink-0 text-muted-foreground"
          aria-hidden
        />
        Active participants
      </p>
      <p className="pl-6 text-xs text-muted-foreground">
        {formatActiveParticipantSummary(numberOfPeople)}
      </p>
      {customers.length > 0 ? (
        <ul className="space-y-1.5 text-sm pl-6">
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
          No active participants recorded
        </p>
      )}
    </div>
  );
}

/**
 * Formats the active participant count shown in assignment cards.
 *
 * @param count - Active participant count mapped from booking/customer rows.
 * @returns Compact active participant copy.
 */
function formatActiveParticipantSummary(count: number | null) {
  if (count === null) {
    return 'Active participants: TBD';
  }

  const label = count === 1 ? 'participant' : 'participants';

  return `${count} active ${label}`;
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
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex gap-2">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div>
        <dt className="text-xs font-medium uppercase text-muted-foreground">
          {label}
        </dt>
        <dd className="mt-1 font-medium">{value}</dd>
      </div>
    </div>
  );
}
