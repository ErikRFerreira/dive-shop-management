export const SHOP_TIME_ZONE = 'Asia/Singapore';

export type DateOnlyRange = {
  start: Date;
  end: Date;
};

const shopDateKeyFormatter = new Intl.DateTimeFormat('en-US', {
  day: '2-digit',
  month: '2-digit',
  timeZone: SHOP_TIME_ZONE,
  year: 'numeric',
});

/**
 * Returns the shop's current calendar date as a stable ISO date key.
 *
 * @param date - Instant to translate into the shop's operational timezone.
 * @returns A `YYYY-MM-DD` date key for the shop calendar day.
 */
export function getShopDateOnlyKey(date: Date) {
  const parts = shopDateKeyFormatter.formatToParts(date);
  const year = getDatePart(parts, 'year');
  const month = getDatePart(parts, 'month');
  const day = getDatePart(parts, 'day');

  return `${year}-${month}-${day}`;
}

/**
 * Builds a UTC date-only range for the shop calendar day containing an instant.
 *
 * Schedule dates are stored as date-only database values and are represented in
 * code as UTC-midnight dates. This helper converts the shop-local calendar day
 * into matching UTC-midnight boundaries for Prisma comparisons.
 *
 * @param date - Instant used to determine the shop calendar day.
 * @param dayOffset - Number of shop calendar days to move before building the range.
 * @returns Inclusive start and exclusive end bounds for date-only fields.
 */
export function getShopDateOnlyRange(
  date: Date,
  dayOffset = 0,
): DateOnlyRange {
  const start = addUtcDateOnlyDays(
    parseDateOnlyKey(getShopDateOnlyKey(date)),
    dayOffset,
  );

  return {
    start,
    end: addUtcDateOnlyDays(start, 1),
  };
}

/**
 * Returns today's shop-local date in the app's UTC-midnight date-only format.
 *
 * @param date - Instant used to determine the current shop-local calendar day.
 * @returns UTC-midnight date-only value for today's shop calendar date.
 */
export function getShopTodayDate(date = new Date()) {
  return parseDateOnlyKey(getShopDateOnlyKey(date));
}

/**
 * Checks whether a date-only value is before today's shop-local date.
 *
 * @param date - Requested date-only value to evaluate.
 * @param todayInstant - Instant used to determine today's shop-local date.
 * @returns True when the requested date is before the shop's current date.
 */
export function isPastShopDate(date: Date, todayInstant = new Date()) {
  return startOfUtcDateOnly(date) < getShopTodayDate(todayInstant);
}

/**
 * Validates that a requested date is not in the past for the shop calendar.
 *
 * @param date - Requested date-only value to validate.
 * @param todayInstant - Instant used to determine today's shop-local date.
 * @returns A validation message for past dates, otherwise null.
 */
export function validateNotPastShopDate(
  date: Date,
  todayInstant = new Date(),
) {
  return isPastShopDate(date, todayInstant)
    ? 'Requested date cannot be in the past.'
    : null;
}

/**
 * Adds whole UTC date-only days without depending on the runtime timezone.
 *
 * @param date - Date-only value to offset.
 * @param days - Number of calendar days to add.
 * @returns A new UTC-midnight date-only value.
 */
export function addUtcDateOnlyDays(date: Date, days: number) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days),
  );
}

/**
 * Normalizes a date-like value to UTC midnight for its UTC calendar date.
 *
 * @param date - Source date to normalize.
 * @returns A UTC-midnight date for the same UTC year, month, and day.
 */
export function startOfUtcDateOnly(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

/**
 * Finds the Monday UTC date-only start for the week containing a date.
 *
 * @param date - Date-only value inside the desired week.
 * @returns Monday at UTC midnight for the week containing the date.
 */
export function startOfUtcDateOnlyWeek(date: Date) {
  const normalizedDate = startOfUtcDateOnly(date);
  const daysSinceMonday = (normalizedDate.getUTCDay() + 6) % 7;

  return addUtcDateOnlyDays(normalizedDate, -daysSinceMonday);
}

/**
 * Parses an ISO date key into the UTC-midnight representation used for date-only fields.
 *
 * @param dateKey - Date key in `YYYY-MM-DD` format.
 * @returns A UTC-midnight date for the provided key.
 */
function parseDateOnlyKey(dateKey: string) {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

/**
 * Reads one part from an Intl date formatter result.
 *
 * @param parts - Parts returned by `Intl.DateTimeFormat#formatToParts`.
 * @param type - Date part to retrieve.
 * @returns The part value, or an empty string if Intl omitted it.
 */
function getDatePart(parts: Intl.DateTimeFormatPart[], type: string) {
  return parts.find((part) => part.type === type)?.value ?? '';
}
