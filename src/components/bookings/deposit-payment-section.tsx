import {
  Controller,
  type FieldPath,
  type UseFormReturn,
} from 'react-hook-form';

import { BookingFormSection } from '@/components/bookings/booking-form-section';
import {
  BookingFormField,
  EnumSelect,
} from '@/components/bookings/booking-form-controls';
import { Input } from '@/components/ui/input';
import {
  currencyOptions,
  depositStatusOptions,
} from '@/features/bookings/form-options';
import type { BookingFormValues } from '@/features/bookings/types';

type DepositPaymentSectionProps = {
  form: UseFormReturn<BookingFormValues>;
  isPaidDeposit: boolean;
  getFieldError: (path: FieldPath<BookingFormValues>) => string | undefined;
};

export function DepositPaymentSection({
  form,
  isPaidDeposit,
  getFieldError,
}: DepositPaymentSectionProps) {
  return (
    <BookingFormSection title="Deposit Details">
      <BookingFormField id="depositStatus" label="Deposit status">
        <Controller
          control={form.control}
          name="depositStatus"
          render={({ field }) => (
            <EnumSelect
              id={field.name}
              value={field.value}
              onValueChange={field.onChange}
              values={depositStatusOptions}
              placeholder="Select deposit status"
            />
          )}
        />
      </BookingFormField>
      <BookingFormField
        id="amount"
        label="Amount"
        required={isPaidDeposit}
        error={getFieldError('amount')}
      >
        <Input
          id="amount"
          type="number"
          min="0.01"
          step="0.01"
          {...form.register('amount')}
        />
      </BookingFormField>
      <BookingFormField
        id="currency"
        label="Currency"
        required={isPaidDeposit}
        error={getFieldError('currency')}
      >
        <Controller
          control={form.control}
          name="currency"
          render={({ field }) => (
            <EnumSelect
              id={field.name}
              value={field.value}
              onValueChange={field.onChange}
              values={currencyOptions}
              placeholder="Select currency"
            />
          )}
        />
      </BookingFormField>
      <BookingFormField
        id="paidTo"
        label="Paid to"
        required={isPaidDeposit}
        error={getFieldError('paidTo')}
      >
        <Input id="paidTo" {...form.register('paidTo')} />
      </BookingFormField>
      <BookingFormField id="paymentMethod" label="Payment method">
        <Input id="paymentMethod" {...form.register('paymentMethod')} />
      </BookingFormField>
      <BookingFormField id="paymentNotes" label="Payment notes">
        <Input id="paymentNotes" {...form.register('paymentNotes')} />
      </BookingFormField>
    </BookingFormSection>
  );
}
