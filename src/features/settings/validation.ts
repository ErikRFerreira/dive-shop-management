import { z } from 'zod';

import { UserRole } from '@/generated/prisma/enums';
import {
  staffUserStatusOptions,
  type StaffUserFilters,
} from '@/features/settings/types';

export type StaffUserSearchParams = Record<
  string,
  string | string[] | undefined
>;

const staffUserSearchParamsSchema = z.object({
  search: z.preprocess(
    (value) => (typeof value === 'string' ? value : ''),
    z.string().trim(),
  ),
  role: z
    .preprocess(
      (value) => (typeof value === 'string' ? value : undefined),
      z.enum(UserRole).optional(),
    )
    .catch(undefined),
  status: z
    .preprocess(
      (value) => (typeof value === 'string' ? value : 'all'),
      z.enum(staffUserStatusOptions),
    )
    .catch('all'),
  page: z
    .preprocess(
      (value) => (typeof value === 'string' ? Number(value) : 1),
      z.number().int().positive(),
    )
    .catch(1),
});

/**
 * Parses untrusted Settings URL parameters into safe staff-list filters.
 *
 * Repeated or unsupported values are ignored so arbitrary client text never
 * reaches Prisma as a role, status, or pagination filter.
 *
 * @param searchParams - Plain App Router search parameters from `/settings`.
 * @returns Normalized staff search, enum-backed filters, and a positive page.
 */
export function parseStaffUserSearchParams(
  searchParams: StaffUserSearchParams,
): StaffUserFilters {
  return staffUserSearchParamsSchema.parse(searchParams);
}

