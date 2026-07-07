import { beforeEach, expect, test, vi } from 'vitest';

import {
  ActivityType,
  BookingCustomerRole,
  BookingSource,
  BookingStatus,
  DepositStatus,
  UserRole,
} from '@/generated/prisma/enums';
import { bookingFormDefaultValues } from './form-values';

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn(),
  requireCurrentUser: vi.fn(),
  transactionRunner: vi.fn(),
  transaction: {
    bookingRequest: { create: vi.fn(), updateMany: vi.fn() },
    scheduleItem: { findUnique: vi.fn(), create: vi.fn(), deleteMany: vi.fn() },
    bookingActivity: { deleteMany: vi.fn(), createMany: vi.fn() },
    customer: { update: vi.fn(), create: vi.fn() },
    bookingCustomer: { deleteMany: vi.fn(), createMany: vi.fn() },
    deposit: { update: vi.fn(), create: vi.fn(), delete: vi.fn() },
  },
  findManyCustomers: vi.fn(),
  updateMany: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    $transaction: mocks.transactionRunner,
    bookingRequest: {
      findUnique: mocks.findUnique,
      updateMany: mocks.updateMany,
    },
    customer: {
      findMany: mocks.findManyCustomers,
    },
  },
}));

vi.mock('@/lib/current-user', () => ({
  requireCurrentUser: mocks.requireCurrentUser,
}));

vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }));

vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));

import {
  cancelBooking,
  approveBooking,
  createBookingDraft,
  markBookingNeedsMoreInfo,
  resubmitEditedBookingForApproval,
  resubmitBookingForApproval,
  submitBookingForApproval,
  submitEditedBookingForApproval,
  updateBooking,
} from './actions';

const initialBookingWorkflowActionState = {};

function formData(values: Record<string, string>) {
  const data = new FormData();

  Object.entries(values).forEach(([key, value]) => data.set(key, value));

  return data;
}

function validSubmitValues(overrides = {}) {
  return {
    ...bookingFormDefaultValues,
    rawBookingText: 'Customer wants to book a course.',
    activities: [
      {
        ...bookingFormDefaultValues.activities[0],
        activityType: ActivityType.OPEN_WATER_COURSE,
        requestedDate: '2026-07-14',
      },
    ],
    numberOfPeople: '1',
    source: BookingSource.EMAIL,
    customers: [
      {
        ...bookingFormDefaultValues.customers[0],
        role: BookingCustomerRole.PRIMARY_CONTACT,
        customerName: 'Maria Santos',
        email: 'maria@example.com',
      },
    ],
    ...overrides,
  };
}

function persistedSubmittableBooking(overrides = {}) {
  return {
    id: 'booking-1',
    status: BookingStatus.NEEDS_MORE_INFO,
    createdById: 'customer-service-1',
    activityType: null,
    specialtyCourse: null,
    requestedDate: null,
    requestedTime: null,
    numberOfPeople: 1,
    source: BookingSource.EMAIL,
    referrerName: null,
    notes: 'Stored customer request',
    internalNotes: null,
    needsMoreInfoReason: 'Confirm the diver certification.',
    activities: [
      {
        activityType: ActivityType.OPEN_WATER_COURSE,
        specialtyCourse: null,
        requestedDate: new Date('2026-07-14T00:00:00.000Z'),
        requestedTime: null,
        notes: null,
      },
    ],
    customers: [
      {
        customerId: 'customer-1',
        role: BookingCustomerRole.PRIMARY_CONTACT,
        hotelAtBooking: null,
        equipmentNeeded: null,
        notes: null,
        certificationAgency: null,
        certificationLevel: null,
        lastDiveAt: null,
        heightCm: null,
        weightKg: null,
        shoeSize: null,
        divesLogged: null,
        customer: {
          fullName: 'Maria Santos',
          chineseName: null,
          weChatId: null,
          whatsAppNumber: null,
          email: 'maria@example.com',
          phone: null,
          preferredLanguage: null,
        },
      },
    ],
    deposits: [],
    ...overrides,
  };
}

function pendingApprovableBooking(overrides = {}) {
  return {
    id: 'booking-1',
    status: BookingStatus.PENDING_APPROVAL,
    requestedDate: new Date('2026-07-14T00:00:00.000Z'),
    requestedTime: '09:00',
    activityType: ActivityType.OPEN_WATER_COURSE,
    internalNotes: 'Customer prefers a morning slot.',
    scheduleItem: null,
    ...overrides,
  };
}

function scheduledBooking(overrides = {}) {
  return {
    id: 'booking-1',
    status: BookingStatus.SCHEDULED,
    adminNotes: 'Approved for the morning schedule.',
    scheduleItem: { id: 'schedule-1' },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.redirect.mockImplementation((url: string) => {
    throw new Error(`redirect:${url}`);
  });
  mocks.updateMany.mockResolvedValue({ count: 1 });
  mocks.findManyCustomers.mockImplementation(
    async ({ where }: { where?: { id?: { in?: string[] } } }) =>
      (where?.id?.in ?? []).map((id) => ({ id })),
  );
  mocks.transactionRunner.mockImplementation(
    async (callback: (transaction: typeof mocks.transaction) => unknown) =>
      callback(mocks.transaction),
  );
  mocks.transaction.bookingRequest.create.mockResolvedValue({ id: 'booking-1' });
  mocks.transaction.bookingRequest.updateMany.mockResolvedValue({ count: 1 });
  mocks.transaction.scheduleItem.findUnique.mockResolvedValue(null);
  mocks.transaction.scheduleItem.create.mockResolvedValue({ id: 'schedule-1' });
  mocks.transaction.scheduleItem.deleteMany.mockResolvedValue({ count: 1 });
  mocks.transaction.bookingActivity.deleteMany.mockResolvedValue({ count: 1 });
  mocks.transaction.bookingActivity.createMany.mockResolvedValue({ count: 1 });
  mocks.transaction.customer.update.mockResolvedValue({ id: 'customer-1' });
  mocks.transaction.customer.create.mockResolvedValue({ id: 'customer-new' });
  mocks.transaction.bookingCustomer.deleteMany.mockResolvedValue({ count: 1 });
  mocks.transaction.bookingCustomer.createMany.mockResolvedValue({ count: 1 });
  mocks.transaction.deposit.update.mockResolvedValue({ id: 'deposit-1' });
  mocks.transaction.deposit.create.mockResolvedValue({ id: 'deposit-new' });
  mocks.transaction.deposit.delete.mockResolvedValue({ id: 'deposit-1' });
});

test('marks a pending booking as Needs More Info with a trimmed reason', async () => {
  mocks.requireCurrentUser.mockResolvedValue({
    id: 'admin-1',
    role: UserRole.ADMIN,
  });
  mocks.findUnique.mockResolvedValue({
    id: 'booking-1',
    status: BookingStatus.PENDING_APPROVAL,
  });

  await expect(
    markBookingNeedsMoreInfo(
      initialBookingWorkflowActionState,
      formData({
        bookingId: 'booking-1',
        needsMoreInfoReason: ' Confirm the diver certification. ',
      }),
    ),
  ).rejects.toThrow('redirect:/bookings/booking-1');

  expect(mocks.updateMany).toHaveBeenCalledWith({
    where: {
      id: 'booking-1',
      status: BookingStatus.PENDING_APPROVAL,
    },
    data: {
      status: BookingStatus.NEEDS_MORE_INFO,
      needsMoreInfoReason: 'Confirm the diver certification.',
    },
  });
  expect(mocks.revalidatePath).toHaveBeenCalledWith('/bookings');
});

test('rejects an empty Needs More Info reason before loading a booking', async () => {
  const result = await markBookingNeedsMoreInfo(
    initialBookingWorkflowActionState,
    formData({ bookingId: 'booking-1', needsMoreInfoReason: '   ' }),
  );

  expect(result.fieldErrors?.needsMoreInfoReason).toEqual([
    'A reason is required when requesting more information.',
  ]);
  expect(mocks.findUnique).not.toHaveBeenCalled();
});

test('does not allow a Customer Service user to mark a booking as Needs More Info', async () => {
  mocks.requireCurrentUser.mockResolvedValue({
    id: 'customer-service-1',
    role: UserRole.CUSTOMER_SERVICE,
  });

  await expect(
    markBookingNeedsMoreInfo(
      initialBookingWorkflowActionState,
      formData({ bookingId: 'booking-1', needsMoreInfoReason: 'Need more detail.' }),
    ),
  ).resolves.toEqual({
    formError: 'You do not have permission to request more information.',
  });
  expect(mocks.findUnique).not.toHaveBeenCalled();
});

test.each([UserRole.ADMIN, UserRole.MANAGER] as const)(
  'allows %s to approve a pending booking and create a schedule item',
  async (role) => {
    mocks.requireCurrentUser.mockResolvedValue({
      id: `${role.toLowerCase()}-1`,
      role,
    });
    mocks.findUnique.mockResolvedValue(pendingApprovableBooking());

    await expect(
      approveBooking(
        initialBookingWorkflowActionState,
        formData({
          bookingId: 'booking-1',
          adminNotes: ' Approved for the morning schedule. ',
        }),
      ),
    ).rejects.toThrow('redirect:/bookings/booking-1');

    expect(mocks.transaction.scheduleItem.findUnique).toHaveBeenCalledWith({
      where: {
        bookingRequestId: 'booking-1',
      },
      select: {
        id: true,
      },
    });
    expect(mocks.transaction.bookingRequest.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'booking-1',
        status: BookingStatus.PENDING_APPROVAL,
      },
      data: {
        status: BookingStatus.SCHEDULED,
        adminNotes: 'Approved for the morning schedule.',
      },
    });
    expect(mocks.transaction.scheduleItem.create).toHaveBeenCalledWith({
      data: {
        bookingRequestId: 'booking-1',
        date: new Date('2026-07-14T00:00:00.000Z'),
        startTime: '09:00',
        activityType: ActivityType.OPEN_WATER_COURSE,
        scheduleNotes: 'Approved for the morning schedule.',
      },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/bookings');
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/bookings/booking-1');
    expect(mocks.revalidatePath).toHaveBeenCalledWith(
      '/bookings/booking-1/review',
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith(
      '/bookings/booking-1/edit',
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/schedule');
  },
);

test('does not allow a Customer Service user to approve a booking', async () => {
  mocks.requireCurrentUser.mockResolvedValue({
    id: 'customer-service-1',
    role: UserRole.CUSTOMER_SERVICE,
  });

  await expect(
    approveBooking(
      initialBookingWorkflowActionState,
      formData({ bookingId: 'booking-1' }),
    ),
  ).resolves.toEqual({
    formError: 'You do not have permission to approve this booking.',
  });
  expect(mocks.findUnique).not.toHaveBeenCalled();
  expect(mocks.transactionRunner).not.toHaveBeenCalled();
});

test('uses existing internal notes for schedule notes when admin notes are blank', async () => {
  mocks.requireCurrentUser.mockResolvedValue({
    id: 'admin-1',
    role: UserRole.ADMIN,
  });
  mocks.findUnique.mockResolvedValue(pendingApprovableBooking());

  await expect(
    approveBooking(
      initialBookingWorkflowActionState,
      formData({ bookingId: 'booking-1', adminNotes: '   ' }),
    ),
  ).rejects.toThrow('redirect:/bookings/booking-1');

  expect(mocks.transaction.bookingRequest.updateMany).toHaveBeenCalledWith(
    expect.objectContaining({
      data: {
        status: BookingStatus.SCHEDULED,
        adminNotes: null,
      },
    }),
  );
  expect(mocks.transaction.scheduleItem.create).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        scheduleNotes: 'Customer prefers a morning slot.',
      }),
    }),
  );
});

test.each([
  BookingStatus.DRAFT,
  BookingStatus.NEEDS_MORE_INFO,
  BookingStatus.CANCELLED,
  BookingStatus.SCHEDULED,
] as const)('does not approve a %s booking', async (status) => {
  mocks.requireCurrentUser.mockResolvedValue({
    id: 'admin-1',
    role: UserRole.ADMIN,
  });
  mocks.findUnique.mockResolvedValue(
    pendingApprovableBooking({
      status,
    }),
  );

  await expect(
    approveBooking(
      initialBookingWorkflowActionState,
      formData({ bookingId: 'booking-1' }),
    ),
  ).resolves.toEqual({
    formError: 'Only pending approval bookings can be approved.',
  });
  expect(mocks.transactionRunner).not.toHaveBeenCalled();
});

test('does not approve a booking that already has a schedule item', async () => {
  mocks.requireCurrentUser.mockResolvedValue({
    id: 'admin-1',
    role: UserRole.ADMIN,
  });
  mocks.findUnique.mockResolvedValue(
    pendingApprovableBooking({
      scheduleItem: { id: 'schedule-1' },
    }),
  );

  await expect(
    approveBooking(
      initialBookingWorkflowActionState,
      formData({ bookingId: 'booking-1' }),
    ),
  ).resolves.toEqual({
    formError: 'This booking already has a schedule item.',
  });
  expect(mocks.transactionRunner).not.toHaveBeenCalled();
});

test('does not create a duplicate schedule item if one appears inside the transaction', async () => {
  mocks.requireCurrentUser.mockResolvedValue({
    id: 'admin-1',
    role: UserRole.ADMIN,
  });
  mocks.findUnique.mockResolvedValue(pendingApprovableBooking());
  mocks.transaction.scheduleItem.findUnique.mockResolvedValue({
    id: 'schedule-1',
  });

  await expect(
    approveBooking(
      initialBookingWorkflowActionState,
      formData({ bookingId: 'booking-1' }),
    ),
  ).resolves.toEqual({
    formError: 'This booking already has a schedule item.',
  });
  expect(mocks.transaction.bookingRequest.updateMany).not.toHaveBeenCalled();
  expect(mocks.transaction.scheduleItem.create).not.toHaveBeenCalled();
});

test('does not create a schedule item when the approval update is stale', async () => {
  mocks.requireCurrentUser.mockResolvedValue({
    id: 'admin-1',
    role: UserRole.ADMIN,
  });
  mocks.findUnique.mockResolvedValue(pendingApprovableBooking());
  mocks.transaction.bookingRequest.updateMany.mockResolvedValue({ count: 0 });

  await expect(
    approveBooking(
      initialBookingWorkflowActionState,
      formData({ bookingId: 'booking-1' }),
    ),
  ).resolves.toEqual({
    formError: 'This booking was updated by another user. Refresh and try again.',
  });
  expect(mocks.transaction.scheduleItem.create).not.toHaveBeenCalled();
});

test.each([
  ['requestedDate', null, 'Requested date is required before approving a booking.'],
  ['activityType', null, 'Activity type is required before approving a booking.'],
] as const)(
  'requires %s before approving a booking',
  async (field, value, expectedError) => {
    mocks.requireCurrentUser.mockResolvedValue({
      id: 'admin-1',
      role: UserRole.ADMIN,
    });
    mocks.findUnique.mockResolvedValue(
      pendingApprovableBooking({
        [field]: value,
      }),
    );

    await expect(
      approveBooking(
        initialBookingWorkflowActionState,
        formData({ bookingId: 'booking-1' }),
      ),
    ).resolves.toEqual({
      formError: expectedError,
    });
    expect(mocks.transactionRunner).not.toHaveBeenCalled();
  },
);

test.each([
  [UserRole.ADMIN, BookingStatus.PENDING_APPROVAL],
  [UserRole.ADMIN, BookingStatus.NEEDS_MORE_INFO],
  [UserRole.MANAGER, BookingStatus.PENDING_APPROVAL],
] as const)('allows %s to cancel a %s booking', async (role, status) => {
  mocks.requireCurrentUser.mockResolvedValue({
    id: `${role.toLowerCase()}-1`,
    role,
  });
  mocks.findUnique.mockResolvedValue({
    id: 'booking-1',
    status,
  });

  await expect(
    cancelBooking(
      initialBookingWorkflowActionState,
      formData({ bookingId: 'booking-1' }),
    ),
  ).rejects.toThrow('redirect:/bookings/booking-1');

  expect(mocks.updateMany).toHaveBeenCalledWith({
    where: {
      id: 'booking-1',
      status,
    },
    data: {
      status: BookingStatus.CANCELLED,
    },
  });
  expect(mocks.revalidatePath).toHaveBeenCalledWith('/bookings');
  expect(mocks.revalidatePath).toHaveBeenCalledWith('/bookings/booking-1');
  expect(mocks.revalidatePath).toHaveBeenCalledWith('/bookings/booking-1/review');
  expect(mocks.revalidatePath).toHaveBeenCalledWith('/bookings/booking-1/edit');
  expect(mocks.revalidatePath).toHaveBeenCalledWith('/schedule');
  expect(mocks.transactionRunner).not.toHaveBeenCalled();
  expect(mocks.transaction.bookingActivity.deleteMany).not.toHaveBeenCalled();
  expect(mocks.transaction.bookingCustomer.deleteMany).not.toHaveBeenCalled();
  expect(mocks.transaction.deposit.delete).not.toHaveBeenCalled();
  expect(mocks.transaction.scheduleItem.deleteMany).not.toHaveBeenCalled();
});

test('stores trimmed admin notes when cancelling a pending booking', async () => {
  mocks.requireCurrentUser.mockResolvedValue({
    id: 'admin-1',
    role: UserRole.ADMIN,
  });
  mocks.findUnique.mockResolvedValue({
    id: 'booking-1',
    status: BookingStatus.PENDING_APPROVAL,
  });

  await expect(
    cancelBooking(
      initialBookingWorkflowActionState,
      formData({
        bookingId: 'booking-1',
        adminNotes: ' Duplicate request. ',
      }),
    ),
  ).rejects.toThrow('redirect:/bookings/booking-1');

  expect(mocks.updateMany).toHaveBeenCalledWith({
    where: {
      id: 'booking-1',
      status: BookingStatus.PENDING_APPROVAL,
    },
    data: {
      status: BookingStatus.CANCELLED,
      adminNotes: 'Duplicate request.',
    },
  });
});

test.each([UserRole.ADMIN, UserRole.MANAGER] as const)(
  'allows %s to cancel a scheduled booking while preserving schedule history',
  async (role) => {
    mocks.requireCurrentUser.mockResolvedValue({
      id: `${role.toLowerCase()}-1`,
      role,
    });
    mocks.findUnique.mockResolvedValue(scheduledBooking());

    await expect(
      cancelBooking(
        initialBookingWorkflowActionState,
        formData({
          bookingId: 'booking-1',
          adminNotes: ' Customer cancelled after scheduling. ',
        }),
      ),
    ).rejects.toThrow('redirect:/bookings/booking-1');

    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'booking-1',
        status: BookingStatus.SCHEDULED,
      },
      data: {
        status: BookingStatus.CANCELLED,
        adminNotes: 'Customer cancelled after scheduling.',
      },
    });
    expect(mocks.transactionRunner).not.toHaveBeenCalled();
    expect(mocks.transaction.scheduleItem.deleteMany).not.toHaveBeenCalled();
    expect(mocks.transaction.bookingActivity.deleteMany).not.toHaveBeenCalled();
    expect(mocks.transaction.bookingCustomer.deleteMany).not.toHaveBeenCalled();
    expect(mocks.transaction.deposit.delete).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/bookings');
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/bookings/booking-1');
    expect(mocks.revalidatePath).toHaveBeenCalledWith(
      '/bookings/booking-1/review',
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith(
      '/bookings/booking-1/edit',
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/schedule');
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/assignments');
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/dashboard');
  },
);

test('preserves existing admin notes when cancelling a scheduled booking without new notes', async () => {
  mocks.requireCurrentUser.mockResolvedValue({
    id: 'admin-1',
    role: UserRole.ADMIN,
  });
  mocks.findUnique.mockResolvedValue(scheduledBooking());

  await expect(
    cancelBooking(
      initialBookingWorkflowActionState,
      formData({ bookingId: 'booking-1', adminNotes: '   ' }),
    ),
  ).rejects.toThrow('redirect:/bookings/booking-1');

  expect(mocks.updateMany).toHaveBeenCalledWith(
    expect.objectContaining({
      data: {
        status: BookingStatus.CANCELLED,
      },
    }),
  );
});

test('does not allow a Customer Service user to cancel a booking', async () => {
  mocks.requireCurrentUser.mockResolvedValue({
    id: 'customer-service-1',
    role: UserRole.CUSTOMER_SERVICE,
  });

  await expect(
    cancelBooking(
      initialBookingWorkflowActionState,
      formData({ bookingId: 'booking-1' }),
    ),
  ).resolves.toEqual({
    formError: 'You do not have permission to cancel this booking.',
  });
  expect(mocks.findUnique).not.toHaveBeenCalled();
  expect(mocks.updateMany).not.toHaveBeenCalled();
});

test.each([
  BookingStatus.DRAFT,
  BookingStatus.CANCELLED,
] as const)('does not cancel a %s booking', async (status) => {
  mocks.requireCurrentUser.mockResolvedValue({
    id: 'admin-1',
    role: UserRole.ADMIN,
  });
  mocks.findUnique.mockResolvedValue({
    id: 'booking-1',
    status,
  });

  await expect(
    cancelBooking(
      initialBookingWorkflowActionState,
      formData({ bookingId: 'booking-1' }),
    ),
  ).resolves.toEqual({
    formError:
      'Only pending approval, needs more info, or scheduled bookings can be cancelled.',
  });
  expect(mocks.updateMany).not.toHaveBeenCalled();
});

test('returns a recoverable error when a cancellation update is stale', async () => {
  mocks.requireCurrentUser.mockResolvedValue({
    id: 'admin-1',
    role: UserRole.ADMIN,
  });
  mocks.findUnique.mockResolvedValue({
    id: 'booking-1',
    status: BookingStatus.PENDING_APPROVAL,
  });
  mocks.updateMany.mockResolvedValue({ count: 0 });

  await expect(
    cancelBooking(
      initialBookingWorkflowActionState,
      formData({ bookingId: 'booking-1' }),
    ),
  ).resolves.toEqual({
    formError: 'This booking was updated by another user. Refresh and try again.',
  });
});

test('allows the owner to resubmit while preserving the stored reason', async () => {
  mocks.requireCurrentUser.mockResolvedValue({
    id: 'customer-service-1',
    role: UserRole.CUSTOMER_SERVICE,
  });
  mocks.findUnique.mockResolvedValue(persistedSubmittableBooking());

  await expect(
    resubmitBookingForApproval(
      initialBookingWorkflowActionState,
      formData({ bookingId: 'booking-1' }),
    ),
  ).rejects.toThrow('redirect:/bookings/booking-1');

  expect(mocks.updateMany).toHaveBeenCalledWith({
    where: {
      id: 'booking-1',
      status: BookingStatus.NEEDS_MORE_INFO,
    },
    data: {
      status: BookingStatus.PENDING_APPROVAL,
    },
  });
});

test('blocks standalone resubmit when the stored booking is missing submit details', async () => {
  mocks.requireCurrentUser.mockResolvedValue({
    id: 'customer-service-1',
    role: UserRole.CUSTOMER_SERVICE,
  });
  mocks.findUnique.mockResolvedValue(
    persistedSubmittableBooking({
      activities: [],
      numberOfPeople: null,
      source: null,
      customers: [],
    }),
  );

  const result = await resubmitBookingForApproval(
    initialBookingWorkflowActionState,
    formData({ bookingId: 'booking-1' }),
  );

  expect(result.formError).toBe(
    'Booking is missing required information before resubmission.',
  );
  expect(result.fieldErrors?.customers).toContain(
    'Add at least one customer or diver before submitting.',
  );
  expect(mocks.updateMany).not.toHaveBeenCalled();
});

test('does not remove a schedule item when a scheduled cancellation update is stale', async () => {
  mocks.requireCurrentUser.mockResolvedValue({
    id: 'admin-1',
    role: UserRole.ADMIN,
  });
  mocks.findUnique.mockResolvedValue(scheduledBooking());
  mocks.updateMany.mockResolvedValue({ count: 0 });

  await expect(
    cancelBooking(
      initialBookingWorkflowActionState,
      formData({ bookingId: 'booking-1' }),
    ),
  ).resolves.toEqual({
    formError: 'This booking was updated by another user. Refresh and try again.',
  });
  expect(mocks.transactionRunner).not.toHaveBeenCalled();
  expect(mocks.transaction.scheduleItem.deleteMany).not.toHaveBeenCalled();
});

test('does not allow a non-owner Customer Service user to resubmit', async () => {
  mocks.requireCurrentUser.mockResolvedValue({
    id: 'customer-service-2',
    role: UserRole.CUSTOMER_SERVICE,
  });
  mocks.findUnique.mockResolvedValue({
    id: 'booking-1',
    status: BookingStatus.NEEDS_MORE_INFO,
    createdById: 'customer-service-1',
  });

  await expect(
    resubmitBookingForApproval(
      initialBookingWorkflowActionState,
      formData({ bookingId: 'booking-1' }),
    ),
  ).resolves.toEqual({
    formError: 'You do not have permission to resubmit this booking.',
  });
  expect(mocks.updateMany).not.toHaveBeenCalled();
});

test('returns a recoverable error when a workflow update is stale', async () => {
  mocks.requireCurrentUser.mockResolvedValue({
    id: 'admin-1',
    role: UserRole.ADMIN,
  });
  mocks.findUnique.mockResolvedValue({
    id: 'booking-1',
    status: BookingStatus.PENDING_APPROVAL,
  });
  mocks.updateMany.mockResolvedValue({ count: 0 });

  await expect(
    markBookingNeedsMoreInfo(
      initialBookingWorkflowActionState,
      formData({ bookingId: 'booking-1', needsMoreInfoReason: 'Need more detail.' }),
    ),
  ).resolves.toEqual({
    formError: 'This booking was updated by another user. Refresh and try again.',
  });
});

test('enforces edit permissions on the server for terminal bookings', async () => {
  mocks.requireCurrentUser.mockResolvedValue({
    id: 'admin-1',
    role: UserRole.ADMIN,
  });
  mocks.findUnique.mockResolvedValue({
    id: 'booking-1',
    status: BookingStatus.SCHEDULED,
    createdById: 'customer-service-1',
    customers: [],
    deposits: [],
  });

  await expect(
    updateBooking('booking-1', bookingFormDefaultValues),
  ).resolves.toEqual({
    success: false,
    fieldErrors: {},
    formError: 'You do not have permission to edit this booking.',
  });
});

test('validates draft edits on the server before opening a transaction', async () => {
  mocks.requireCurrentUser.mockResolvedValue({
    id: 'customer-service-1',
    role: UserRole.CUSTOMER_SERVICE,
  });
  mocks.findUnique.mockResolvedValue({
    id: 'booking-1',
    status: BookingStatus.DRAFT,
    createdById: 'customer-service-1',
    customers: [],
    deposits: [],
  });

  await expect(
    updateBooking('booking-1', bookingFormDefaultValues),
  ).resolves.toMatchObject({
    success: false,
    formError:
      'Enter at least one booking, activity, or customer detail before saving a draft.',
  });
});

test('rejects paid deposits without an amount when saving draft edits', async () => {
  mocks.requireCurrentUser.mockResolvedValue({
    id: 'customer-service-1',
    role: UserRole.CUSTOMER_SERVICE,
  });
  mocks.findUnique.mockResolvedValue({
    id: 'booking-1',
    status: BookingStatus.DRAFT,
    createdById: 'customer-service-1',
    customers: [],
    deposits: [],
  });

  await expect(
    updateBooking('booking-1', {
      ...bookingFormDefaultValues,
      rawBookingText: 'Customer said the deposit is paid.',
      depositStatus: DepositStatus.PAID,
    }),
  ).resolves.toMatchObject({
    success: false,
    fieldErrors: {
      amount: ['Deposit amount is required when a deposit is paid.'],
      currency: ['Deposit currency is required when a deposit is paid.'],
      paidTo: ['Paid to is required when a deposit is paid.'],
    },
  });
  expect(mocks.transactionRunner).not.toHaveBeenCalled();
});

test('submits a draft edit with full submit validation in the same transaction', async () => {
  mocks.requireCurrentUser.mockResolvedValue({
    id: 'customer-service-1',
    role: UserRole.CUSTOMER_SERVICE,
  });
  mocks.findUnique.mockResolvedValue({
    id: 'booking-1',
    status: BookingStatus.DRAFT,
    createdById: 'customer-service-1',
    customers: [],
    deposits: [],
  });

  await expect(
    submitEditedBookingForApproval('booking-1', validSubmitValues()),
  ).resolves.toEqual({
    success: true,
    redirectTo: '/bookings/booking-1',
  });

  expect(mocks.transaction.bookingRequest.updateMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: {
        id: 'booking-1',
        status: BookingStatus.DRAFT,
      },
      data: expect.objectContaining({
        status: BookingStatus.PENDING_APPROVAL,
      }),
    }),
  );
});

test('validates pending approval saves with submit rules', async () => {
  mocks.requireCurrentUser.mockResolvedValue({
    id: 'admin-1',
    role: UserRole.ADMIN,
  });
  mocks.findUnique.mockResolvedValue({
    id: 'booking-1',
    status: BookingStatus.PENDING_APPROVAL,
    createdById: 'customer-service-1',
    customers: [],
    deposits: [],
  });

  await expect(
    updateBooking('booking-1', bookingFormDefaultValues),
  ).resolves.toMatchObject({
    success: false,
    fieldErrors: {
      'activities.0.activityType': [
        'Activity type is required before submitting for approval.',
      ],
    },
  });
  expect(mocks.transactionRunner).not.toHaveBeenCalled();
});

test('saves Needs More Info edits without clearing the stored reason', async () => {
  mocks.requireCurrentUser.mockResolvedValue({
    id: 'customer-service-1',
    role: UserRole.CUSTOMER_SERVICE,
  });
  mocks.findUnique.mockResolvedValue({
    id: 'booking-1',
    status: BookingStatus.NEEDS_MORE_INFO,
    createdById: 'customer-service-1',
    customers: [],
    deposits: [],
  });

  await expect(
    updateBooking('booking-1', {
      ...bookingFormDefaultValues,
      rawBookingText: 'Updated missing detail.',
    }),
  ).resolves.toEqual({
    success: true,
    redirectTo: '/bookings/booking-1',
  });

  const updateData =
    mocks.transaction.bookingRequest.updateMany.mock.calls[0][0].data;
  expect(updateData.status).toBeUndefined();
  expect(updateData).not.toHaveProperty('needsMoreInfoReason');
});

test('resubmits Needs More Info edits with full submit validation', async () => {
  mocks.requireCurrentUser.mockResolvedValue({
    id: 'customer-service-1',
    role: UserRole.CUSTOMER_SERVICE,
  });
  mocks.findUnique.mockResolvedValue({
    id: 'booking-1',
    status: BookingStatus.NEEDS_MORE_INFO,
    createdById: 'customer-service-1',
    customers: [],
    deposits: [],
  });

  await expect(
    resubmitEditedBookingForApproval('booking-1', validSubmitValues()),
  ).resolves.toEqual({
    success: true,
    redirectTo: '/bookings/booking-1',
  });

  const updateData =
    mocks.transaction.bookingRequest.updateMany.mock.calls[0][0].data;
  expect(updateData.status).toBe(BookingStatus.PENDING_APPROVAL);
  expect(updateData).not.toHaveProperty('needsMoreInfoReason');
});

test('updates related booking records in one transaction without changing status', async () => {
  mocks.requireCurrentUser.mockResolvedValue({
    id: 'admin-1',
    role: UserRole.ADMIN,
  });
  mocks.findUnique.mockResolvedValue({
    id: 'booking-1',
    status: BookingStatus.DRAFT,
    createdById: 'customer-service-1',
    customers: [{ customerId: 'customer-1' }],
    deposits: [{ id: 'deposit-1' }],
  });

  const values = {
    ...bookingFormDefaultValues,
    rawBookingText: 'Updated customer request',
    activities: [
      {
        ...bookingFormDefaultValues.activities[0],
        activityType: ActivityType.OPEN_WATER_COURSE,
        requestedDate: '2026-07-14',
      },
    ],
    numberOfPeople: '1',
    source: BookingSource.EMAIL,
    customers: [
      {
        ...bookingFormDefaultValues.customers[0],
        customerId: 'customer-1',
        role: BookingCustomerRole.PRIMARY_CONTACT,
        customerName: 'Maria Santos',
        email: 'maria@example.com',
      },
    ],
  };

  await expect(updateBooking('booking-1', values)).resolves.toEqual({
    success: true,
    redirectTo: '/bookings/booking-1',
  });

  expect(mocks.transactionRunner).toHaveBeenCalledTimes(1);
  expect(mocks.transaction.bookingActivity.deleteMany).toHaveBeenCalledWith({
    where: { bookingRequestId: 'booking-1' },
  });
  expect(mocks.findManyCustomers).toHaveBeenCalledWith({
    where: { id: { in: ['customer-1'] } },
    select: { id: true },
  });
  expect(mocks.transaction.customer.update).not.toHaveBeenCalled();
  expect(mocks.transaction.customer.create).not.toHaveBeenCalled();
  expect(mocks.transaction.bookingCustomer.createMany).toHaveBeenCalledWith(
    expect.objectContaining({
      data: [expect.objectContaining({ customerId: 'customer-1' })],
    }),
  );
  expect(mocks.transaction.deposit.delete).toHaveBeenCalledWith({
    where: { id: 'deposit-1' },
  });
  expect(mocks.revalidatePath).toHaveBeenCalledWith('/bookings/booking-1/edit');
});

test('creates a draft with a selected existing customer without duplicating the customer', async () => {
  mocks.requireCurrentUser.mockResolvedValue({
    id: 'customer-service-1',
    role: UserRole.CUSTOMER_SERVICE,
  });

  await expect(
    createBookingDraft({
      ...bookingFormDefaultValues,
      rawBookingText: 'Existing customer asked about course dates.',
      customers: [
        {
          ...bookingFormDefaultValues.customers[0],
          customerId: 'customer-1',
          customerName: 'Maria Santos',
          email: 'maria@example.com',
        },
      ],
    }),
  ).resolves.toEqual({
    success: true,
    redirectTo: '/bookings',
  });

  expect(mocks.findManyCustomers).toHaveBeenCalledWith({
    where: { id: { in: ['customer-1'] } },
    select: { id: true },
  });
  expect(mocks.transaction.customer.create).not.toHaveBeenCalled();
  expect(mocks.transaction.customer.update).not.toHaveBeenCalled();
  expect(mocks.transaction.bookingCustomer.createMany).toHaveBeenCalledWith({
    data: [expect.objectContaining({ customerId: 'customer-1' })],
  });
});

test('creates a raw-text draft without persisting the default empty customer row', async () => {
  mocks.requireCurrentUser.mockResolvedValue({
    id: 'customer-service-1',
    role: UserRole.CUSTOMER_SERVICE,
  });

  await expect(
    createBookingDraft({
      ...bookingFormDefaultValues,
      rawBookingText: 'Customer asked for course options but gave no details.',
    }),
  ).resolves.toEqual({
    success: true,
    redirectTo: '/bookings',
  });

  expect(mocks.transaction.customer.create).not.toHaveBeenCalled();
  expect(mocks.transaction.customer.update).not.toHaveBeenCalled();
  expect(mocks.transaction.bookingCustomer.createMany).not.toHaveBeenCalled();
});

test('removes existing booking customer links when edit form only has an empty row', async () => {
  mocks.requireCurrentUser.mockResolvedValue({
    id: 'customer-service-1',
    role: UserRole.CUSTOMER_SERVICE,
  });
  mocks.findUnique.mockResolvedValue({
    id: 'booking-1',
    status: BookingStatus.DRAFT,
    createdById: 'customer-service-1',
    customers: [{ customerId: 'blank-customer-1' }],
    deposits: [],
  });

  await expect(
    updateBooking('booking-1', {
      ...bookingFormDefaultValues,
      rawBookingText: 'Keep the booking draft but remove blank customer data.',
    }),
  ).resolves.toEqual({
    success: true,
    redirectTo: '/bookings/booking-1',
  });

  expect(mocks.transaction.bookingCustomer.deleteMany).toHaveBeenCalledWith({
    where: { bookingRequestId: 'booking-1' },
  });
  expect(mocks.transaction.customer.create).not.toHaveBeenCalled();
  expect(mocks.transaction.bookingCustomer.createMany).not.toHaveBeenCalled();
});

test('creates mixed existing and new booking customers in one transaction', async () => {
  mocks.requireCurrentUser.mockResolvedValue({
    id: 'customer-service-1',
    role: UserRole.CUSTOMER_SERVICE,
  });

  await expect(
    submitBookingForApproval(
      validSubmitValues({
        customers: [
          {
            ...bookingFormDefaultValues.customers[0],
            customerId: 'customer-1',
            role: BookingCustomerRole.PRIMARY_CONTACT,
            customerName: 'Maria Santos',
            email: 'maria@example.com',
          },
          {
            ...bookingFormDefaultValues.customers[0],
            role: BookingCustomerRole.PARTICIPANT,
            customerName: 'Kai Chen',
          },
        ],
      }),
    ),
  ).resolves.toEqual({
    success: true,
    redirectTo: '/bookings',
  });

  expect(mocks.transaction.customer.create).toHaveBeenCalledTimes(1);
  expect(mocks.transaction.customer.update).not.toHaveBeenCalled();
  expect(mocks.transaction.bookingCustomer.createMany).toHaveBeenCalledWith({
    data: [
      expect.objectContaining({ customerId: 'customer-1' }),
      expect.objectContaining({ customerId: 'customer-new' }),
    ],
  });
});

test('rejects duplicate selected customer IDs before opening a transaction', async () => {
  mocks.requireCurrentUser.mockResolvedValue({
    id: 'customer-service-1',
    role: UserRole.CUSTOMER_SERVICE,
  });

  await expect(
    createBookingDraft({
      ...bookingFormDefaultValues,
      rawBookingText: 'Two rows selected the same existing customer.',
      customers: [
        {
          ...bookingFormDefaultValues.customers[0],
          customerId: 'customer-1',
          customerName: 'Maria Santos',
        },
        {
          ...bookingFormDefaultValues.customers[0],
          customerId: 'customer-1',
          customerName: 'Maria Santos',
        },
      ],
    }),
  ).resolves.toEqual({
    success: false,
    fieldErrors: {},
    formError: 'Select each existing customer only once.',
  });

  expect(mocks.findManyCustomers).not.toHaveBeenCalled();
  expect(mocks.transactionRunner).not.toHaveBeenCalled();
});

test('rejects selected customer IDs that no longer exist', async () => {
  mocks.requireCurrentUser.mockResolvedValue({
    id: 'customer-service-1',
    role: UserRole.CUSTOMER_SERVICE,
  });
  mocks.findManyCustomers.mockResolvedValue([]);

  await expect(
    createBookingDraft({
      ...bookingFormDefaultValues,
      rawBookingText: 'Selected a stale customer.',
      customers: [
        {
          ...bookingFormDefaultValues.customers[0],
          customerId: 'missing-customer',
          customerName: 'Missing Customer',
        },
      ],
    }),
  ).resolves.toEqual({
    success: false,
    fieldErrors: {},
    formError:
      'One or more selected customers no longer exist. Refresh and try again.',
  });

  expect(mocks.transactionRunner).not.toHaveBeenCalled();
});
