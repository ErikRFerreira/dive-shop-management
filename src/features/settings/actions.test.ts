import { beforeEach, expect, test, vi } from 'vitest';

import { Prisma } from '@/generated/prisma/client';
import { UserRole } from '@/generated/prisma/enums';

const mocks = vi.hoisted(() => ({
  count: vi.fn(),
  create: vi.fn(),
  findUnique: vi.fn(),
  hashPassword: vi.fn(),
  requireCurrentUser: vi.fn(),
  revalidatePath: vi.fn(),
  transaction: vi.fn(),
  update: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock('@/features/auth/password', () => ({
  hashPassword: mocks.hashPassword,
}));

vi.mock('@/lib/current-user', () => ({
  requireCurrentUser: mocks.requireCurrentUser,
}));

vi.mock('@/lib/db', () => ({
  db: {
    user: {
      create: mocks.create,
    },
    $transaction: mocks.transaction,
  },
}));

import { createStaffUser, updateStaffUser } from './actions';

const admin = {
  id: 'admin-1',
  name: 'Admin User',
  email: 'admin@example.test',
  role: UserRole.ADMIN,
};

const validCreateInput = {
  name: 'Marina Staff',
  email: 'marina@example.test',
  password: 'secure-passphrase',
  role: UserRole.CUSTOMER_SERVICE,
};

const validUpdateInput = {
  userId: 'staff-1',
  name: 'Updated Staff',
  email: 'updated@example.test',
  role: UserRole.INSTRUCTOR,
};

/** Builds a known Prisma request error for duplicate and transaction scenarios. */
function prismaError(code: string) {
  return new Prisma.PrismaClientKnownRequestError('Known request failure', {
    code,
    clientVersion: 'test',
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireCurrentUser.mockResolvedValue(admin);
  mocks.hashPassword.mockResolvedValue('$2b$12$persisted-bcrypt-hash');
  mocks.create.mockResolvedValue({ id: 'created-user' });
  mocks.findUnique.mockResolvedValue({
    id: 'staff-1',
    role: UserRole.MANAGER,
    isActive: true,
  });
  mocks.count.mockResolvedValue(2);
  mocks.update.mockResolvedValue({ id: 'staff-1' });
  mocks.transaction.mockImplementation(
    async (
      callback: (transaction: {
        user: {
          findUnique: typeof mocks.findUnique;
          count: typeof mocks.count;
          update: typeof mocks.update;
        };
      }) => Promise<unknown>,
    ) =>
      callback({
        user: {
          findUnique: mocks.findUnique,
          count: mocks.count,
          update: mocks.update,
        },
      }),
  );
});

test.each([
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.CUSTOMER_SERVICE,
  UserRole.INSTRUCTOR,
])('creates a supported %s account with a normalized email and hash', async (role) => {
  const result = await createStaffUser({
    ...validCreateInput,
    name: '  Marina Staff  ',
    email: '  MARINA@EXAMPLE.TEST ',
    role,
  });

  expect(result).toEqual({ success: true });
  expect(result).not.toHaveProperty('password');
  expect(result).not.toHaveProperty('passwordHash');
  expect(mocks.hashPassword).toHaveBeenCalledWith('secure-passphrase');
  expect(mocks.create).toHaveBeenCalledWith({
    data: {
      name: 'Marina Staff',
      email: 'marina@example.test',
      passwordHash: '$2b$12$persisted-bcrypt-hash',
      role,
      isActive: true,
    },
    select: { id: true },
  });
  expect(mocks.create.mock.calls[0][0].data.passwordHash).not.toBe(
    validCreateInput.password,
  );
  expect(mocks.revalidatePath).toHaveBeenCalledWith('/settings');
});

test('supports explicitly inactive staff creation', async () => {
  await createStaffUser({ ...validCreateInput, isActive: false });

  expect(mocks.create).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({ isActive: false }),
    }),
  );
});

test.each([
  UserRole.MANAGER,
  UserRole.CUSTOMER_SERVICE,
  UserRole.INSTRUCTOR,
  UserRole.DIVEMASTER,
])('denies %s from staff creation without hashing or mutation', async (role) => {
  mocks.requireCurrentUser.mockResolvedValue({ ...admin, id: `${role}-1`, role });

  await expect(createStaffUser(validCreateInput)).resolves.toEqual({
    success: false,
    formError: 'You do not have permission to manage staff users.',
  });
  expect(mocks.hashPassword).not.toHaveBeenCalled();
  expect(mocks.create).not.toHaveBeenCalled();
});

test.each([
  { ...validCreateInput, role: UserRole.DIVEMASTER },
  { ...validCreateInput, role: 'OWNER' },
  { ...validCreateInput, password: 'short' },
  { ...validCreateInput, isActive: 'false' },
])('rejects manipulated or invalid creation input without mutation', async (input) => {
  expect((await createStaffUser(input)).success).toBe(false);
  expect(mocks.hashPassword).not.toHaveBeenCalled();
  expect(mocks.create).not.toHaveBeenCalled();
});

test('returns safe actionable duplicate-email feedback during creation', async () => {
  mocks.create.mockRejectedValue(prismaError('P2002'));

  await expect(createStaffUser(validCreateInput)).resolves.toEqual({
    success: false,
    fieldErrors: {
      email: ['A staff account with this email already exists.'],
    },
  });
});

test.each([
  UserRole.MANAGER,
  UserRole.CUSTOMER_SERVICE,
  UserRole.INSTRUCTOR,
  UserRole.DIVEMASTER,
])('denies %s from staff editing without starting a transaction', async (role) => {
  mocks.requireCurrentUser.mockResolvedValue({ ...admin, id: `${role}-1`, role });

  expect((await updateStaffUser(validUpdateInput)).success).toBe(false);
  expect(mocks.transaction).not.toHaveBeenCalled();
});

test('updates only normalized name, email, and supported role', async () => {
  const result = await updateStaffUser({
    ...validUpdateInput,
    name: '  Updated Staff  ',
    email: '  UPDATED@EXAMPLE.TEST ',
  });

  expect(result).toEqual({ success: true });
  expect(mocks.update).toHaveBeenCalledWith({
    where: { id: 'staff-1' },
    data: {
      name: 'Updated Staff',
      email: 'updated@example.test',
      role: UserRole.INSTRUCTOR,
    },
    select: { id: true },
  });
  expect(mocks.update.mock.calls[0][0].data).not.toHaveProperty('isActive');
  expect(mocks.update.mock.calls[0][0].data).not.toHaveProperty('passwordHash');
  expect(mocks.transaction.mock.calls[0][1]).toEqual({
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  });
  expect(mocks.revalidatePath).toHaveBeenCalledWith('/settings');
  expect(mocks.revalidatePath).toHaveBeenCalledWith('/settings/users/staff-1');
});

test.each([
  { ...validUpdateInput, role: UserRole.DIVEMASTER },
  { ...validUpdateInput, role: 'OWNER' },
  { ...validUpdateInput, isActive: false },
  { ...validUpdateInput, passwordHash: 'manipulated' },
])('rejects manipulated edit input without mutation', async (input) => {
  expect((await updateStaffUser(input)).success).toBe(false);
  expect(mocks.transaction).not.toHaveBeenCalled();
  expect(mocks.update).not.toHaveBeenCalled();
});

test('handles a missing edit target safely', async () => {
  mocks.findUnique.mockResolvedValue(null);

  await expect(updateStaffUser(validUpdateInput)).resolves.toEqual({
    success: false,
    formError: 'Staff user not found. Refresh and try again.',
  });
  expect(mocks.update).not.toHaveBeenCalled();
});

test('returns safe duplicate-email feedback during editing', async () => {
  mocks.update.mockRejectedValue(prismaError('P2002'));

  await expect(updateStaffUser(validUpdateInput)).resolves.toEqual({
    success: false,
    fieldErrors: {
      email: ['A staff account with this email already exists.'],
    },
  });
});

test('prevents another ADMIN from demoting the final active ADMIN', async () => {
  mocks.findUnique.mockResolvedValue({
    id: 'staff-1',
    role: UserRole.ADMIN,
    isActive: true,
  });
  mocks.count.mockResolvedValue(1);

  await expect(updateStaffUser(validUpdateInput)).resolves.toEqual({
    success: false,
    formError:
      'This account is the final active Admin and cannot be assigned another role.',
  });
  expect(mocks.count).toHaveBeenCalledWith({
    where: {
      role: UserRole.ADMIN,
      isActive: true,
    },
  });
  expect(mocks.update).not.toHaveBeenCalled();
});

test('prevents the final active ADMIN from demoting themselves', async () => {
  mocks.findUnique.mockResolvedValue({
    id: admin.id,
    role: UserRole.ADMIN,
    isActive: true,
  });
  mocks.count.mockResolvedValue(1);

  expect(
    (
      await updateStaffUser({
        ...validUpdateInput,
        userId: admin.id,
      })
    ).success,
  ).toBe(false);
  expect(mocks.update).not.toHaveBeenCalled();
});

test('allows an active ADMIN demotion when another active ADMIN exists', async () => {
  mocks.findUnique.mockResolvedValue({
    id: 'staff-1',
    role: UserRole.ADMIN,
    isActive: true,
  });
  mocks.count.mockResolvedValue(2);

  await expect(updateStaffUser(validUpdateInput)).resolves.toEqual({
    success: true,
  });
  expect(mocks.update).toHaveBeenCalledOnce();
});

test('does not count or block demotion of an inactive ADMIN', async () => {
  mocks.findUnique.mockResolvedValue({
    id: 'staff-1',
    role: UserRole.ADMIN,
    isActive: false,
  });

  await expect(updateStaffUser(validUpdateInput)).resolves.toEqual({
    success: true,
  });
  expect(mocks.count).not.toHaveBeenCalled();
  expect(mocks.update).toHaveBeenCalledOnce();
});

test('retries a serializable role update after a Prisma write conflict', async () => {
  mocks.transaction
    .mockRejectedValueOnce(prismaError('P2034'))
    .mockImplementationOnce(async (callback) =>
      callback({
        user: {
          findUnique: mocks.findUnique,
          count: mocks.count,
          update: mocks.update,
        },
      }),
    );

  await expect(updateStaffUser(validUpdateInput)).resolves.toEqual({
    success: true,
  });
  expect(mocks.transaction).toHaveBeenCalledTimes(2);
});
