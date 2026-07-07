import {
  Controller,
  type FieldPath,
  type UseFormReturn,
} from 'react-hook-form';

import { BookingFormSection } from '@/components/bookings/form/booking-form-section';
import {
  BookingFormField,
  BookingFormFieldError,
  EnumSelect,
} from '@/components/bookings/form/booking-form-controls';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  currencyOptions,
  depositStatusOptions,
} from '@/features/bookings/form-options';
import type { BookingFormValues } from '@/features/bookings/types';
import { inputClassName } from '@/lib/consts';

type DepositPaymentSectionProps = {
  form: UseFormReturn<BookingFormValues>;
  isPaidDeposit: boolean;
  getFieldError: (path: FieldPath<BookingFormValues>) => string | undefined;
};

/**
 * Renders deposit and payment fields for the booking intake workflow.
 *
 * @param props - Form state, paid-status flag, and field error lookup.
 * @returns The deposit/payment section with conditional required indicators.
 */
export function DepositPaymentSection({
  form,
  isPaidDeposit,
  getFieldError,
}: DepositPaymentSectionProps) {
  const amountError = getFieldError('amount');
  const currencyError = getFieldError('currency');
  const paidToError = getFieldError('paidTo');

  return (
    <BookingFormSection sectionNumber={5} title="Deposit / payment">
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
      <BookingFormField id="amount" label="Amount" required={isPaidDeposit}>
        <Input
          id="amount"
          type="number"
          min="0.01"
          step="0.01"
          {...form.register('amount')}
          className={inputClassName}
        />
      </BookingFormField>
      <BookingFormField id="currency" label="Currency" required={isPaidDeposit}>
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
      {amountError || currencyError ? (
        <div className="grid gap-1 md:col-span-2">
          <BookingFormFieldError error={amountError} />
          <BookingFormFieldError error={currencyError} />
        </div>
      ) : null}
      <BookingFormField id="paidTo" label="Paid to" required={isPaidDeposit}>
        <Input
          id="paidTo"
          {...form.register('paidTo')}
          className={inputClassName}
        />
      </BookingFormField>
      <BookingFormField id="paymentMethod" label="Payment method">
        <Input
          id="paymentMethod"
          {...form.register('paymentMethod')}
          className={inputClassName}
        />
      </BookingFormField>
      <BookingFormFieldError error={paidToError} className="md:col-span-2" />
      <BookingFormField id="paymentNotes" label="Payment notes">
        <Textarea
          id="paymentNotes"
          {...form.register('paymentNotes')}
          className={`${inputClassName} h-24 resize-none`}
        />
      </BookingFormField>
    </BookingFormSection>
  );
}
