import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { afterEach, expect, test, vi } from 'vitest';

import { BookingForm } from '@/components/bookings/booking-form';
import { bookingFormDefaultValues } from '@/features/bookings/intake';
import type { BookingFormValues } from '@/features/bookings/types';
import {
  NEW_BOOKING_FORM_AUTOSAVE_KEY,
  useBookingFormAutosave,
} from '@/features/bookings/use-booking-form-autosave';
import {
  ActivityType,
  Currency,
  PreferredLanguage,
} from '@/generated/prisma/enums';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/features/bookings/actions', () => ({
  createDraftBooking: vi.fn(),
  submitBookingForApproval: vi.fn(),
}));

afterEach(() => {
  window.localStorage.clear();
});

test('restores enum select values from a saved booking draft', async () => {
  window.localStorage.setItem(
    NEW_BOOKING_FORM_AUTOSAVE_KEY,
    JSON.stringify({
      activityType: ActivityType.FUN_DIVE,
      preferredLanguage: PreferredLanguage.ENGLISH,
      currency: Currency.PESOS,
    }),
  );

  const { result } = renderHook(() => {
    const form = useForm<BookingFormValues>({
      defaultValues: bookingFormDefaultValues,
    });

    useBookingFormAutosave(form);

    return form;
  });

  await waitFor(() => {
    expect(result.current.getValues()).toMatchObject({
      activityType: ActivityType.FUN_DIVE,
      preferredLanguage: PreferredLanguage.ENGLISH,
      currency: Currency.PESOS,
    });
  });

  act(() => {
    result.current.setValue('customerName', 'Maria Santos');
  });

  expect(
    JSON.parse(
      window.localStorage.getItem(NEW_BOOKING_FORM_AUTOSAVE_KEY) ?? '{}',
    ),
  ).toMatchObject({
    activityType: ActivityType.FUN_DIVE,
    preferredLanguage: PreferredLanguage.ENGLISH,
    currency: Currency.PESOS,
    customerName: 'Maria Santos',
  });
});

test('displays restored enum select values in the booking form', async () => {
  window.localStorage.setItem(
    NEW_BOOKING_FORM_AUTOSAVE_KEY,
    JSON.stringify({
      activityType: ActivityType.FUN_DIVE,
      preferredLanguage: PreferredLanguage.ENGLISH,
      currency: Currency.PESOS,
    }),
  );

  render(<BookingForm />);

  await waitFor(() => {
    expect(screen.getByLabelText('Activity type').textContent).toContain(
      'Fun Dive',
    );
    expect(screen.getByLabelText('Preferred language').textContent).toContain(
      'English',
    );
    expect(screen.getByLabelText('Currency').textContent).toContain('Pesos');
  });
});
