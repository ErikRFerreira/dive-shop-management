import { EmptyState } from '@/components/common/empty-state';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { MyScheduleAssignment } from '@/features/schedule/types';
import { formatDisplayDate, formatEnumLabel } from '@/lib/format';

import {
  formatAssignmentActivityLine,
  formatAssignmentTime,
  formatHotelPickup,
} from './my-assignments-list-formatters';
import { AssignmentSectionHeader } from './my-assignments-section-header';

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
function AssignmentDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}
