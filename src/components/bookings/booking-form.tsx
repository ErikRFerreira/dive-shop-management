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
  createDraftBooking,
  submitBookingForApproval,
} from '@/features/bookings/actions';
import {
  bookingFormDefaultValues,
  formatEnumLabel,
} from '@/features/bookings/intake';
import type { BookingFormValues } from '@/features/bookings/types';
import {
  ActivityType,
  BookingSource,
  Currency,
  DepositStatus,
  PreferredLanguage,
} from '@/generated/prisma/enums';

type SubmitIntent = 'draft' | 'approval';

type FieldProps = {
  id: keyof BookingFormValues;
  label: string;
  className?: string;
  children: React.ReactNode;
};

function Field({ id, label, className, children }: FieldProps) {
  return (
    <div className={className ?? 'grid gap-2'}>
      <Label htmlFor={id}>{label}</Label>
      {children}
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
 * @remarks The component redirects only after the corresponding Server Action
 * confirms persistence, preserving autosave data when a request fails.
 */
export function BookingForm() {
  const router = useRouter();
  const [submitIntent, setSubmitIntent] = useState<SubmitIntent>('draft');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const form = useForm<BookingFormValues>({
    defaultValues: bookingFormDefaultValues,
  });
  const { clearAutosave } = useBookingFormAutosave(form);
  const activityType = useWatch({
    control: form.control,
    name: 'activityType',
  });

  const isSubmitting = form.formState.isSubmitting;

  async function onSubmit(values: BookingFormValues) {
    setSubmitError(null);

    const result =
      submitIntent === 'draft'
        ? await createDraftBooking(values)
        : await submitBookingForApproval(values);

    if (!result.success) {
      setSubmitError(result.message);
      return;
    }

    clearAutosave();
    router.push('/bookings');
  }

  function cancel() {
    clearAutosave();
  }

  return (
    <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
      <BookingFormSection
        title="Raw Booking Information"
        description="Keep the original customer message for review."
      >
        <Field
          id="rawBookingText"
          label="Raw booking text"
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
        <Field id="activityType" label="Activity type">
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
          <Field id="specialtyCourse" label="Specialty course">
            <Input
              id="specialtyCourse"
              required={submitIntent === 'approval'}
              {...form.register('specialtyCourse')}
            />
          </Field>
        ) : null}
        <Field id="source" label="Source">
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
        <Field id="requestedDate" label="Requested date">
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
        <Field id="numberOfPeople" label="Number of people">
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
        <Field id="customerName" label="Customer name">
          <Input id="customerName" {...form.register('customerName')} />
        </Field>
        <Field id="chineseName" label="Chinese name">
          <Input id="chineseName" {...form.register('chineseName')} />
        </Field>
        <Field id="weChatId" label="WeChat ID">
          <Input id="weChatId" {...form.register('weChatId')} />
        </Field>
        <Field id="whatsAppNumber" label="WhatsApp number">
          <Input id="whatsAppNumber" {...form.register('whatsAppNumber')} />
        </Field>
        <Field id="email" label="Email">
          <Input id="email" type="email" {...form.register('email')} />
        </Field>
        <Field id="phone" label="Phone (optional)">
          <Input id="phone" type="tel" {...form.register('phone')} />
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
      </BookingFormSection>

      {activityType === ActivityType.FUN_DIVE ? (
        <BookingFormSection title="Fun Diver Details">
          <Field id="certificationLevel" label="Certification level">
            <Input
              id="certificationLevel"
              required={submitIntent === 'approval'}
              {...form.register('certificationLevel')}
            />
          </Field>
          <Field id="certificationAgency" label="Certification agency">
            <Input
              id="certificationAgency"
              required={submitIntent === 'approval'}
              {...form.register('certificationAgency')}
            />
          </Field>
          <Field id="lastDiveDate" label="Last dive date">
            <Input
              id="lastDiveDate"
              type="date"
              required={submitIntent === 'approval'}
              {...form.register('lastDiveDate')}
            />
          </Field>
          <Field id="divesLogged" label="Dives logged">
            <Input
              id="divesLogged"
              type="number"
              min="0"
              step="1"
              required={submitIntent === 'approval'}
              {...form.register('divesLogged')}
            />
          </Field>
        </BookingFormSection>
      ) : null}

      <BookingFormSection title="Equipment Details">
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
        <Field id="amount" label="Amount">
          <Input
            id="amount"
            type="number"
            min="0"
            step="0.01"
            {...form.register('amount')}
          />
        </Field>
        <Field id="currency" label="Currency">
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
        <Field id="paidTo" label="Paid to">
          <Input id="paidTo" {...form.register('paidTo')} />
        </Field>
        <Field id="paymentMethod" label="Payment method">
          <Input id="paymentMethod" {...form.register('paymentMethod')} />
        </Field>
        <Field id="paymentNotes" label="Payment notes">
          <Input id="paymentNotes" {...form.register('paymentNotes')} />
        </Field>
      </BookingFormSection>

      {submitError ? (
        <p className="text-sm text-destructive" role="alert">
          {submitError}
        </p>
      ) : null}

      <div className="flex flex-wrap justify-end gap-2">
        <Button asChild type="button" variant="outline">
          <Link href="/bookings" onClick={cancel}>
            Cancel
          </Link>
        </Button>
        <Button
          type="submit"
          variant="outline"
          disabled={isSubmitting}
          onClick={() => setSubmitIntent('draft')}
        >
          {isSubmitting && submitIntent === 'draft' ? 'Saving…' : 'Save Draft'}
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          onClick={() => setSubmitIntent('approval')}
        >
          {isSubmitting && submitIntent === 'approval'
            ? 'Submitting…'
            : 'Submit for Approval'}
        </Button>
      </div>
    </form>
  );
}
