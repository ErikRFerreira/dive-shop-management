import { cleanup, render, screen } from '@testing-library/react';
import { useForm, useWatch } from 'react-hook-form';
import { afterEach, expect, test } from 'vitest';

import { BookingDetailsSection } from '@/components/bookings/booking-details-section';
import { DepositPaymentSection } from '@/components/bookings/deposit-payment-section';
import { RawBookingSection } from '@/components/bookings/raw-booking-section';
import { bookingFormDefaultValues } from '@/features/bookings/form-values';
import type { BookingFormValues } from '@/features/bookings/types';

afterEach(() => {
  cleanup();
});

/**
 * Renders the booking summary section with live activity values.
 *
 * @returns A booking summary test harness backed by React Hook Form.
 */
function BookingDetailsHarness() {
  const form = useForm<BookingFormValues>({
    defaultValues: bookingFormDefaultValues,
  });
  const activities =
    useWatch({ control: form.control, name: 'activities' }) ?? [];

  return (
    <BookingDetailsSection
      form={form}
      activities={activities}
      getFieldError={() => undefined}
    />
  );
}

/**
 * Renders the standalone raw booking message section for tests.
 *
 * @returns A raw booking section test harness backed by React Hook Form.
 */
function RawBookingHarness() {
  const form = useForm<BookingFormValues>({
    defaultValues: bookingFormDefaultValues,
  });

  return <RawBookingSection form={form} />;
}

/**
 * Renders the standalone deposit/payment section for tests.
 *
 * @returns A deposit/payment section test harness backed by React Hook Form.
 */
function DepositPaymentHarness() {
  const form = useForm<BookingFormValues>({
    defaultValues: bookingFormDefaultValues,
  });

  return (
    <DepositPaymentSection
      form={form}
      isPaidDeposit={false}
      getFieldError={() => undefined}
    />
  );
}

test('renders the renamed original booking message section first', () => {
  render(<RawBookingHarness />);

  expect(screen.getByText('Original booking message')).not.toBeNull();
  expect(
    screen.getByText(
      'Paste the original customer, WeChat, WhatsApp, or agent message.',
    ),
  ).not.toBeNull();
});

test('renders booking summary and activity labels with operational wording', () => {
  render(<BookingDetailsHarness />);

  expect(screen.getByText('Booking Summary')).not.toBeNull();
  expect(screen.getByLabelText(/Source \/ referrer/)).not.toBeNull();
  expect(screen.getByLabelText(/Total participants/)).not.toBeNull();
  expect(screen.getByLabelText(/Requested date/)).not.toBeNull();
  expect(screen.getByLabelText('Requested time / TBD')).not.toBeNull();
});

test('renders deposit payment notes as multiline text', () => {
  render(<DepositPaymentHarness />);

  expect(screen.getByText('Deposit / payment')).not.toBeNull();
  expect(screen.getByLabelText('Payment notes').tagName).toBe('TEXTAREA');
});
