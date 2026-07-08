import { Card, CardHeader, CardTitle } from '@/components/ui/card';

import type { MyScheduleAssignmentBriefing } from '@/features/schedule/types';
import { cn } from '@/lib/utils';
import { getShopDateOnlyKey } from '@/lib/operational-date';
import {
  CalendarDays,
  CalendarClock,
  CalendarRange,
  ArrowRight,
} from 'lucide-react';

type AssignmentSummaryCardsProps = {
  briefing: MyScheduleAssignmentBriefing;
};

type AssignmentSummaryCardProps = {
  detail?: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  accent?: boolean;
};

/**
 * Calculates a relative date label for the next assignment card.
 *
 * @param date - The next assignment date.
 * @returns "tomorrow" if the date is tomorrow, "in X days" otherwise, or "None" if no date provided.
 */
function formatNextAssignmentDate(date: Date | null | undefined): string {
  if (!date) return 'None';

  const today = new Date();
  const todayKey = getShopDateOnlyKey(today);
  const targetKey = getShopDateOnlyKey(date);

  if (todayKey === targetKey) return 'Today';

  // Calculate days difference using UTC midnight dates
  const todayUtc = new Date(todayKey + 'T00:00:00Z');
  const targetUtc = new Date(targetKey + 'T00:00:00Z');
  const daysDiff = Math.round(
    (targetUtc.getTime() - todayUtc.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (daysDiff === 1) return 'Tomorrow';
  if (daysDiff < 1) return 'Today';

  return `In ${daysDiff} days`;
}

/**
 * Renders the compact top summary cards for the personal assignment briefing.
 *
 * @param props - Props for the summary cards, including the briefing data.
 * @returns Four compact operational summary cards.
 */
export function AssignmentSummaryCards({
  briefing,
}: AssignmentSummaryCardsProps) {
  const nextAssignment = briefing.summary.nextAssignment;
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <AssignmentSummaryCard
        label="Today"
        icon={CalendarDays}
        value={String(briefing.summary.todayCount)}
        accent
      />
      <AssignmentSummaryCard
        label="Tomorrow"
        icon={CalendarClock}
        value={String(briefing.summary.tomorrowCount)}
      />
      <AssignmentSummaryCard
        label="Upcoming"
        icon={CalendarRange}
        value={String(briefing.summary.upcomingCount)}
      />
      <NextAssignmentCard
        label={nextAssignment?.activitySummary || 'None scheduled'}
        value={formatNextAssignmentDate(nextAssignment?.date)}
        icon={ArrowRight}
      />
    </div>
  );
}

/**
 * Renders one compact assignment briefing summary card.
 *
 * @param props - Props for the summary card, including label, icon, value, and accent flag.
 * @returns A compact card matching the dashboard visual language.
 */
function AssignmentSummaryCard({
  label,
  icon: Icon,
  value,
  accent = false,
}: AssignmentSummaryCardProps) {
  return (
    <Card className="rounded-2xl border border-border bg-card py-4 px-1 shadow-sm">
      <CardHeader className="flex gap-4 items-center mt-1">
        <span
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-xl ring-1',
            accent
              ? 'bg-primary/10 text-primary ring-primary/20'
              : 'bg-muted text-muted-foreground ring-border',
          )}
        >
          <Icon className="size-5" />
        </span>

        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <CardTitle className="text-2xl font-semibold tracking-tight text-foreground">
            {value}
          </CardTitle>
        </div>
      </CardHeader>
    </Card>
  );
}

/**
 * Renders the next assignment summary card with a distinct visual style.
 *
 * @param param0 - Props for the next assignment card, including label and value.
 * @returns - A compact card highlighting the next assignment, with a primary accent color.
 */
function NextAssignmentCard({ label, value }: AssignmentSummaryCardProps) {
  return (
    <Card className="col-span-2 gap-1 flex flex-col justify-center rounded-2xl border border-primary/20 bg-primary/[0.06] p-4 shadow-sm lg:col-span-1">
      <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
        <ArrowRight className="size-3.5" />
        Next assignment
      </div>
      <CardHeader className="flex gap-4 items-center">
        <div>
          <CardTitle className="truncate text-sm font-semibold text-foreground">
            {label}
          </CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground"> {value}</p>
        </div>
      </CardHeader>
    </Card>
  );
}
