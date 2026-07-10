import { beforeEach, expect, test, vi } from 'vitest';

import {
  ActivityType,
  BookingStatus,
  ScheduleAssignmentRole,
  ScheduleTimeSlot,
  UserRole,
} from '@/generated/prisma/enums';

const mocks = vi.hoisted(() => ({
  createAssignment: vi.fn(),
  createScheduleItem: vi.fn(),
  deleteAssignment: vi.fn(),
  deleteScheduleItem: vi.fn(),
  findAssignmentUnique: vi.fn(),
  findScheduleItems: vi.fn(),
  findScheduleItemUnique: vi.fn(),
  findUserUnique: vi.fn(),
  requireCurrentUser: vi.fn(),
  revalidatePath: vi.fn(),
  transaction: vi.fn(),
  updateAssignment: vi.fn(),
  updateScheduleItem: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    $transaction: mocks.transaction,
    scheduleItem: {
      create: mocks.createScheduleItem,
      delete: mocks.deleteScheduleItem,
      findMany: mocks.findScheduleItems,
      findUnique: mocks.findScheduleItemUnique,
      update: mocks.updateScheduleItem,
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
  addScheduledCourseDay,
  addScheduleAssignment,
  removeScheduledCourseDay,
  removeScheduleAssignment,
  updateScheduleAssignmentRole,
  updateScheduleItemTimeSlot,
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

const instructorUser = {
  ...adminUser,
  id: 'instructor-1',
  role: UserRole.INSTRUCTOR,
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
 * Builds the scheduled day guard shape selected by day management actions.
 *
 * @param overrides - Schedule day fields to override for a scenario.
 * @returns A schedule item with related booking status and assignment count.
 */
function scheduleDayGuard(overrides = {}) {
  return {
    id: 'schedule-2',
    bookingRequestId: 'booking-1',
    bookingActivityId: 'activity-1',
    date: new Date('2026-07-15T00:00:00.000Z'),
    startTime: '08:00',
    timeSlot: ScheduleTimeSlot.AM,
    activityType: ActivityType.OPEN_WATER_COURSE,
    scheduleNotes: 'Pool session',
    bookingRequest: {
      id: 'booking-1',
      status: BookingStatus.SCHEDULED,
    },
    _count: {
      assignments: 0,
    },
    ...overrides,
  };
}

/**
 * Builds a persisted scheduled day sibling used for renumbering tests.
 *
 * @param id - Schedule item ID.
 * @param dayNumber - Persisted day number.
 * @param date - Persisted schedule date.
 * @returns A schedule day sibling row.
 */
function scheduleDaySibling(
  id: string,
  dayNumber: number,
  date = `2026-07-${13 + dayNumber}T00:00:00.000Z`,
) {
  return {
    id,
    date: new Date(date),
    startTime: '08:00',
    timeSlot: ScheduleTimeSlot.AM,
    activityType: ActivityType.OPEN_WATER_COURSE,
    scheduleNotes: `Day ${dayNumber} notes`,
    createdAt: new Date(`2026-07-01T0${dayNumber}:00:00.000Z`),
    dayNumber,
    totalDays: 3,
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
  mocks.createScheduleItem.mockReset();
  mocks.deleteAssignment.mockReset();
  mocks.deleteScheduleItem.mockReset();
  mocks.findAssignmentUnique.mockReset();
  mocks.findScheduleItems.mockReset();
  mocks.findScheduleItemUnique.mockReset();
  mocks.findUserUnique.mockReset();
  mocks.requireCurrentUser.mockReset();
  mocks.revalidatePath.mockReset();
  mocks.transaction.mockReset();
  mocks.updateAssignment.mockReset();
  mocks.updateScheduleItem.mockReset();

  mocks.requireCurrentUser.mockResolvedValue(adminUser);
  mocks.findScheduleItemUnique.mockResolvedValue(scheduleItemGuard());
  mocks.findScheduleItems.mockResolvedValue([
    scheduleDaySibling('schedule-1', 1),
    scheduleDaySibling('schedule-2', 2),
    scheduleDaySibling('schedule-3', 3),
  ]);
  mocks.findUserUnique.mockResolvedValue(assignableUser());
  mocks.findAssignmentUnique.mockResolvedValue(null);
  mocks.createAssignment.mockResolvedValue({ id: 'assignment-1' });
  mocks.createScheduleItem.mockResolvedValue({ id: 'schedule-4' });
  mocks.updateAssignment.mockResolvedValue({ id: 'assignment-1' });
  mocks.updateScheduleItem.mockResolvedValue({ id: 'schedule-1' });
  mocks.deleteAssignment.mockResolvedValue({ id: 'assignment-1' });
  mocks.deleteScheduleItem.mockResolvedValue({ id: 'schedule-2' });
  mocks.transaction.mockImplementation((callback) =>
    callback({
      scheduleItem: {
        create: mocks.createScheduleItem,
        delete: mocks.deleteScheduleItem,
        findMany: mocks.findScheduleItems,
        update: mocks.updateScheduleItem,
      },
    }),
  );
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
    formError: 'Scheduled activity not found. Refresh and try again.',
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
    formError: 'Selected staff member not found. Refresh and try again.',
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
    formError:
      'Only active instructors and divemasters can be assigned to scheduled activities.',
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
    formError:
      'This staff member is already assigned to this scheduled activity.',
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
  'allows %s to update a scheduled item time slot',
  async (currentUser) => {
    mocks.requireCurrentUser.mockResolvedValue(currentUser);
    mocks.findScheduleItemUnique.mockResolvedValue(scheduleDayGuard());

    await expect(
      updateScheduleItemTimeSlot('schedule-2', ScheduleTimeSlot.NIGHT),
    ).resolves.toEqual({ success: true });

    expect(mocks.updateScheduleItem).toHaveBeenCalledWith({
      where: { id: 'schedule-2' },
      data: { timeSlot: ScheduleTimeSlot.NIGHT },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/schedule');
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/bookings/booking-1');
  },
);

test('rejects invalid scheduled item time slots before authorization', async () => {
  await expect(
    updateScheduleItemTimeSlot('schedule-2', 'MORNING'),
  ).resolves.toMatchObject({
    success: false,
    fieldErrors: {
      timeSlot: expect.any(Array),
    },
  });

  expect(mocks.requireCurrentUser).not.toHaveBeenCalled();
  expect(mocks.updateScheduleItem).not.toHaveBeenCalled();
});

test('does not allow customer service to update a scheduled item time slot', async () => {
  mocks.requireCurrentUser.mockResolvedValue(customerServiceUser);

  await expect(
    updateScheduleItemTimeSlot('schedule-2', ScheduleTimeSlot.PM),
  ).resolves.toEqual({
    success: false,
    formError: 'You do not have permission to manage scheduled days.',
  });

  expect(mocks.updateScheduleItem).not.toHaveBeenCalled();
});

test('rejects time slot updates when the scheduled day is missing', async () => {
  mocks.findScheduleItemUnique.mockResolvedValue(null);

  await expect(
    updateScheduleItemTimeSlot('missing-schedule', ScheduleTimeSlot.PM),
  ).resolves.toEqual({
    success: false,
    formError: 'Scheduled day not found. Refresh and try again.',
  });

  expect(mocks.updateScheduleItem).not.toHaveBeenCalled();
});

test('rejects time slot updates when related booking is not scheduled', async () => {
  mocks.findScheduleItemUnique.mockResolvedValue(
    scheduleDayGuard({
      bookingRequest: { id: 'booking-1', status: BookingStatus.CANCELLED },
    }),
  );

  await expect(
    updateScheduleItemTimeSlot('schedule-2', ScheduleTimeSlot.PM),
  ).resolves.toEqual({
    success: false,
    formError: 'Only scheduled bookings can have scheduled days changed.',
  });

  expect(mocks.updateScheduleItem).not.toHaveBeenCalled();
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

test.each([adminUser, managerUser])(
  'allows %s to add a scheduled course day',
  async (currentUser) => {
    mocks.requireCurrentUser.mockResolvedValue(currentUser);
    mocks.findScheduleItemUnique.mockResolvedValue(scheduleDayGuard());

    await expect(addScheduledCourseDay('schedule-2')).resolves.toEqual({
      success: true,
    });

    expect(mocks.findScheduleItems).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          bookingRequestId: 'booking-1',
          bookingActivityId: 'activity-1',
        },
      }),
    );
    expect(mocks.updateScheduleItem).toHaveBeenCalledWith({
      where: { id: 'schedule-1' },
      data: { dayNumber: 1, totalDays: 4 },
    });
    expect(mocks.updateScheduleItem).toHaveBeenCalledWith({
      where: { id: 'schedule-3' },
      data: { dayNumber: 3, totalDays: 4 },
    });
    expect(mocks.createScheduleItem).toHaveBeenCalledWith({
      data: {
        bookingRequestId: 'booking-1',
        bookingActivityId: 'activity-1',
        date: new Date('2026-07-17T00:00:00.000Z'),
        startTime: null,
        timeSlot: ScheduleTimeSlot.AM,
        activityType: ActivityType.OPEN_WATER_COURSE,
        dayNumber: 4,
        totalDays: 4,
        scheduleNotes: 'Day 3 notes',
      },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/schedule');
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/assignments');
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/dashboard');
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/bookings/booking-1');
  },
);

test.each([customerServiceUser, instructorUser])(
  'does not allow %s to add a scheduled course day',
  async (currentUser) => {
    mocks.requireCurrentUser.mockResolvedValue(currentUser);

    await expect(addScheduledCourseDay('schedule-2')).resolves.toEqual({
      success: false,
      formError: 'You do not have permission to manage scheduled days.',
    });

    expect(mocks.createScheduleItem).not.toHaveBeenCalled();
  },
);

test('rejects adding a day when the schedule item is missing', async () => {
  mocks.findScheduleItemUnique.mockResolvedValue(null);

  await expect(addScheduledCourseDay('missing-schedule')).resolves.toEqual({
    success: false,
    formError: 'Scheduled day not found. Refresh and try again.',
  });

  expect(mocks.createScheduleItem).not.toHaveBeenCalled();
});

test('rejects adding a day when related booking is not scheduled', async () => {
  mocks.findScheduleItemUnique.mockResolvedValue(
    scheduleDayGuard({
      bookingRequest: { id: 'booking-1', status: BookingStatus.CANCELLED },
    }),
  );

  await expect(addScheduledCourseDay('schedule-2')).resolves.toEqual({
    success: false,
    formError: 'Only scheduled bookings can have scheduled days changed.',
  });

  expect(mocks.createScheduleItem).not.toHaveBeenCalled();
});

test.each([adminUser, managerUser])(
  'allows %s to remove a scheduled course day',
  async (currentUser) => {
    mocks.requireCurrentUser.mockResolvedValue(currentUser);
    mocks.findScheduleItemUnique.mockResolvedValue(scheduleDayGuard());

    await expect(
      removeScheduledCourseDay('schedule-2', false),
    ).resolves.toEqual({ success: true });

    expect(mocks.deleteScheduleItem).toHaveBeenCalledWith({
      where: { id: 'schedule-2' },
    });
    expect(mocks.updateScheduleItem).toHaveBeenCalledWith({
      where: { id: 'schedule-1' },
      data: { dayNumber: 1, totalDays: 2 },
    });
    expect(mocks.updateScheduleItem).toHaveBeenCalledWith({
      where: { id: 'schedule-3' },
      data: { dayNumber: 2, totalDays: 2 },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/schedule');
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/assignments');
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/dashboard');
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/bookings/booking-1');
  },
);

test.each([customerServiceUser, instructorUser])(
  'does not allow %s to remove a scheduled course day',
  async (currentUser) => {
    mocks.requireCurrentUser.mockResolvedValue(currentUser);

    await expect(
      removeScheduledCourseDay('schedule-2', false),
    ).resolves.toEqual({
      success: false,
      formError: 'You do not have permission to manage scheduled days.',
    });

    expect(mocks.deleteScheduleItem).not.toHaveBeenCalled();
  },
);

test('requires confirmation before removing a scheduled day with assignments', async () => {
  mocks.findScheduleItemUnique.mockResolvedValue(
    scheduleDayGuard({
      _count: {
        assignments: 2,
      },
    }),
  );

  await expect(removeScheduledCourseDay('schedule-2', false)).resolves.toEqual({
    success: false,
    requiresConfirmation: true,
    formError:
      'This scheduled day has assigned staff. Confirm removal to delete this day and its assignments.',
  });

  expect(mocks.deleteScheduleItem).not.toHaveBeenCalled();
});

test('removes an assigned scheduled day after confirmation', async () => {
  mocks.findScheduleItemUnique.mockResolvedValue(
    scheduleDayGuard({
      _count: {
        assignments: 2,
      },
    }),
  );

  await expect(removeScheduledCourseDay('schedule-2', true)).resolves.toEqual({
    success: true,
  });

  expect(mocks.deleteScheduleItem).toHaveBeenCalledWith({
    where: { id: 'schedule-2' },
  });
});

test('rejects removing the only scheduled day for an activity', async () => {
  mocks.findScheduleItemUnique.mockResolvedValue(scheduleDayGuard());
  mocks.findScheduleItems.mockResolvedValue([scheduleDaySibling('schedule-1', 1)]);

  await expect(removeScheduledCourseDay('schedule-1', false)).resolves.toEqual({
    success: false,
    formError: 'A scheduled activity must keep at least one day.',
  });

  expect(mocks.deleteScheduleItem).not.toHaveBeenCalled();
});

test('rejects removing a day when related booking is not scheduled', async () => {
  mocks.findScheduleItemUnique.mockResolvedValue(
    scheduleDayGuard({
      bookingRequest: { id: 'booking-1', status: BookingStatus.CANCELLED },
    }),
  );

  await expect(removeScheduledCourseDay('schedule-2', false)).resolves.toEqual({
    success: false,
    formError: 'Only scheduled bookings can have scheduled days changed.',
  });

  expect(mocks.deleteScheduleItem).not.toHaveBeenCalled();
});
