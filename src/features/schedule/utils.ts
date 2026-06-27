import type {
  ScheduleDateGroup,
  ScheduleCalendarEvent,
  SchedulePageItem,
  SerializedScheduleCalendarEvent,
} from '@/features/schedule/types';
import { formatDateInputValue } from '@/lib/format';

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
