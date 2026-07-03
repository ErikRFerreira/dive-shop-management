import { SHOP_TIME_ZONE, getShopDateOnlyKey } from './operational-date';

const EMPTY_DISPLAY_VALUE = '\u2014';

const singaporeDateFormatter = new Intl.DateTimeFormat('en-SG', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: SHOP_TIME_ZONE,
});

const singaporeDateTimeFormatter = new Intl.DateTimeFormat('en-SG', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: SHOP_TIME_ZONE,
});

const singaporeTimeFormatter = new Intl.DateTimeFormat('en-SG', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: SHOP_TIME_ZONE,
});

/**
 * Formats an enum-like value for staff-facing display.
 *
 * @param value - Raw enum text such as `OPEN_WATER_COURSE`.
 * @param options - Optional placeholder for missing values.
 * @returns Title-cased label text, or the configured empty value.
 */
export function formatEnumLabel(
  value: string | null | undefined,
  options: { emptyValue?: string | null } = {},
) {
  const emptyValue = options.emptyValue ?? EMPTY_DISPLAY_VALUE;

  if (!value) return emptyValue;

  return value
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Formats a date for the app's Singapore staff-facing display convention.
 *
 * @param value - Date to format.
 * @param options - Optional placeholder for missing values.
 * @returns Localized date text, or the configured empty value.
 */
export function formatDisplayDate(
  value: Date | null | undefined,
  options: { emptyValue?: string } = {},
) {
  return value
    ? singaporeDateFormatter.format(value)
    : (options.emptyValue ?? EMPTY_DISPLAY_VALUE);
}

/**
 * Formats a date and time for the app's Singapore staff-facing display convention.
 *
 * @param value - Date to format.
 * @param options - Optional placeholder for missing values.
 * @returns Localized date-time text, or the configured empty value.
 */
export function formatDisplayDateTime(
  value: Date | null | undefined,
  options: { emptyValue?: string } = {},
) {
  return value
    ? singaporeDateTimeFormatter.format(value)
    : (options.emptyValue ?? EMPTY_DISPLAY_VALUE);
}

/**
 * Formats dashboard activity timestamps into concise relative labels.
 *
 * @param value - Activity timestamp to format.
 * @param options - Optional placeholder and deterministic "now" value.
 * @returns Relative time text such as "12 min ago" or "Yesterday at 14:20".
 */
export function formatRecentActivityTime(
  value: Date | null | undefined,
  options: { emptyValue?: string; now?: Date } = {},
) {
  if (!value) {
    return options.emptyValue ?? EMPTY_DISPLAY_VALUE;
  }

  const now = options.now ?? new Date();
  const diffMs = Math.max(now.getTime() - value.getTime(), 0);
  const minuteMs = 60 * 1000;
  const hourMs = 60 * minuteMs;

  if (diffMs < minuteMs) {
    return 'Just now';
  }

  if (diffMs < hourMs) {
    const minutesAgo = Math.floor(diffMs / minuteMs);
    return `${minutesAgo} min ago`;
  }

  if (isSameShopDay(value, now)) {
    const hoursAgo = Math.floor(diffMs / hourMs);
    const label = hoursAgo === 1 ? 'hour' : 'hours';

    return `${hoursAgo} ${label} ago`;
  }

  const dayDifference = getShopDayDifference(value, now);
  const timeLabel = singaporeTimeFormatter.format(value);

  if (dayDifference === 1) {
    return `Yesterday at ${timeLabel}`;
  }

  return `${dayDifference} days ago at ${timeLabel}`;
}

/**
 * Converts a date into the `YYYY-MM-DD` value used by date inputs and date-only keys.
 *
 * @param value - Date to convert.
 * @returns ISO calendar date text, or `null` when no date is provided.
 */
export function formatDateInputValue(value: Date | null | undefined) {
  return value ? value.toISOString().slice(0, 10) : null;
}

/**
 * Checks whether two instants fall within the same shop-local calendar day.
 *
 * @param left - First instant to compare.
 * @param right - Second instant to compare.
 * @returns True when both values share the same shop day key.
 */
function isSameShopDay(left: Date, right: Date) {
  return getShopDateOnlyKey(left) === getShopDateOnlyKey(right);
}

/**
 * Computes whole shop-local day distance between two instants.
 *
 * @param earlier - Earlier instant.
 * @param later - Later instant.
 * @returns Whole number of calendar days between shop-local day keys.
 */
function getShopDayDifference(earlier: Date, later: Date) {
  const earlierDay = parseDateOnlyKey(getShopDateOnlyKey(earlier));
  const laterDay = parseDateOnlyKey(getShopDateOnlyKey(later));
  const dayMs = 24 * 60 * 60 * 1000;

  return Math.max(
    0,
    Math.round((laterDay.getTime() - earlierDay.getTime()) / dayMs),
  );
}

/**
 * Parses a date-only key to a UTC-midnight date used for day-distance math.
 *
 * @param key - Date key in YYYY-MM-DD format.
 * @returns Date object anchored at UTC midnight for the provided key.
 */
function parseDateOnlyKey(key: string) {
  return new Date(`${key}T00:00:00.000Z`);
}
