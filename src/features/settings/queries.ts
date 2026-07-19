import 'server-only';

import { Prisma } from '@/generated/prisma/client';
import {
  assertAuthorizedCapability,
  canManageStaffUsers,
} from '@/features/auth/permissions';
import {
  staffUserDefaultPageSize,
  type StaffUserFilters,
  type StaffUserListPagination,
} from '@/features/settings/types';
import { db } from '@/lib/db';
import type { CurrentUser } from '@/lib/current-user';

import { hasAnotherActiveAdmin } from './admin-invariants';

export const staffUserListSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export const staffUserDetailSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export type StaffUserListItem = Prisma.UserGetPayload<{
  select: typeof staffUserListSelect;
}>;

export type StaffUserDetail = Prisma.UserGetPayload<{
  select: typeof staffUserDetailSelect;
}>;

export type PaginatedStaffUserList = {
  staffUsers: StaffUserListItem[];
  pagination: StaffUserListPagination;
};

/**
 * Builds a Prisma predicate from already validated staff-list filters.
 *
 * @param filters - Enum-backed role/status filters and trimmed search text.
 * @returns A safe User predicate, or undefined when no filters are active.
 */
function buildStaffUserWhere(
  filters: StaffUserFilters,
): Prisma.UserWhereInput | undefined {
  const where: Prisma.UserWhereInput = {};

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { email: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  if (filters.role) {
    where.role = filters.role;
  }

  if (filters.status !== 'all') {
    where.isActive = filters.status === 'active';
  }

  return Object.keys(where).length > 0 ? where : undefined;
}

/**
 * Returns one ADMIN-only page of safe staff-user records.
 *
 * Authorization is asserted before both count and list queries. The function
 * accepts only the server-resolved current user and never derives permissions
 * from URL filters or client-submitted roles.
 *
 * @param currentUser - Authenticated database user requesting Staff Settings.
 * @param filters - Validated search, role, status, and page filters.
 * @returns Safe staff rows plus total-count pagination metadata.
 */
export async function getStaffUsers(
  currentUser: CurrentUser,
  filters: StaffUserFilters,
): Promise<PaginatedStaffUserList> {
  assertAuthorizedCapability(canManageStaffUsers(currentUser));

  const where = buildStaffUserWhere(filters);
  const totalCount = await db.user.count({ where });
  const totalPages = Math.ceil(totalCount / staffUserDefaultPageSize);
  const page = totalPages > 0 ? Math.min(filters.page, totalPages) : 1;
  const pagination = {
    totalCount,
    page,
    pageSize: staffUserDefaultPageSize,
    totalPages,
  };

  if (totalCount === 0) {
    return {
      staffUsers: [],
      pagination,
    };
  }

  const staffUsers = await db.user.findMany({
    where,
    select: staffUserListSelect,
    orderBy: [{ isActive: 'desc' }, { name: 'asc' }, { id: 'asc' }],
    skip: (page - 1) * staffUserDefaultPageSize,
    take: staffUserDefaultPageSize,
  });

  return {
    staffUsers,
    pagination,
  };
}

/**
 * Returns one safe staff-user record for the ADMIN-only details page.
 *
 * Authorization is asserted before Prisma receives the requested identifier.
 * Authentication fields and relations are intentionally excluded from the
 * explicit select.
 *
 * @param currentUser - Authenticated database user requesting Staff Settings.
 * @param staffUserId - Persisted staff-user identifier from the dynamic route.
 * @returns The safe staff details, or null when the identifier does not exist.
 */
export async function getStaffUserById(
  currentUser: CurrentUser,
  staffUserId: string,
): Promise<StaffUserDetail | null> {
  assertAuthorizedCapability(canManageStaffUsers(currentUser));

  return db.user.findUnique({
    where: { id: staffUserId },
    select: staffUserDetailSelect,
  });
}

/**
 * Resolves whether a different active ADMIN exists for advisory status UI.
 *
 * The deactivation Server Action repeats this check inside its serializable
 * transaction; this query only supplies an early explanatory disabled state.
 *
 * @param currentUser - Authenticated database user requesting Staff Settings.
 * @param staffUserId - ADMIN account excluded from the backup count.
 * @returns Whether another active ADMIN currently exists.
 */
export async function getHasAnotherActiveAdmin(
  currentUser: CurrentUser,
  staffUserId: string,
): Promise<boolean> {
  assertAuthorizedCapability(canManageStaffUsers(currentUser));

  return hasAnotherActiveAdmin(db.user, staffUserId);
}
