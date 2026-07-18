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

export const staffUserRoleOptions = [
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.CUSTOMER_SERVICE,
  UserRole.INSTRUCTOR,
  UserRole.DIVEMASTER,
] as const;

