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
export { formatEnumLabel } from '@/lib/format';

export const activityTypeOptions = Object.values(ActivityType);
export const bookingSourceOptions = Object.values(BookingSource);
export const currencyOptions = Object.values(Currency);
export const depositStatusOptions = Object.values(DepositStatus);
export const preferredLanguageOptions = Object.values(PreferredLanguage);
