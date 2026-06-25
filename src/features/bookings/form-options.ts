/**
 * Purpose: This module contains constants and utility functions for booking form options.
 *
 * @module features/bookings/form-options
 *
 */

import {
  ActivityType,
  BookingSource,
  Currency,
  DepositStatus,
  PreferredLanguage,
} from '@/generated/prisma/enums';

export const activityTypeOptions = Object.values(ActivityType);
export const bookingSourceOptions = Object.values(BookingSource);
export const currencyOptions = Object.values(Currency);
export const depositStatusOptions = Object.values(DepositStatus);
export const preferredLanguageOptions = Object.values(PreferredLanguage);

/**
 * Formats a string value to a more human-readable label by capitalizing the first letter of each word and replacing underscores with spaces.
 *
 * @param value - The string value to format.
 * @returns The formatted label or '—' if the value is null or undefined.
 */
export function formatEnumLabel(value: string | null | undefined) {
  if (!value) return '—';

  return value
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
