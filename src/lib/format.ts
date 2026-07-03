import { SHOP_TIME_ZONE } from './operational-date';

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
 * Converts a date into the `YYYY-MM-DD` value used by date inputs and date-only keys.
 *
 * @param value - Date to convert.
 * @returns ISO calendar date text, or `null` when no date is provided.
 */
export function formatDateInputValue(value: Date | null | undefined) {
  return value ? value.toISOString().slice(0, 10) : null;
}
