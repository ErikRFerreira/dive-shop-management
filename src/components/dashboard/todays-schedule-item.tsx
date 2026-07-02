import Link from 'next/link';

import type { DashboardScheduleItem as DashboardScheduleItemData } from '@/features/dashboard/types';
import { Button } from '@/components/ui/button';

import type { DashboardSectionUser } from './dashboard-operational-helpers';
import {
  formatPrimaryCustomerName,
  formatScheduleCustomers,
  getTodaysScheduleAction,
} from './dashboard-operational-helpers';

type TodaysScheduleItemProps = {
  item: DashboardScheduleItemData;
  currentUser: DashboardSectionUser;
};

/**
 * Renders one compact schedule row for today's dashboard section.
 *
 * @param props - Schedule item and user role used to choose optional controls.
 * @returns A read-only schedule list item with role-aware navigation.
 */
export function TodaysScheduleItem({
  item,
  currentUser,
}: TodaysScheduleItemProps) {
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
            {formatPrimaryCustomerName(item.primaryCustomerName)}
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
