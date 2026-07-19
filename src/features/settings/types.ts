import { UserRole } from '@/generated/prisma/enums';

export const staffUserDefaultPageSize = 10;

export const staffUserStatusOptions = [
  'all',
  'active',
  'inactive',
] as const;

export type StaffUserStatusFilter = (typeof staffUserStatusOptions)[number];

export type StaffUserFilters = {
  search: string;
  role?: UserRole;
  status: StaffUserStatusFilter;
  page: number;
};

export type StaffUserListPagination = {
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export const staffLoginRoleOptions = [
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.CUSTOMER_SERVICE,
  UserRole.INSTRUCTOR,
] as const;

export type StaffLoginRole = (typeof staffLoginRoleOptions)[number];

export type StaffLoginRoleMetadata = {
  label: string;
  description: string;
};

export const staffLoginRoleMetadata: Record<
  StaffLoginRole,
  StaffLoginRoleMetadata
> = {
  [UserRole.ADMIN]: {
    label: 'Admin',
    description: 'Full operational and staff-management access.',
  },
  [UserRole.MANAGER]: {
    label: 'Manager',
    description:
      'Full operational access without Settings or staff management.',
  },
  [UserRole.CUSTOMER_SERVICE]: {
    label: 'Customer Service',
    description: 'Booking intake, Customers, and Schedule access.',
  },
  [UserRole.INSTRUCTOR]: {
    label: 'Instructor',
    description: 'Global Schedule and My Assignments access.',
  },
};

/**
 * Determines whether a persisted role represents a supported login account.
 *
 * @param role - Persisted Prisma user role to evaluate.
 * @returns Whether the role can be created or edited as a platform login.
 */
export function isStaffLoginRole(role: UserRole): role is StaffLoginRole {
  return staffLoginRoleOptions.some((loginRole) => loginRole === role);
}

export type StaffUserActionResult =
  | { success: true }
  | {
      success: false;
      fieldErrors?: Record<string, string[]>;
      formError?: string;
    };

export const staffUserRoleOptions = [
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.CUSTOMER_SERVICE,
  UserRole.INSTRUCTOR,
  UserRole.DIVEMASTER,
] as const;
