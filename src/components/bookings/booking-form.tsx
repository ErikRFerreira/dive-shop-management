'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';

import { BookingFormSection } from '@/components/bookings/booking-form-section';
import { useBookingFormAutosave } from '@/features/bookings/use-booking-form-autosave';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  createBookingDraft,
  submitBookingForApproval,
} from '@/features/bookings/actions';
import {
  bookingFormDefaultValues,
  formatEnumLabel,
  normalizeBookingFormValues,
} from '@/features/bookings/intake';
import type { BookingFormValues } from '@/features/bookings/types';
import {
  validateBookingIntake,
  type BookingIntakeFieldErrors,
} from '@/features/bookings/validation';
import {
  ActivityType,
  BookingSource,
  Currency,
  DepositStatus,
  PreferredLanguage,
} from '@/generated/prisma/enums';

type SubmitIntent = 'draft' | 'submit';

const contactMethodError =
  'Provide at least one contact method: WeChat ID, WhatsApp number, email, or phone.';

type FieldProps = {
  id: keyof BookingFormValues;
  label: string;
  className?: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
};

function Field({
  id,
  label,
  className,
  required = false,
  error,
  children,
}: FieldProps) {
  return (
    <div className={className ?? 'grid gap-2'}>
      <Label htmlFor={id}>
        {label}
        {required ? (
          <span aria-hidden="true" className="ml-1 text-destructive">
            *
          </span>
        ) : null}
      </Label>
      {children}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function EnumSelect<T extends string>({
  id,
  value,
  onValueChange,
  values,
  placeholder,
}: {
  id: string;
  value: T | '';
  onValueChange: (value: T) => void;
  values: T[];
  placeholder: string;
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger id={id}>
        <SelectValue placeholder={placeholder}>
          {value ? formatEnumLabel(value) : undefined}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {values.map((option) => (
          <SelectItem key={option} value={option}>
            {formatEnumLabel(option)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * Renders and submits the first internal booking intake form.
 *
 * @returns A React Hook Form booking intake interface with local autosave.
 * @remarks Autosave is cleared only after a Server Action confirms persistence.
 */
export function BookingForm() {
  const router = useRouter();
  const [submitIntent, setSubmitIntent] = useState<SubmitIntent>('draft');
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const form = useForm<BookingFormValues>({
    defaultValues: bookingFormDefaultValues,
  });
  const { clearAutosave } = useBookingFormAutosave(form);
  const activityType = useWatch({
    control: form.control,
    name: 'activityType',
  });
  const depositStatus = useWatch({
    control: form.control,
    name: 'depositStatus',
  });

  const isSubmitting = form.formState.isSubmitting;

  function showValidationErrors(
    fieldErrors: BookingIntakeFieldErrors,
    nextFormErrors: string[],
  ) {
    form.clearErrors();

    for (const [field, messages] of Object.entries(fieldErrors)) {
      const message = messages[0];

      if (message) {
        form.setError(field as keyof BookingFormValues, {
          type: 'validate',
          message,
        });
      }
    }

    setFormErrors(nextFormErrors);
  }

  async function submitBooking(
    values: BookingFormValues,
    intent: SubmitIntent,
  ) {
    setSubmitIntent(intent);
    showValidationErrors({}, []);

    const validation = validateBookingIntake(
      normalizeBookingFormValues(values),
      intent,
    );

    if (!validation.success) {
      showValidationErrors(validation.fieldErrors, validation.formErrors);
      return;
    }

    const result =
      intent === 'draft'
        ? await createBookingDraft(values)
        : await submitBookingForApproval(values);

    if (!result.success) {
      showValidationErrors(
        result.fieldErrors,
        result.formError ? [result.formError] : [],
      );
      return;
    }

    clearAutosave();
    router.push(result.redirectTo);
  }

  function cancel() {
    clearAutosave();
  }

  const errorMessages = [
    ...new Set([
      ...formErrors.filter((error) => error !== contactMethodError),
      ...Object.values(form.formState.errors).flatMap((error) =>
        error.message ? [error.message] : [],
      ),
    ]),
  ];
  const isPaidDeposit =
    depositStatus === DepositStatus.PAID ||
    depositStatus === DepositStatus.PARTIALLY_PAID;
  const getFieldError = (field: keyof BookingFormValues) =>
    form.formState.errors[field]?.message;
  const hasContactMethodError = formErrors.includes(contactMethodError);
  const contactInputProps = hasContactMethodError
    ? {
        'aria-invalid': true,
        className:
          'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20',
      }
    : {};

  return (
    <form
      className="space-y-6"
      noValidate
      onSubmit={form.handleSubmit((values) => submitBooking(values, 'submit'))}
    >
      <BookingFormSection
        title="Raw Booking Information"
        description="Keep the original customer message for review."
      >
        <Field
          id="rawBookingText"
          label=""
          className="grid gap-2 md:col-span-2"
        >
          <Textarea
            id="rawBookingText"
            rows={6}
            {...form.register('rawBookingText')}
          />
        </Field>
      </BookingFormSection>

      <BookingFormSection title="Booking Details">
        <Field
          id="activityType"
          label="Activity type"
          required
          error={getFieldError('activityType')}
        >
          <Controller
            control={form.control}
            name="activityType"
            render={({ field }) => (
              <EnumSelect
                id={field.name}
                value={field.value}
                onValueChange={field.onChange}
                values={Object.values(ActivityType)}
                placeholder="Select activity"
              />
            )}
          />
        </Field>
        {activityType === ActivityType.SPECIALTY_COURSE ? (
          <Field
            id="specialtyCourse"
            label="Specialty course"
            required
            error={getFieldError('specialtyCourse')}
          >
            <Input id="specialtyCourse" {...form.register('specialtyCourse')} />
          </Field>
        ) : null}
        <Field
          id="source"
          label="Source"
          required
          error={getFieldError('source')}
        >
          <Controller
            control={form.control}
            name="source"
            render={({ field }) => (
              <EnumSelect
                id={field.name}
                value={field.value}
                onValueChange={field.onChange}
                values={Object.values(BookingSource)}
                placeholder="Select source"
              />
            )}
          />
        </Field>
        <Field
          id="requestedDate"
          label="Requested date"
          required
          error={getFieldError('requestedDate')}
        >
          <Input
            id="requestedDate"
            type="date"
            {...form.register('requestedDate')}
          />
        </Field>
        <Field id="requestedTime" label="Requested time (optional)">
          <Input
            id="requestedTime"
            type="time"
            {...form.register('requestedTime')}
          />
        </Field>
        <Field
          id="numberOfPeople"
          label="Number of people"
          required
          error={getFieldError('numberOfPeople')}
        >
          <Input
            id="numberOfPeople"
            type="number"
            min="1"
            step="1"
            {...form.register('numberOfPeople')}
          />
        </Field>
        <Field id="referrerName" label="Referrer name (optional)">
          <Input id="referrerName" {...form.register('referrerName')} />
        </Field>
        <Field
          id="internalNotes"
          label="Internal notes"
          className="grid gap-2 md:col-span-2"
        >
          <Textarea id="internalNotes" {...form.register('internalNotes')} />
        </Field>
      </BookingFormSection>

      <BookingFormSection title="Customer / Diver Details">
        <Field
          id="customerName"
          label="Customer name"
          required
          error={getFieldError('customerName')}
        >
          <Input id="customerName" {...form.register('customerName')} />
        </Field>
        <Field id="chineseName" label="Chinese name">
          <Input id="chineseName" {...form.register('chineseName')} />
        </Field>
        <Field
          id="weChatId"
          label="WeChat ID"
        >
          <Input
            id="weChatId"
            {...contactInputProps}
            {...form.register('weChatId')}
          />
        </Field>
        <Field
          id="whatsAppNumber"
          label="WhatsApp number"
        >
          <Input
            id="whatsAppNumber"
            {...contactInputProps}
            {...form.register('whatsAppNumber')}
          />
        </Field>
        <Field id="email" label="Email">
          <Input
            id="email"
            type="email"
            {...contactInputProps}
            {...form.register('email')}
          />
        </Field>
        <Field id="phone" label="Phone">
          <Input
            id="phone"
            type="tel"
            {...contactInputProps}
            {...form.register('phone')}
          />
        </Field>
        <Field id="hotel" label="Hotel">
          <Input id="hotel" {...form.register('hotel')} />
        </Field>
        <Field id="preferredLanguage" label="Preferred language">
          <Controller
            control={form.control}
            name="preferredLanguage"
            render={({ field }) => (
              <EnumSelect
                id={field.name}
                value={field.value}
                onValueChange={field.onChange}
                values={Object.values(PreferredLanguage)}
                placeholder="Select language"
              />
            )}
          />
        </Field>
        <p
          className={
            hasContactMethodError
              ? 'text-sm text-destructive md:col-span-2'
              : 'text-sm text-muted-foreground md:col-span-2'
          }
          role={hasContactMethodError ? 'alert' : undefined}
        >
          {hasContactMethodError
            ? contactMethodError
            : 'Required for approval: provide at least one contact method.'}
        </p>
      </BookingFormSection>

      {activityType === ActivityType.FUN_DIVE ? (
        <BookingFormSection title="Fun Diver Details">
          <Field
            id="certificationLevel"
            label="Certification level"
            required
            error={getFieldError('certificationLevel')}
          >
            <Input
              id="certificationLevel"
              {...form.register('certificationLevel')}
            />
          </Field>
          <Field id="certificationAgency" label="Certification agency">
            <Input
              id="certificationAgency"
              {...form.register('certificationAgency')}
            />
          </Field>
          <Field
            id="lastDiveDate"
            label="Last dive date"
            required
            error={getFieldError('lastDiveDate')}
          >
            <Input
              id="lastDiveDate"
              type="date"
              {...form.register('lastDiveDate')}
            />
          </Field>
          <Field
            id="divesLogged"
            label="Dives logged"
            required
            error={getFieldError('divesLogged')}
          >
            <Input
              id="divesLogged"
              type="number"
              min="0"
              step="1"
              {...form.register('divesLogged')}
            />
          </Field>
        </BookingFormSection>
      ) : null}

      <BookingFormSection title="Sizing details">
        <Field id="heightCm" label="Height (cm)">
          <Input
            id="heightCm"
            type="number"
            min="0"
            {...form.register('heightCm')}
          />
        </Field>
        <Field id="weightKg" label="Weight (kg)">
          <Input
            id="weightKg"
            type="number"
            min="0"
            step="0.01"
            {...form.register('weightKg')}
          />
        </Field>
        <Field id="shoeSize" label="Shoe size">
          <Input
            id="shoeSize"
            type="number"
            min="0"
            step="0.5"
            {...form.register('shoeSize')}
          />
        </Field>
      </BookingFormSection>

      <BookingFormSection title="Deposit Details">
        <Field id="depositStatus" label="Deposit status">
          <Controller
            control={form.control}
            name="depositStatus"
            render={({ field }) => (
              <EnumSelect
                id={field.name}
                value={field.value}
                onValueChange={field.onChange}
                values={Object.values(DepositStatus)}
                placeholder="Select deposit status"
              />
            )}
          />
        </Field>
        <Field
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
        </Field>
        <Field
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
                values={Object.values(Currency)}
                placeholder="Select currency"
              />
            )}
          />
        </Field>
        <Field
          id="paidTo"
          label="Paid to"
          required={isPaidDeposit}
          error={getFieldError('paidTo')}
        >
          <Input id="paidTo" {...form.register('paidTo')} />
        </Field>
        <Field id="paymentMethod" label="Payment method">
          <Input id="paymentMethod" {...form.register('paymentMethod')} />
        </Field>
        <Field id="paymentNotes" label="Payment notes">
          <Input id="paymentNotes" {...form.register('paymentNotes')} />
        </Field>
      </BookingFormSection>

      {errorMessages.length > 0 ? (
        <div
          className="rounded-md border border-destructive/50 p-3 text-sm text-destructive"
          role="alert"
        >
          <p>Please fix the following before continuing:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {errorMessages.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-wrap justify-end gap-2">
        <Button asChild type="button" variant="outline">
          <Link href="/bookings" onClick={cancel}>
            Cancel
          </Link>
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={isSubmitting}
          onClick={() =>
            void form.handleSubmit((values) => submitBooking(values, 'draft'))()
          }
        >
          {isSubmitting && submitIntent === 'draft' ? 'Saving…' : 'Save Draft'}
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          onClick={() => setSubmitIntent('submit')}
        >
          {isSubmitting && submitIntent === 'submit'
            ? 'Submitting…'
            : 'Submit for Approval'}
        </Button>
      </div>
    </form>
  );
}
