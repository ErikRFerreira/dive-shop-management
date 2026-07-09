import Link from 'next/link';
import { MapPin, User, Users } from 'lucide-react';

import type { DashboardScheduleItem as DashboardScheduleItemData } from '@/features/dashboard/types';
import { Button } from '@/components/ui/button';

import type { DashboardSectionUser } from './dashboard-operational-helpers';
import { getTodaysScheduleAction } from './dashboard-operational-helpers';

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
  const participantSummary = formatParticipantSummary(item);

  const uniqueCustomerNames =
    item.customers.length > 0
      ? Array.from(
          new Set(item.customers.map((c) => c.name.trim()).filter(Boolean)),
        )
      : item.primaryCustomerName
        ? [item.primaryCustomerName]
        : ['No active participants recorded'];

  const staffNames =
    item.assignedStaffNames.length > 0
      ? item.assignedStaffNames
      : ['Unassigned'];

  return (
    <article className="grid gap-1 rounded-xl border border-border bg-background p-4 transition-colors hover:border-primary/30 md:grid-cols-[5rem_1fr_auto] md:items-start md:px-5">
      <div className="space-y-1">
        <p className="text-base font-semibold tabular-nums text-primary">
          {item.startTime ?? 'TBD'}
        </p>
      </div>

      <div className="space-y-2">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-foreground">
            {[item.activitySummary, item.dayLabel].filter(Boolean).join(' / ')}
          </h3>
          <p className="text-sm text-muted-foreground/90">
            {participantSummary}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {uniqueCustomerNames.map((name) => (
            <span key={name} className="inline-flex items-center gap-1.5">
              <Users className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="text-foreground/90">{name}</span>
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="text-foreground/90">
              {item.hotel ?? 'No hotel'}
            </span>
          </span>
          {staffNames.map((name) => (
            <span key={name} className="inline-flex items-center gap-1.5">
              <User className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="text-foreground/90">{name}</span>
            </span>
          ))}
        </div>
      </div>

      {action ? (
        <div className="self-start md:justify-self-end">
          <Button
            asChild
            size="sm"
            variant="outline"
            className="h-9 rounded-full bg-white px-4"
          >
            <Link href={action.href}>{action.label}</Link>
          </Button>
        </div>
      ) : null}
    </article>
  );
}

/**
 * Builds a compact active participant summary without repeating customer names.
 *
 * @param item - Schedule item with participant counts.
 * @returns A short active participant summary for the activity header.
 */
function formatParticipantSummary(item: DashboardScheduleItemData) {
  const participantCount = item.numberOfPeople ?? item.customers.length;

  if (participantCount <= 0) {
    return 'No active participants recorded';
  }

  const label = participantCount === 1 ? 'participant' : 'participants';

  return `${participantCount} active ${label}`;
}
