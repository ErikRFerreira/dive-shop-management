import { beforeEach, expect, test, vi } from 'vitest';

import {
  BookingStatus,
  ScheduleAssignmentRole,
  UserRole,
} from '@/generated/prisma/enums';

const mocks = vi.hoisted(() => ({
  createAssignment: vi.fn(),
  deleteAssignment: vi.fn(),
  findAssignmentUnique: vi.fn(),
  findScheduleItemUnique: vi.fn(),
  findUserUnique: vi.fn(),
  requireCurrentUser: vi.fn(),
  revalidatePath: vi.fn(),
  updateAssignment: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    scheduleItem: {
      findUnique: mocks.findScheduleItemUnique,
    },
    scheduleAssignment: {
      create: mocks.createAssignment,
      delete: mocks.deleteAssignment,
      findUnique: mocks.findAssignmentUnique,
      update: mocks.updateAssignment,
    },
    user: {
      findUnique: mocks.findUserUnique,
    },
  },
}));

vi.mock('@/lib/current-user', () => ({
  requireCurrentUser: mocks.requireCurrentUser,
}));

vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }));

import {
  addScheduleAssignment,
  removeScheduleAssignment,
  updateScheduleAssignmentRole,
} from './actions';

const adminUser = {
  id: 'admin-1',
  name: 'Admin User',
  email: 'admin@example.test',
  role: UserRole.ADMIN,
};

const managerUser = {
  ...adminUser,
  id: 'manager-1',
  role: UserRole.MANAGER,
};

const customerServiceUser = {
  ...adminUser,
  id: 'customer-service-1',
  role: UserRole.CUSTOMER_SERVICE,
};

/**
 * Builds the schedule item guard shape selected by assignment actions.
 *
 * @param status - Related booking workflow status.
 * @returns A schedule item with related booking status.
 */
function scheduleItemGuard(status = BookingStatus.SCHEDULED) {
  return {
    id: 'schedule-1',
    bookingRequest: {
      id: 'booking-1',
      status,
    },
  };
}

/**
 * Builds the assignment guard shape selected by update and remove actions.
 *
 * @param status - Related booking workflow status.
 * @returns An assignment with related schedule item and booking status.
 */
function assignmentGuard(status = BookingStatus.SCHEDULED) {
  return {
    id: 'assignment-1',
    scheduleItem: scheduleItemGuard(status),
  };
}

/**
 * Builds the selected user shape checked before creating an assignment.
 *
 * @param overrides - User fields to override for rejection scenarios.
 * @returns A staff user record selected by the action.
 */
function assignableUser(overrides = {}) {
  return {
    id: 'instructor-1',
    role: UserRole.INSTRUCTOR,
    isActive: true,
    ...overrides,
  };
}

beforeEach(() => {
  mocks.createAssignment.mockReset();
  mocks.deleteAssignment.mockReset();
  mocks.findAssignmentUnique.mockReset();
  mocks.findScheduleItemUnique.mockReset();
  mocks.findUserUnique.mockReset();
  mocks.requireCurrentUser.mockReset();
  mocks.revalidatePath.mockReset();
  mocks.updateAssignment.mockReset();

  mocks.requireCurrentUser.mockResolvedValue(adminUser);
  mocks.findScheduleItemUnique.mockResolvedValue(scheduleItemGuard());
  mocks.findUserUnique.mockResolvedValue(assignableUser());
  mocks.findAssignmentUnique.mockResolvedValue(null);
  mocks.createAssignment.mockResolvedValue({ id: 'assignment-1' });
  mocks.updateAssignment.mockResolvedValue({ id: 'assignment-1' });
  mocks.deleteAssignment.mockResolvedValue({ id: 'assignment-1' });
});

test.each([adminUser, managerUser])(
  'allows %s to add a schedule assignment',
  async (currentUser) => {
    mocks.requireCurrentUser.mockResolvedValue(currentUser);

    await expect(
      addScheduleAssignment(
        'schedule-1',
        'instructor-1',
        ScheduleAssignmentRole.LEAD_INSTRUCTOR,
      ),
    ).resolves.toEqual({ success: true });

    expect(mocks.createAssignment).toHaveBeenCalledWith({
      data: {
        scheduleItemId: 'schedule-1',
        userId: 'instructor-1',
        role: ScheduleAssignmentRole.LEAD_INSTRUCTOR,
      },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/schedule');
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/bookings/booking-1');
  },
);

test('does not allow customer service to add a schedule assignment', async () => {
  mocks.requireCurrentUser.mockResolvedValue(customerServiceUser);

  await expect(
    addScheduleAssignment(
      'schedule-1',
      'instructor-1',
      ScheduleAssignmentRole.LEAD_INSTRUCTOR,
    ),
  ).resolves.toEqual({
    success: false,
    formError: 'You do not have permission to manage schedule assignments.',
  });

  expect(mocks.createAssignment).not.toHaveBeenCalled();
});

test('lets requireCurrentUser handle unauthenticated assignment requests', async () => {
  const redirectError = new Error('NEXT_REDIRECT');
  mocks.requireCurrentUser.mockRejectedValue(redirectError);

  await expect(
    addScheduleAssignment(
      'schedule-1',
      'instructor-1',
      ScheduleAssignmentRole.LEAD_INSTRUCTOR,
    ),
  ).rejects.toThrow('NEXT_REDIRECT');
});

test('rejects add assignment when the schedule item is missing', async () => {
  mocks.findScheduleItemUnique.mockResolvedValue(null);

  await expect(
    addScheduleAssignment(
      'missing-schedule',
      'instructor-1',
      ScheduleAssignmentRole.LEAD_INSTRUCTOR,
    ),
  ).resolves.toEqual({
    success: false,
    formError: 'Schedule item not found.',
  });

  expect(mocks.createAssignment).not.toHaveBeenCalled();
});

test('rejects add assignment when the selected user is missing', async () => {
  mocks.findUserUnique.mockResolvedValue(null);

  await expect(
    addScheduleAssignment(
      'schedule-1',
      'missing-user',
      ScheduleAssignmentRole.LEAD_INSTRUCTOR,
    ),
  ).resolves.toEqual({
    success: false,
    formError: 'Selected staff user not found.',
  });

  expect(mocks.createAssignment).not.toHaveBeenCalled();
});

test.each([
  [{ isActive: false }, 'inactive user'],
  [{ role: UserRole.CUSTOMER_SERVICE }, 'customer service user'],
])('rejects add assignment for an %s', async (overrides) => {
  mocks.findUserUnique.mockResolvedValue(assignableUser(overrides));

  await expect(
    addScheduleAssignment(
      'schedule-1',
      'customer-service-1',
      ScheduleAssignmentRole.STAFF,
    ),
  ).resolves.toEqual({
    success: false,
    formError: 'Selected user cannot be assigned to scheduled activities.',
  });

  expect(mocks.createAssignment).not.toHaveBeenCalled();
});

test('rejects invalid assignment roles before mutation', async () => {
  await expect(
    addScheduleAssignment('schedule-1', 'instructor-1', 'CAPTAIN'),
  ).resolves.toMatchObject({
    success: false,
    fieldErrors: {
      role: expect.any(Array),
    },
  });

  expect(mocks.requireCurrentUser).not.toHaveBeenCalled();
  expect(mocks.createAssignment).not.toHaveBeenCalled();
});

test('rejects duplicate staff assignment before create', async () => {
  mocks.findAssignmentUnique.mockResolvedValue({ id: 'assignment-1' });

  await expect(
    addScheduleAssignment(
      'schedule-1',
      'instructor-1',
      ScheduleAssignmentRole.LEAD_INSTRUCTOR,
    ),
  ).resolves.toEqual({
    success: false,
    formError: 'This staff member is already assigned to this schedule item.',
  });

  expect(mocks.createAssignment).not.toHaveBeenCalled();
});

test('rejects add assignment when related booking is not scheduled', async () => {
  mocks.findScheduleItemUnique.mockResolvedValue(
    scheduleItemGuard(BookingStatus.CANCELLED),
  );

  await expect(
    addScheduleAssignment(
      'schedule-1',
      'instructor-1',
      ScheduleAssignmentRole.LEAD_INSTRUCTOR,
    ),
  ).resolves.toEqual({
    success: false,
    formError: 'Only scheduled bookings can have staff assignments changed.',
  });

  expect(mocks.createAssignment).not.toHaveBeenCalled();
});

test.each([adminUser, managerUser])(
  'allows %s to update a schedule assignment role',
  async (currentUser) => {
    mocks.requireCurrentUser.mockResolvedValue(currentUser);
    mocks.findAssignmentUnique.mockResolvedValue(assignmentGuard());

    await expect(
      updateScheduleAssignmentRole(
        'assignment-1',
        ScheduleAssignmentRole.ASSISTANT_INSTRUCTOR,
      ),
    ).resolves.toEqual({ success: true });

    expect(mocks.updateAssignment).toHaveBeenCalledWith({
      where: { id: 'assignment-1' },
      data: { role: ScheduleAssignmentRole.ASSISTANT_INSTRUCTOR },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/schedule');
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/bookings/booking-1');
  },
);

test('does not allow customer service to update a schedule assignment role', async () => {
  mocks.requireCurrentUser.mockResolvedValue(customerServiceUser);

  await expect(
    updateScheduleAssignmentRole(
      'assignment-1',
      ScheduleAssignmentRole.ASSISTANT_INSTRUCTOR,
    ),
  ).resolves.toEqual({
    success: false,
    formError: 'You do not have permission to manage schedule assignments.',
  });

  expect(mocks.updateAssignment).not.toHaveBeenCalled();
});

test('rejects update when assignment is missing', async () => {
  mocks.findAssignmentUnique.mockResolvedValue(null);

  await expect(
    updateScheduleAssignmentRole(
      'missing-assignment',
      ScheduleAssignmentRole.ASSISTANT_INSTRUCTOR,
    ),
  ).resolves.toEqual({
    success: false,
    formError: 'Schedule assignment not found.',
  });

  expect(mocks.updateAssignment).not.toHaveBeenCalled();
});

test('rejects update when related booking is not scheduled', async () => {
  mocks.findAssignmentUnique.mockResolvedValue(
    assignmentGuard(BookingStatus.CANCELLED),
  );

  await expect(
    updateScheduleAssignmentRole(
      'assignment-1',
      ScheduleAssignmentRole.ASSISTANT_INSTRUCTOR,
    ),
  ).resolves.toEqual({
    success: false,
    formError: 'Only scheduled bookings can have staff assignments changed.',
  });

  expect(mocks.updateAssignment).not.toHaveBeenCalled();
});

test.each([adminUser, managerUser])(
  'allows %s to remove a schedule assignment',
  async (currentUser) => {
    mocks.requireCurrentUser.mockResolvedValue(currentUser);
    mocks.findAssignmentUnique.mockResolvedValue(assignmentGuard());

    await expect(removeScheduleAssignment('assignment-1')).resolves.toEqual({
      success: true,
    });

    expect(mocks.deleteAssignment).toHaveBeenCalledWith({
      where: { id: 'assignment-1' },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/schedule');
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/bookings/booking-1');
  },
);

test('does not allow customer service to remove a schedule assignment', async () => {
  mocks.requireCurrentUser.mockResolvedValue(customerServiceUser);

  await expect(removeScheduleAssignment('assignment-1')).resolves.toEqual({
    success: false,
    formError: 'You do not have permission to manage schedule assignments.',
  });

  expect(mocks.deleteAssignment).not.toHaveBeenCalled();
});

test('rejects remove when assignment is missing', async () => {
  mocks.findAssignmentUnique.mockResolvedValue(null);

  await expect(removeScheduleAssignment('missing-assignment')).resolves.toEqual({
    success: false,
    formError: 'Schedule assignment not found.',
  });

  expect(mocks.deleteAssignment).not.toHaveBeenCalled();
});

test('rejects remove when related booking is not scheduled', async () => {
  mocks.findAssignmentUnique.mockResolvedValue(
    assignmentGuard(BookingStatus.CANCELLED),
  );

  await expect(removeScheduleAssignment('assignment-1')).resolves.toEqual({
    success: false,
    formError: 'Only scheduled bookings can have staff assignments changed.',
  });

  expect(mocks.deleteAssignment).not.toHaveBeenCalled();
});
