import { beforeEach, expect, test, vi } from 'vitest';

import { BookingStatus, UserRole } from '@/generated/prisma/enums';

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn(),
  requireCurrentUser: vi.fn(),
  updateMany: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
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
  initialBookingWorkflowActionState,
  markBookingNeedsMoreInfo,
  resubmitBookingForApproval,
} from './actions';

function formData(values: Record<string, string>) {
  const data = new FormData();

  Object.entries(values).forEach(([key, value]) => data.set(key, value));

  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.redirect.mockImplementation((url: string) => {
    throw new Error(`redirect:${url}`);
  });
  mocks.updateMany.mockResolvedValue({ count: 1 });
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
  mocks.findUnique.mockResolvedValue({
    id: 'booking-1',
    status: BookingStatus.NEEDS_MORE_INFO,
    createdById: 'customer-service-1',
    needsMoreInfoReason: 'Confirm the diver certification.',
  });

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
