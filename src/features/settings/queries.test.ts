import { beforeEach, expect, test, vi } from 'vitest';

import { UserRole } from '@/generated/prisma/enums';

const mocks = vi.hoisted(() => ({
  count: vi.fn(),
  findMany: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('@/lib/db', () => ({
  db: {
    user: {
      count: mocks.count,
      findMany: mocks.findMany,
    },
  },
}));

import { getStaffUsers, staffUserListSelect } from './queries';

const admin = {
  id: 'admin-1',
  name: 'Admin User',
  email: 'admin@example.test',
  role: UserRole.ADMIN,
};

const defaultFilters = {
  search: '',
  role: undefined,
  status: 'all' as const,
  page: 1,
};

beforeEach(() => {
  mocks.count.mockReset();
  mocks.findMany.mockReset();
  mocks.count.mockResolvedValue(1);
  mocks.findMany.mockResolvedValue([]);
});

test('selects only the approved safe user fields', async () => {
  await getStaffUsers(admin, defaultFilters);

  expect(staffUserListSelect).toEqual({
    id: true,
    name: true,
    email: true,
    role: true,
    isActive: true,
    createdAt: true,
    updatedAt: true,
  });
  expect(staffUserListSelect).not.toHaveProperty('passwordHash');
  expect(mocks.findMany).toHaveBeenCalledWith(
    expect.objectContaining({ select: staffUserListSelect }),
  );
});

test('searches staff by name or email case-insensitively', async () => {
  await getStaffUsers(admin, { ...defaultFilters, search: 'Marina' });

  const expectedWhere = {
    OR: [
      { name: { contains: 'Marina', mode: 'insensitive' } },
      { email: { contains: 'Marina', mode: 'insensitive' } },
    ],
  };

  expect(mocks.count).toHaveBeenCalledWith({ where: expectedWhere });
  expect(mocks.findMany).toHaveBeenCalledWith(
    expect.objectContaining({ where: expectedWhere }),
  );
});

test.each(Object.values(UserRole))('filters staff by the %s role', async (role) => {
  await getStaffUsers(admin, { ...defaultFilters, role });

  expect(mocks.findMany).toHaveBeenCalledWith(
    expect.objectContaining({ where: { role } }),
  );
});

test.each([
  ['active', true],
  ['inactive', false],
] as const)('filters %s staff records', async (status, isActive) => {
  await getStaffUsers(admin, { ...defaultFilters, status });

  expect(mocks.findMany).toHaveBeenCalledWith(
    expect.objectContaining({ where: { isActive } }),
  );
});

test('combines search, role, and status filters', async () => {
  await getStaffUsers(admin, {
    search: 'dive',
    role: UserRole.DIVEMASTER,
    status: 'inactive',
    page: 1,
  });

  expect(mocks.findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: {
        OR: [
          { name: { contains: 'dive', mode: 'insensitive' } },
          { email: { contains: 'dive', mode: 'insensitive' } },
        ],
        role: UserRole.DIVEMASTER,
        isActive: false,
      },
    }),
  );
});

test('orders staff deterministically with active users first', async () => {
  await getStaffUsers(admin, defaultFilters);

  expect(mocks.findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }, { id: 'asc' }],
    }),
  );
});

test('returns total count and clamps out-of-range pages', async () => {
  mocks.count.mockResolvedValue(21);

  await expect(
    getStaffUsers(admin, { ...defaultFilters, page: 8 }),
  ).resolves.toMatchObject({
    pagination: {
      totalCount: 21,
      page: 3,
      pageSize: 10,
      totalPages: 3,
    },
  });

  expect(mocks.findMany).toHaveBeenCalledWith(
    expect.objectContaining({ skip: 20, take: 10 }),
  );
});

test('returns an empty first page without running a list query', async () => {
  mocks.count.mockResolvedValue(0);

  await expect(getStaffUsers(admin, defaultFilters)).resolves.toEqual({
    staffUsers: [],
    pagination: {
      totalCount: 0,
      page: 1,
      pageSize: 10,
      totalPages: 0,
    },
  });
  expect(mocks.findMany).not.toHaveBeenCalled();
});

test.each([
  UserRole.MANAGER,
  UserRole.CUSTOMER_SERVICE,
  UserRole.INSTRUCTOR,
  UserRole.DIVEMASTER,
])('rejects %s before querying Prisma', async (role) => {
  await expect(
    getStaffUsers({ ...admin, id: `${role}-1`, role }, defaultFilters),
  ).rejects.toMatchObject({ name: 'AuthorizationError' });

  expect(mocks.count).not.toHaveBeenCalled();
  expect(mocks.findMany).not.toHaveBeenCalled();
});
