import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { afterEach, expect, test, vi } from 'vitest';

import { BookingForm } from '@/components/bookings/booking-form';
import { bookingFormDefaultValues } from '@/features/bookings/form-values';
import type { BookingFormValues } from '@/features/bookings/types';
import {
  NEW_BOOKING_FORM_AUTOSAVE_KEY,
  useBookingFormAutosave,
} from '@/features/bookings/use-booking-form-autosave';
import {
  ActivityType,
  BookingCustomerRole,
  Currency,
  PreferredLanguage,
} from '@/generated/prisma/enums';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/features/bookings/actions', () => ({
  createBookingDraft: vi.fn(),
  submitBookingForApproval: vi.fn(),
}));

afterEach(() => {
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
