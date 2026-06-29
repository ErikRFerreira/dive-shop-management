import type {
  MyScheduleAssignment,
  MyScheduleAssignmentGroup,
  MyScheduleAssignmentGroupKey,
  ScheduleDateGroup,
  ScheduleCalendarEvent,
  SchedulePageItem,
  SerializedScheduleCalendarEvent,
} from '@/features/schedule/types';
import { ActivityType } from '@/generated/prisma/enums';
import { formatDateInputValue, formatEnumLabel } from '@/lib/format';

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
  const todayKey = getScheduleDateKey(baseDate);
  const tomorrowKey = getScheduleDateKey(addUtcDays(baseDate, 1));
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
 * Adds whole UTC days without mutating the source date.
 *
 * @param date - Date to offset.
 * @param days - Number of UTC days to add.
 * @returns A new Date offset by the requested number of days.
 */
function addUtcDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate;
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
  if (activityType === ActivityType.DISCOVER_SCUBA_DIVING) {
    return 'DSD';
  }

  if (activityType === ActivityType.OPEN_WATER_COURSE) {
    return 'Open Water';
  }

  if (activityType === ActivityType.ADVANCED_OPEN_WATER_COURSE) {
    return 'Advanced Open Water';
  }

  return formatEnumLabel(activityType);
}
