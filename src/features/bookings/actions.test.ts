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
    bookingRequest: { updateMany: vi.fn() },
    bookingActivity: { deleteMany: vi.fn(), createMany: vi.fn() },
    customer: { update: vi.fn(), create: vi.fn() },
    bookingCustomer: { deleteMany: vi.fn(), createMany: vi.fn() },
    deposit: { update: vi.fn(), create: vi.fn(), delete: vi.fn() },
  },
  updateMany: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    $transaction: mocks.transactionRunner,
    bookingRequest: {
      findUnique: mocks.findUnique,
      updateMany: mocks.updateMany,
    },
  },
}));

vi.mock('@/lib/current-user', () => ({
  requireCurrentUser: mocks.requireCurrentUser,
}));

vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }));

vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));

import {
  markBookingNeedsMoreInfo,
  resubmitEditedBookingForApproval,
  resubmitBookingForApproval,
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

beforeEach(() => {
  vi.clearAllMocks();
  mocks.redirect.mockImplementation((url: string) => {
    throw new Error(`redirect:${url}`);
  });
  mocks.updateMany.mockResolvedValue({ count: 1 });
  mocks.transactionRunner.mockImplementation(
    async (callback: (transaction: typeof mocks.transaction) => unknown) =>
      callback(mocks.transaction),
  );
  mocks.transaction.bookingRequest.updateMany.mockResolvedValue({ count: 1 });
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
  expect(mocks.transaction.customer.update).toHaveBeenCalledWith(
    expect.objectContaining({ where: { id: 'customer-1' } }),
  );
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
