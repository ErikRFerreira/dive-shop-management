import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { afterEach, expect, test, vi } from 'vitest';

import { BookingForm } from '@/components/bookings/booking-form';
import { submitEditedBookingForApproval } from '@/features/bookings/actions';
import { bookingFormDefaultValues } from '@/features/bookings/form-values';
import type { BookingFormValues } from '@/features/bookings/types';
import {
  getBookingEditFormAutosaveKey,
  NEW_BOOKING_FORM_AUTOSAVE_KEY,
  useBookingFormAutosave,
} from '@/features/bookings/use-booking-form-autosave';
import {
  ActivityType,
  BookingCustomerRole,
  BookingSource,
  BookingStatus,
  Currency,
  PreferredLanguage,
} from '@/generated/prisma/enums';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/features/bookings/actions', () => ({
  createBookingDraft: vi.fn(),
  resubmitEditedBookingForApproval: vi.fn(),
  submitEditedBookingForApproval: vi.fn(),
  submitBookingForApproval: vi.fn(),
  updateBooking: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  window.localStorage.clear();
});

test('restores repeatable activity and customer values from a saved booking draft', async () => {
  window.localStorage.setItem(
    NEW_BOOKING_FORM_AUTOSAVE_KEY,
    JSON.stringify({
      activities: [
        {
          ...bookingFormDefaultValues.activities[0],
          activityType: ActivityType.FUN_DIVE,
        },
      ],
      customers: [
        {
          ...bookingFormDefaultValues.customers[0],
          role: BookingCustomerRole.PRIMARY_CONTACT,
          preferredLanguage: PreferredLanguage.ENGLISH,
        },
      ],
      currency: Currency.PESOS,
    }),
  );

  const { result } = renderHook(() => {
    const form = useForm<BookingFormValues>({ defaultValues: bookingFormDefaultValues });
    useBookingFormAutosave(form);
    return form;
  });

  await waitFor(() => {
    expect(result.current.getValues()).toMatchObject({
      activities: [{ activityType: ActivityType.FUN_DIVE }],
      customers: [{ preferredLanguage: PreferredLanguage.ENGLISH }],
      currency: Currency.PESOS,
    });
  });

  act(() => {
    result.current.setValue('customers.0.customerName', 'Maria Santos');
  });

  expect(
    JSON.parse(window.localStorage.getItem(NEW_BOOKING_FORM_AUTOSAVE_KEY) ?? '{}'),
  ).toMatchObject({
    activities: [{ activityType: ActivityType.FUN_DIVE }],
    customers: [{ customerName: 'Maria Santos' }],
    currency: Currency.PESOS,
  });
});

test('displays restored nested enum select values in the booking form', async () => {
  window.localStorage.setItem(
    NEW_BOOKING_FORM_AUTOSAVE_KEY,
    JSON.stringify({
      activities: [
        {
          ...bookingFormDefaultValues.activities[0],
          activityType: ActivityType.FUN_DIVE,
        },
      ],
      customers: [
        {
          ...bookingFormDefaultValues.customers[0],
          preferredLanguage: PreferredLanguage.ENGLISH,
        },
      ],
      currency: Currency.PESOS,
    }),
  );

  render(<BookingForm />);

  await waitFor(() => {
    expect(screen.getByLabelText(/Activity type/).textContent).toContain('Fun Dive');
    expect(screen.getByLabelText('Preferred language').textContent).toContain('English');
    expect(screen.getByLabelText('Currency').textContent).toContain('Pesos');
  });
});

test('uses edit-specific autosave in edit mode without restoring new-booking autosave', async () => {
  const editAutosaveKey = getBookingEditFormAutosaveKey('booking-1');

  window.localStorage.setItem(
    NEW_BOOKING_FORM_AUTOSAVE_KEY,
    JSON.stringify({ rawBookingText: 'Unsaved new booking' }),
  );
  window.localStorage.setItem(
    editAutosaveKey,
    JSON.stringify({ rawBookingText: 'Unsaved edit for this booking' }),
  );

  render(
    <BookingForm
      mode="edit"
      bookingId="booking-1"
      initialStatus={BookingStatus.DRAFT}
      initialValues={{
        ...bookingFormDefaultValues,
        rawBookingText: 'Saved booking',
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
      }}
    />,
  );

  await waitFor(() => {
    expect(
      document.querySelector<HTMLTextAreaElement>(
        'textarea[name="rawBookingText"]',
      )?.value,
    ).toBe('Unsaved edit for this booking');
  });

  expect(screen.getByRole('button', { name: 'Save Changes' })).not.toBeNull();
  const editForm = screen
    .getByRole('button', { name: 'Save Changes' })
    .closest('form');

  expect(editForm?.textContent).not.toContain('Save Draft');
  expect(editForm?.textContent).toContain('Submit for Approval');
});

test('persists edit mode changes to the booking-specific autosave key', async () => {
  const editAutosaveKey = getBookingEditFormAutosaveKey('booking-1');

  render(
    <BookingForm
      mode="edit"
      bookingId="booking-1"
      initialStatus={BookingStatus.DRAFT}
      initialValues={{
        ...bookingFormDefaultValues,
        rawBookingText: 'Saved booking',
      }}
    />,
  );

  fireEvent.change(
    document.querySelector<HTMLTextAreaElement>(
      'textarea[name="rawBookingText"]',
    )!,
    { target: { value: 'Temporary edit' } },
  );

  await waitFor(() => {
    expect(
      JSON.parse(window.localStorage.getItem(editAutosaveKey) ?? '{}'),
    ).toMatchObject({ rawBookingText: 'Temporary edit' });
  });
  expect(window.localStorage.getItem(NEW_BOOKING_FORM_AUTOSAVE_KEY)).toBeNull();
});

test('retries draft edit submission after fixing the primary contact method', async () => {
  vi.mocked(submitEditedBookingForApproval).mockResolvedValue({
    success: true,
    redirectTo: '/bookings/booking-1',
  });

  render(
    <BookingForm
      mode="edit"
      bookingId="booking-1"
      initialStatus={BookingStatus.DRAFT}
      initialValues={{
        ...bookingFormDefaultValues,
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
          },
        ],
      }}
    />,
  );

  fireEvent.click(screen.getByRole('button', { name: 'Submit for Approval' }));

  expect(
    await screen.findAllByText(
      /Provide at least one contact method for the primary contact/,
    ),
  ).not.toHaveLength(0);
  expect(submitEditedBookingForApproval).not.toHaveBeenCalled();

  fireEvent.change(screen.getByLabelText('Email'), {
    target: { value: 'maria@example.com' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Submit for Approval' }));

  await waitFor(() => {
    expect(submitEditedBookingForApproval).toHaveBeenCalledTimes(1);
  });
});

test('shows resubmit action only for editable Needs More Info bookings', () => {
  render(
    <BookingForm
      mode="edit"
      bookingId="booking-1"
      initialStatus={BookingStatus.NEEDS_MORE_INFO}
      initialValues={{
        ...bookingFormDefaultValues,
        rawBookingText: 'Saved booking',
      }}
    />,
  );

  expect(screen.getByRole('button', { name: 'Save Changes' })).not.toBeNull();
  expect(
    screen.getByRole('button', { name: 'Resubmit for Approval' }),
  ).not.toBeNull();
  expect(screen.queryByRole('button', { name: 'Submit for Approval' })).toBeNull();
});

test('shows only save changes for pending approval edit mode', () => {
  render(
    <BookingForm
      mode="edit"
      bookingId="booking-1"
      initialStatus={BookingStatus.PENDING_APPROVAL}
      initialValues={{
        ...bookingFormDefaultValues,
        rawBookingText: 'Saved booking',
      }}
    />,
  );

  expect(screen.getByRole('button', { name: 'Save Changes' })).not.toBeNull();
  expect(screen.queryByRole('button', { name: 'Submit for Approval' })).toBeNull();
  expect(
    screen.queryByRole('button', { name: 'Resubmit for Approval' }),
  ).toBeNull();
});
