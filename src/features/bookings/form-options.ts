/** Select options and display labels used by booking intake forms. */

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

export function formatEnumLabel(value: string | null | undefined) {
  if (!value) return '—';

  return value
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
