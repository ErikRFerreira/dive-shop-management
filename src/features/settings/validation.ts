import { z } from 'zod';

import { UserRole } from '@/generated/prisma/enums';
import {
  staffLoginRoleOptions,
  staffUserStatusOptions,
  type StaffUserFilters,
} from '@/features/settings/types';
import { normalizeEmail } from '@/lib/normalize-email';

const staffNameSchema = z
  .string()
  .trim()
  .min(1, { error: 'Enter the staff member\'s full name.' });

const staffEmailSchema = z
  .string()
  .trim()
  .email({ error: 'Enter a valid email address.' })
  .max(254, { error: 'Enter a valid email address.' })
  .transform(normalizeEmail);

const staffPasswordSchema = z
  .string()
  .min(12, { error: 'Password must be at least 12 characters.' })
  .max(128, { error: 'Password must be 128 characters or fewer.' });

const staffLoginRoleSchema = z.enum(staffLoginRoleOptions, {
  error: 'Select a supported login role.',
});

export const createStaffUserSchema = z.strictObject({
  name: staffNameSchema,
  email: staffEmailSchema,
  password: staffPasswordSchema,
  role: staffLoginRoleSchema,
  isActive: z.boolean({ error: 'Select a valid active status.' }).default(true),
});

export const updateStaffUserSchema = z.strictObject({
  userId: z.string().trim().min(1, { error: 'Staff user ID is required.' }),
  name: staffNameSchema,
  email: staffEmailSchema,
  role: staffLoginRoleSchema,
});

export type CreateStaffUserInput = z.input<typeof createStaffUserSchema>;
export type UpdateStaffUserInput = z.input<typeof updateStaffUserSchema>;

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
