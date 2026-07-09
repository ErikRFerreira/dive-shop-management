import type {
  MyScheduleAssignment,
  MyScheduleAssignmentGroup,
  MyScheduleAssignmentGroupKey,
  ScheduleDateGroup,
  ScheduleCalendarEvent,
  SchedulePageItem,
  SerializedScheduleCalendarEvent,
} from '@/features/schedule/types';
import { getActivityShortLabel } from '@/features/bookings/activity-utils';
import { ActivityType, ScheduleTimeSlot } from '@/generated/prisma/enums';
import { formatDateInputValue, formatDisplayDate } from '@/lib/format';
import { getShopDateOnlyRange } from '@/lib/operational-date';

export type ScheduleEventTitleInput = {
  activityLabel: string;
  customerName: string | null;
  dayLabel?: string | null;
  numberOfPeople: number | null;
  staffPrefix?: string | null;
};

/**
 * Groups already-sorted schedule rows by calendar date for the simple schedule page.
 *
 * @param items - Schedule rows sorted by date and time by the query layer.
 * @returns Date groups in first-seen order, preserving item order inside each group.
 */
export function groupScheduleItemsByDate(
  items: SchedulePageItem[],
): ScheduleDateGroup[] {
  const groups = new Map<string, ScheduleDateGroup>();

  items.forEach((item) => {
    const dateKey = getScheduleDateKey(item.date);
    const group = groups.get(dateKey);

    if (group) {
      group.items.push(item);
      return;
    }

    groups.set(dateKey, {
      dateKey,
      date: item.date,
      items: [item],
    });
  });

  return Array.from(groups.values());
}

/**
 * Groups personal assignment rows into Today, Tomorrow, and Upcoming buckets.
 *
 * @param items - Assignment rows sorted by date and time by the query layer.
 * @param baseDate - Date used as "today" for deterministic tests.
 * @returns Assignment groups in staff-facing bucket order, omitting empty groups.
 */
export function groupMyScheduleAssignmentsByDay(
  items: MyScheduleAssignment[],
  baseDate = new Date(),
): MyScheduleAssignmentGroup[] {
  const todayKey = getScheduleDateKey(getShopDateOnlyRange(baseDate).start);
  const tomorrowKey = getScheduleDateKey(
    getShopDateOnlyRange(baseDate, 1).start,
  );
  const groups = createMyScheduleAssignmentGroups();

  items.forEach((item) => {
    const itemDateKey = getScheduleDateKey(item.date);
    const groupKey = getMyScheduleAssignmentGroupKey(
      itemDateKey,
      todayKey,
      tomorrowKey,
    );

    groups[groupKey].items.push(item);
  });

  return Object.values(groups).filter((group) => group.items.length > 0);
}

/**
 * Converts a schedule date into a stable `YYYY-MM-DD` key.
 *
 * Schedule dates are stored as date-only values. The UTC slice avoids grouping
 * the same database date into different labels because of the runtime timezone.
 *
 * @param date - The schedule item's date-only value.
 * @returns A stable ISO calendar date key.
 */
export function getScheduleDateKey(date: Date) {
  return formatDateInputValue(date) ?? '';
}

/**
 * Formats an operational schedule slot for staff-facing displays.
 *
 * @param slot - Persisted broad schedule slot.
 * @returns The compact label staff use across booking and schedule views.
 */
export function getScheduleTimeSlotLabel(slot: ScheduleTimeSlot) {
  switch (slot) {
    case ScheduleTimeSlot.AM:
      return 'AM';
    case ScheduleTimeSlot.PM:
      return 'PM';
    case ScheduleTimeSlot.NIGHT:
      return 'Night';
    case ScheduleTimeSlot.TBD:
      return 'TBD';
  }
}

/**
 * Returns the operational sort rank for schedule slots.
 *
 * @param slot - Persisted broad schedule slot.
 * @returns Numeric rank for AM, PM, Night, then TBD ordering.
 */
export function getScheduleTimeSlotSortValue(slot: ScheduleTimeSlot) {
  switch (slot) {
    case ScheduleTimeSlot.AM:
      return 1;
    case ScheduleTimeSlot.PM:
      return 2;
    case ScheduleTimeSlot.NIGHT:
      return 3;
    case ScheduleTimeSlot.TBD:
      return 4;
  }
}

/**
 * Formats a date-only schedule value together with its operational slot.
 *
 * @param date - Schedule or requested date.
 * @param slot - Persisted broad schedule slot.
 * @returns Staff-facing date and slot label.
 */
export function formatScheduleDateSlot(date: Date | null, slot: ScheduleTimeSlot) {
  return `${formatDisplayDate(date, { emptyValue: 'TBD' })} / ${getScheduleTimeSlotLabel(slot)}`;
}

/**
 * Creates empty My Assignments buckets in display order.
 *
 * @returns Empty assignment groups keyed by bucket identifier.
 */
function createMyScheduleAssignmentGroups(): Record<
  MyScheduleAssignmentGroupKey,
  MyScheduleAssignmentGroup
> {
  return {
    today: {
      key: 'today',
      label: 'Today',
      items: [],
    },
    tomorrow: {
      key: 'tomorrow',
      label: 'Tomorrow',
      items: [],
    },
    upcoming: {
      key: 'upcoming',
      label: 'Upcoming',
      items: [],
    },
  };
}

/**
 * Resolves the staff-facing assignment bucket for a schedule date key.
 *
 * @param itemDateKey - The assignment schedule date key.
 * @param todayKey - The date key considered "today".
 * @param tomorrowKey - The date key considered "tomorrow".
 * @returns The matching My Assignments group key.
 */
function getMyScheduleAssignmentGroupKey(
  itemDateKey: string,
  todayKey: string,
  tomorrowKey: string,
): MyScheduleAssignmentGroupKey {
  if (itemDateKey === todayKey) {
    return 'today';
  }

  if (itemDateKey === tomorrowKey) {
    return 'tomorrow';
  }

  return 'upcoming';
}

/**
 * Serializes schedule calendar events before passing them to Client Components.
 *
 * @param events - Calendar events prepared by the schedule query layer.
 * @returns Calendar events with all Date fields converted to ISO strings.
 */
export function serializeScheduleCalendarEvents(
  events: ScheduleCalendarEvent[],
): SerializedScheduleCalendarEvent[] {
  return events.map((event) => ({
    ...event,
    date: event.date.toISOString(),
    activities: event.activities.map((activity) => ({
      ...activity,
      requestedDate: activity.requestedDate?.toISOString() ?? null,
    })),
  }));
}

/**
 * Formats activity types for compact schedule display.
 *
 * @param activityType - Activity enum value stored on a schedule or booking activity.
 * @returns A short staff-facing label for schedule filters and calendar titles.
 */
export function formatScheduleActivityLabel(activityType: ActivityType) {
  return getActivityShortLabel({ activityType });
}

/**
 * Formats persisted course-day metadata for schedule rows.
 *
 * Single-day activities omit the label so dense schedule UIs do not repeat
 * redundant "Day 1/1" copy, while multi-day courses show a stable Day N/M label.
 *
 * @param dayNumber - One-based persisted day number for this schedule item.
 * @param totalDays - Persisted total day count for the scheduled activity.
 * @returns A compact day label for multi-day rows, or null for single-day rows.
 */
export function formatScheduleDayLabel(
  dayNumber: number | null,
  totalDays: number,
) {
  return formatCourseDayLabel(dayNumber, totalDays);
}

/**
 * Formats course-day metadata for schedule titles and detail fields.
 *
 * @param dayNumber - One-based persisted day number for this schedule item.
 * @param totalDays - Persisted total day count for the scheduled activity.
 * @returns `Day N/M` for multi-day courses, or null for single-day activities.
 */
export function formatCourseDayLabel(
  dayNumber: number | null,
  totalDays: number,
) {
  if (totalDays <= 1) {
    return null;
  }

  return `Day ${dayNumber ?? 1}/${totalDays}`;
}

/**
 * Builds one operational schedule title shared by calendar, dashboard, lists,
 * and assignment surfaces.
 *
 * @param input - Activity, active participant count, customer, optional staff,
 * and optional course-day metadata for the schedule item.
 * @returns A compact label such as `Open Water x1 Sarah (Day 1/3)`.
 */
export function buildScheduleEventTitle(input: ScheduleEventTitleInput) {
  const title = [
    input.staffPrefix,
    input.activityLabel,
    formatScheduleParticipantCount(input.numberOfPeople),
    input.customerName ?? 'Customer TBD',
  ]
    .filter((part): part is string => Boolean(part))
    .join(' ');

  return input.dayLabel ? `${title} (${input.dayLabel})` : title;
}

/**
 * Formats active participant count for compact operational schedule titles.
 *
 * @param numberOfPeople - Active participant count derived from booking/customer rows.
 * @returns A compact `xN` count or `xTBD` when no count is available.
 */
function formatScheduleParticipantCount(numberOfPeople: number | null) {
  return `x${numberOfPeople ?? 'TBD'}`;
}
