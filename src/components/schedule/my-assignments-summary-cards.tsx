import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import type { MyScheduleAssignmentBriefing } from '@/features/schedule/types';
import { formatDisplayDate } from '@/lib/format';
import { cn } from '@/lib/utils';
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
 * Renders the compact top summary cards for the personal assignment briefing.
 *
 * @param props - Briefing payload containing summary counts and next assignment metadata.
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
      <AssignmentSummaryCard
        label="Next assignment"
        icon={ArrowRight}
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
  icon: Icon,
  value,
  accent = false,
}: AssignmentSummaryCardProps) {
  return (
    <Card className="rounded-2xl border border-border bg-card p-2 shadow-sm">
      <CardHeader className="flex gap-2 items-center">
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
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
            {label}
          </p>
          <CardTitle className="text-2xl font-semibold tracking-tight">
            {value}
          </CardTitle>
        </div>
        {detail ? (
          <p className="line-clamp-1 text-sm text-muted-foreground">{detail}</p>
        ) : null}
      </CardHeader>
    </Card>
  );
}
