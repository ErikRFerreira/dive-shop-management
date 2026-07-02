import Link from 'next/link';

import { BookingStatus, UserRole } from '@/generated/prisma/enums';
import type {
  DashboardNeedsAttentionItem as DashboardNeedsAttentionItemData,
  DashboardRecentActivityItem as DashboardRecentActivityItemData,
  DashboardScheduleItem as DashboardScheduleItemData,
} from '@/features/dashboard/queries';
import type { CurrentUser } from '@/lib/current-user';
import { formatDisplayDate, formatDisplayDateTime } from '@/lib/format';
import { BookingStatusBadge } from '@/components/bookings/booking-status-badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

type DashboardEmptyStateProps = {
  title: string;
  description: string;
};

type DashboardSectionUser = Pick<CurrentUser, 'id' | 'role'>;

type NeedsAttentionSectionProps = {
  items: DashboardNeedsAttentionItemData[];
  currentUser: DashboardSectionUser;
};

type NeedsAttentionAction = {
  label: string;
  href: string;
};

type TodaysScheduleSectionProps = {
  items: DashboardScheduleItemData[];
  currentUser: DashboardSectionUser;
};

type RecentActivitySectionProps = {
  items: DashboardRecentActivityItemData[];
};

const operationsRoles = [UserRole.ADMIN, UserRole.MANAGER] as const;
const RECENT_ACTIVITY_DISPLAY_LIMIT = 3;

/**
 * Renders a reusable compact dashboard empty state.
 *
 * @param props - Empty-state title and supporting description.
 * @returns A card-shaped empty state for dashboard sections.
 */
export function DashboardEmptyState({
  title,
  description,
}: DashboardEmptyStateProps) {
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
 * Renders booking and schedule rows that need operational attention.
 *
 * @param props - Role-scoped attention rows and current user details.
 * @returns A dashboard card containing attention items or an empty state.
 */
export function NeedsAttentionSection({
  items,
  currentUser,
}: NeedsAttentionSectionProps) {
  if (items.length === 0) {
    return (
      <DashboardEmptyState
        title="Nothing needs attention"
        description="Bookings and scheduled activities that need action will appear here."
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Needs attention</CardTitle>
        <CardDescription>
          Booking requests and scheduled activities that need follow-up.
        </CardDescription>
      </CardHeader>
      <CardContent className="divide-y">
        {items.map((item) => (
          <NeedsAttentionItem
            currentUser={currentUser}
            item={item}
            key={item.id}
          />
        ))}
      </CardContent>
    </Card>
  );
}

/**
 * Renders one dashboard attention row with a role-aware action.
 *
 * @param props - Attention item and user role used to choose the action link.
 * @returns A compact attention list item.
 */
export function NeedsAttentionItem({
  item,
  currentUser,
}: {
  item: DashboardNeedsAttentionItemData;
  currentUser: DashboardSectionUser;
}) {
  const action = getNeedsAttentionAction(item, currentUser);

  return (
    <article className="grid gap-4 py-4 first:pt-0 last:pb-0 md:grid-cols-[1fr_auto]">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-medium">{item.activitySummary}</h3>
          {item.status ? <BookingStatusBadge status={item.status} /> : null}
        </div>

        <p className="text-sm text-muted-foreground">
          {item.primaryCustomerName ?? 'Customer not recorded'}
        </p>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>{item.label}</span>
          {item.date ? <span>{formatDisplayDate(item.date)}</span> : null}
          {item.detail ? <span>{item.detail}</span> : null}
        </div>
      </div>

      {action ? (
        <div className="self-start md:justify-self-end">
          <Button asChild size="sm" variant="outline">
            <Link href={action.href}>{action.label}</Link>
          </Button>
        </div>
      ) : null}
    </article>
  );
}

/**
 * Renders today's official schedule rows for the dashboard user.
 *
 * @param props - Role-scoped schedule rows and current user details.
 * @returns A dashboard card containing today's scheduled activities.
 */
export function TodaysScheduleSection({
  items,
  currentUser,
}: TodaysScheduleSectionProps) {
  if (items.length === 0) {
    return (
      <DashboardEmptyState
        title="No scheduled activities today"
        description="Approved bookings scheduled for today will appear here."
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Today&apos;s schedule</CardTitle>
        <CardDescription>
          Official scheduled activities for today.
        </CardDescription>
      </CardHeader>
      <CardContent className="divide-y">
        {items.map((item) => (
          <TodaysScheduleItem
            currentUser={currentUser}
            item={item}
            key={item.scheduleItemId}
          />
        ))}
      </CardContent>
    </Card>
  );
}

/**
 * Renders one compact schedule row for today's dashboard section.
 *
 * @param props - Schedule item and user role used to choose optional controls.
 * @returns A read-only schedule list item with role-aware navigation.
 */
export function TodaysScheduleItem({
  item,
  currentUser,
}: {
  item: DashboardScheduleItemData;
  currentUser: DashboardSectionUser;
}) {
  const action = getTodaysScheduleAction(item, currentUser);

  return (
    <article className="grid gap-4 py-4 first:pt-0 last:pb-0 md:grid-cols-[5rem_1fr_auto]">
      <div>
        <p className="text-sm font-medium">{item.startTime ?? 'TBD'}</p>
        <p className="text-xs text-muted-foreground">Time</p>
      </div>

      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-medium">{item.activitySummary}</h3>
          <p className="text-sm text-muted-foreground">
            {item.primaryCustomerName ?? 'Customer not recorded'}
          </p>
        </div>

        <div className="grid gap-3 text-sm sm:grid-cols-3">
          <ScheduleDetail
            label="Customers/divers"
            value={formatScheduleCustomers(item)}
          />
          <ScheduleDetail label="Hotel" value={item.hotel ?? 'No hotel'} />
          <ScheduleDetail
            label="Staff"
            value={
              item.assignedStaffNames.length > 0
                ? item.assignedStaffNames.join(', ')
                : 'Unassigned'
            }
          />
        </div>
      </div>

      {action ? (
        <div className="self-start md:justify-self-end">
          <Button asChild size="sm" variant="outline">
            <Link href={action.href}>{action.label}</Link>
          </Button>
        </div>
      ) : null}
    </article>
  );
}

/**
 * Renders recent dashboard activity as a short read-only list.
 *
 * @param props - Recent activity rows already scoped by the query layer.
 * @returns A dashboard card with recent activity rows or an empty state.
 */
export function RecentActivitySection({ items }: RecentActivitySectionProps) {
  const recentItems = items.slice(0, RECENT_ACTIVITY_DISPLAY_LIMIT);

  if (recentItems.length === 0) {
    return (
      <DashboardEmptyState
        title="No recent activity"
        description="Recent booking and schedule updates will appear here."
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent activity</CardTitle>
        <CardDescription>
          Latest booking and schedule updates from your workflow.
        </CardDescription>
      </CardHeader>
      <CardContent className="divide-y">
        {recentItems.map((item) => (
          <RecentActivityItem item={item} key={item.id} />
        ))}
      </CardContent>
    </Card>
  );
}

/**
 * Renders one read-only recent activity row.
 *
 * @param props - Activity row to display.
 * @returns A compact activity list item.
 */
export function RecentActivityItem({
  item,
}: {
  item: DashboardRecentActivityItemData;
}) {
  return (
    <article className="space-y-2 py-4 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-medium">{item.label}</h3>
        <BookingStatusBadge status={item.status} />
      </div>
      <p className="text-sm text-muted-foreground">
        {item.primaryCustomerName ?? 'Customer not recorded'} -{' '}
        {item.activitySummary}
      </p>
      <p className="text-xs text-muted-foreground">
        {formatDisplayDateTime(item.occurredAt)}
      </p>
    </article>
  );
}

/**
 * Renders a compact label and value pair for today's schedule rows.
 *
 * @param props - Detail label and value.
 * @returns A small dashboard schedule detail block.
 */
function ScheduleDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase text-muted-foreground">
        {label}
      </p>
      <p className="mt-1">{value}</p>
    </div>
  );
}

/**
 * Chooses the role-aware action for an attention row.
 *
 * @param item - Attention row being rendered.
 * @param currentUser - Current user role used for link visibility.
 * @returns Link metadata, or null when no safe action should be shown.
 */
function getNeedsAttentionAction(
  item: DashboardNeedsAttentionItemData,
  currentUser: DashboardSectionUser,
): NeedsAttentionAction | null {
  if (
    isOperationsUser(currentUser) &&
    item.kind === 'booking' &&
    item.status === BookingStatus.PENDING_APPROVAL
  ) {
    return {
      label: 'Review',
      href: `/bookings/${item.bookingId}/review`,
    };
  }

  if (isOperationsUser(currentUser) && item.kind === 'schedule') {
    return {
      label: 'Assign staff',
      href: `/bookings/${item.bookingId}`,
    };
  }

  if (
    currentUser.role === UserRole.CUSTOMER_SERVICE &&
    item.kind === 'booking' &&
    item.status === BookingStatus.NEEDS_MORE_INFO
  ) {
    return {
      label: 'Fix details',
      href: `/bookings/${item.bookingId}/edit`,
    };
  }

  if (canAccessBookingDetails(currentUser)) {
    return {
      label: 'View',
      href: `/bookings/${item.bookingId}`,
    };
  }

  return null;
}

/**
 * Chooses the role-aware action for today's schedule row.
 *
 * @param item - Schedule row being rendered.
 * @param currentUser - Current user role used for link visibility.
 * @returns Link metadata, or null when no safe action should be shown.
 */
function getTodaysScheduleAction(
  item: DashboardScheduleItemData,
  currentUser: DashboardSectionUser,
): NeedsAttentionAction | null {
  if (isOperationsUser(currentUser) && item.isUnassigned) {
    return {
      label: 'Assign staff',
      href: `/bookings/${item.bookingId}`,
    };
  }

  if (canAccessBookingDetails(currentUser)) {
    return {
      label: 'View booking',
      href: `/bookings/${item.bookingId}`,
    };
  }

  return null;
}

/**
 * Formats schedule customer rows into a compact comma-separated display value.
 *
 * @param item - Schedule row containing customers from the booking.
 * @returns Customer/diver names or a safe fallback.
 */
function formatScheduleCustomers(item: DashboardScheduleItemData) {
  if (item.customers.length === 0) {
    return item.primaryCustomerName ?? 'No customers/divers recorded';
  }

  return item.customers.map((customer) => customer.name).join(', ');
}

/**
 * Checks whether a user can access booking detail routes from dashboard links.
 *
 * @param currentUser - Current user role.
 * @returns True for Admin, Manager, and Customer Service users.
 */
function canAccessBookingDetails(currentUser: DashboardSectionUser) {
  return (
    currentUser.role === UserRole.ADMIN ||
    currentUser.role === UserRole.MANAGER ||
    currentUser.role === UserRole.CUSTOMER_SERVICE
  );
}

/**
 * Checks whether a user can manage operational review and assignment work.
 *
 * @param currentUser - Current user role.
 * @returns True for Admin and Manager users.
 */
function isOperationsUser(currentUser: Pick<CurrentUser, 'role'>) {
  return operationsRoles.includes(
    currentUser.role as (typeof operationsRoles)[number],
  );
}
