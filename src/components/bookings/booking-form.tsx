'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  Controller,
  useFieldArray,
  useForm,
  useWatch,
  type FieldErrors,
  type FieldPath,
} from 'react-hook-form';

import { BookingFormSection } from '@/components/bookings/booking-form-section';
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
  bookingActivityDefaultValues,
  bookingCustomerDefaultValues,
  bookingFormDefaultValues,
  formatEnumLabel,
  normalizeBookingFormValues,
} from '@/features/bookings/intake';
import type { BookingFormValues } from '@/features/bookings/types';
import { useBookingFormAutosave } from '@/features/bookings/use-booking-form-autosave';
import {
  validateBookingIntake,
  type BookingIntakeFieldErrors,
} from '@/features/bookings/validation';
import {
  ActivityType,
  BookingCustomerRole,
  BookingSource,
  Currency,
  DepositStatus,
  PreferredLanguage,
} from '@/generated/prisma/enums';

type SubmitIntent = 'draft' | 'submit';

const primaryContactMethodError =
  'Provide at least one contact method for the primary contact: WeChat ID, WhatsApp number, email, or phone.';

type FieldProps = {
  id: string;
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
        {required ? <span className="ml-1 text-destructive">*</span> : null}
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

function collectErrorMessages(errors: FieldErrors<BookingFormValues>) {
  const messages: string[] = [];

  function collect(value: unknown) {
    if (!value || typeof value !== 'object') return;

    const error = value as { message?: unknown };
    if (typeof error.message === 'string') {
      messages.push(error.message);
      return;
    }

    Object.values(value).forEach(collect);
  }

  collect(errors);
  return messages;
}

export function BookingForm() {
  const router = useRouter();
  const [submitIntent, setSubmitIntent] = useState<SubmitIntent>('draft');
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const form = useForm<BookingFormValues>({
    defaultValues: bookingFormDefaultValues,
  });
  const { clearAutosave } = useBookingFormAutosave(form);
  const {
    fields: activityFields,
    append: appendActivity,
    remove: removeActivity,
  } = useFieldArray({ control: form.control, name: 'activities' });
  const {
    fields: customerFields,
    append: appendCustomer,
    remove: removeCustomer,
  } = useFieldArray({ control: form.control, name: 'customers' });
  const activities =
    useWatch({ control: form.control, name: 'activities' }) ?? [];
  const customers =
    useWatch({ control: form.control, name: 'customers' }) ?? [];
  const depositStatus = useWatch({
    control: form.control,
    name: 'depositStatus',
  });
  const isSubmitting = form.formState.isSubmitting;
  const includesFunDive = activities.some(
    (activity) => activity.activityType === ActivityType.FUN_DIVE,
  );

  function getFieldError(path: FieldPath<BookingFormValues>) {
    return form.getFieldState(path, form.formState).error?.message;
  }

  function showValidationErrors(
    fieldErrors: BookingIntakeFieldErrors,
    nextFormErrors: string[],
  ) {
    form.clearErrors();
    Object.entries(fieldErrors).forEach(([field, messages]) => {
      const message = messages[0];
      if (message) {
        form.setError(field as FieldPath<BookingFormValues>, {
          type: 'validate',
          message,
        });
      }
    });
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

  function setPrimaryCustomer(index: number) {
    customerFields.forEach((_, customerIndex) => {
      form.setValue(
        `customers.${customerIndex}.role`,
        customerIndex === index
          ? BookingCustomerRole.PRIMARY_CONTACT
          : BookingCustomerRole.PARTICIPANT,
        { shouldDirty: true },
      );
    });
  }

  function removeCustomerAndKeepPrimary(index: number) {
    removeCustomer(index);
    const remainingCustomers = form.getValues('customers');
    if (
      remainingCustomers.length > 0 &&
      !remainingCustomers.some(
        (customer) => customer.role === BookingCustomerRole.PRIMARY_CONTACT,
      )
    ) {
      form.setValue('customers.0.role', BookingCustomerRole.PRIMARY_CONTACT, {
        shouldDirty: true,
      });
    }
  }

  const isPaidDeposit =
    depositStatus === DepositStatus.PAID ||
    depositStatus === DepositStatus.PARTIALLY_PAID;
  const customerError = getFieldError('customers');
  const hasPrimaryContactMethodError =
    customerError === primaryContactMethodError;
  const errorMessages = [
    ...new Set([...formErrors, ...collectErrorMessages(form.formState.errors)]),
  ];

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

      <BookingFormSection title="Activities">
        <div className="space-y-4 md:col-span-2">
          {activityFields.map((activity, index) => {
            const prefix = `activities.${index}` as const;
            const isSpecialtyCourse =
              activities[index]?.activityType === ActivityType.SPECIALTY_COURSE;

            return (
              <div className="rounded-lg border p-4" key={activity.id}>
                <div className="mb-4 flex items-center justify-between gap-4">
                  <h3 className="font-medium">Activity {index + 1}</h3>
                  {activityFields.length > 1 ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeActivity(index)}
                    >
                      Remove activity
                    </Button>
                  ) : null}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field
                    id={`${prefix}.activityType`}
                    label="Activity type"
                    required
                    error={getFieldError(`${prefix}.activityType`)}
                  >
                    <Controller
                      control={form.control}
                      name={`${prefix}.activityType`}
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
                  {isSpecialtyCourse ? (
                    <Field
                      id={`${prefix}.specialtyCourse`}
                      label="Specialty course"
                      required
                      error={getFieldError(`${prefix}.specialtyCourse`)}
                    >
                      <Input
                        id={`${prefix}.specialtyCourse`}
                        {...form.register(`${prefix}.specialtyCourse`)}
                      />
                    </Field>
                  ) : null}
                  <Field
                    id={`${prefix}.requestedDate`}
                    label="Requested start date"
                    required
                    error={getFieldError(`${prefix}.requestedDate`)}
                  >
                    <Input
                      id={`${prefix}.requestedDate`}
                      type="date"
                      {...form.register(`${prefix}.requestedDate`)}
                    />
                  </Field>
                  <Field
                    id={`${prefix}.requestedTime`}
                    label="Requested time (optional)"
                  >
                    <Input
                      id={`${prefix}.requestedTime`}
                      type="time"
                      {...form.register(`${prefix}.requestedTime`)}
                    />
                  </Field>
                  <Field
                    id={`${prefix}.notes`}
                    label="Activity notes"
                    className="grid gap-2 md:col-span-2"
                  >
                    <Textarea
                      id={`${prefix}.notes`}
                      {...form.register(`${prefix}.notes`)}
                    />
                  </Field>
                </div>
              </div>
            );
          })}
          <Button
            type="button"
            variant="outline"
            onClick={() => appendActivity({ ...bookingActivityDefaultValues })}
          >
            Add activity
          </Button>
        </div>
      </BookingFormSection>

      <BookingFormSection title="Customers / Divers">
        <div className="space-y-4 md:col-span-2">
          {customerFields.map((customer, index) => {
            const prefix = `customers.${index}` as const;
            const isPrimaryContact =
              customers[index]?.role === BookingCustomerRole.PRIMARY_CONTACT;
            const contactInputProps =
              isPrimaryContact && hasPrimaryContactMethodError
                ? {
                    'aria-invalid': true,
                    className:
                      'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20',
                  }
                : {};

            return (
              <div className="rounded-lg border p-4" key={customer.id}>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="font-medium">
                      Customer / diver {index + 1}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {isPrimaryContact ? 'Primary contact' : 'Participant'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <label
                      className="flex items-center gap-2 text-sm"
                      htmlFor={`${prefix}.primaryContact`}
                    >
                      <input
                        id={`${prefix}.primaryContact`}
                        type="checkbox"
                        checked={isPrimaryContact}
                        onChange={() => setPrimaryCustomer(index)}
                      />
                      Primary contact
                    </label>
                    {customerFields.length > 1 ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeCustomerAndKeepPrimary(index)}
                      >
                        Remove customer
                      </Button>
                    ) : null}
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field
                    id={`${prefix}.customerName`}
                    label="Customer name"
                    required
                    error={getFieldError(`${prefix}.customerName`)}
                  >
                    <Input
                      id={`${prefix}.customerName`}
                      {...form.register(`${prefix}.customerName`)}
                    />
                  </Field>
                  <Field id={`${prefix}.chineseName`} label="Chinese name">
                    <Input
                      id={`${prefix}.chineseName`}
                      {...form.register(`${prefix}.chineseName`)}
                    />
                  </Field>
                  <Field id={`${prefix}.weChatId`} label="WeChat ID">
                    <Input
                      id={`${prefix}.weChatId`}
                      {...contactInputProps}
                      {...form.register(`${prefix}.weChatId`)}
                    />
                  </Field>
                  <Field
                    id={`${prefix}.whatsAppNumber`}
                    label="WhatsApp number"
                  >
                    <Input
                      id={`${prefix}.whatsAppNumber`}
                      {...contactInputProps}
                      {...form.register(`${prefix}.whatsAppNumber`)}
                    />
                  </Field>
                  <Field id={`${prefix}.email`} label="Email">
                    <Input
                      id={`${prefix}.email`}
                      type="email"
                      {...contactInputProps}
                      {...form.register(`${prefix}.email`)}
                    />
                  </Field>
                  <Field id={`${prefix}.phone`} label="Phone">
                    <Input
                      id={`${prefix}.phone`}
                      type="tel"
                      {...contactInputProps}
                      {...form.register(`${prefix}.phone`)}
                    />
                  </Field>
                  <Field
                    id={`${prefix}.hotelAtBooking`}
                    label="Hotel for this booking"
                  >
                    <Input
                      id={`${prefix}.hotelAtBooking`}
                      {...form.register(`${prefix}.hotelAtBooking`)}
                    />
                  </Field>
                  <Field
                    id={`${prefix}.preferredLanguage`}
                    label="Preferred language"
                  >
                    <Controller
                      control={form.control}
                      name={`${prefix}.preferredLanguage`}
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
                  <Field
                    id={`${prefix}.equipmentNeeded`}
                    label="Equipment needed"
                    className="grid gap-2 md:col-span-2"
                  >
                    <Textarea
                      id={`${prefix}.equipmentNeeded`}
                      {...form.register(`${prefix}.equipmentNeeded`)}
                    />
                  </Field>
                  <Field
                    id={`${prefix}.customerNotes`}
                    label="Customer/diver notes"
                    className="grid gap-2 md:col-span-2"
                  >
                    <Textarea
                      id={`${prefix}.customerNotes`}
                      {...form.register(`${prefix}.customerNotes`)}
                    />
                  </Field>

                  {includesFunDive ? (
                    <>
                      <Field
                        id={`${prefix}.certificationLevel`}
                        label="Certification level"
                        required
                        error={getFieldError(`${prefix}.certificationLevel`)}
                      >
                        <Input
                          id={`${prefix}.certificationLevel`}
                          {...form.register(`${prefix}.certificationLevel`)}
                        />
                      </Field>
                      <Field
                        id={`${prefix}.certificationAgency`}
                        label="Certification agency"
                      >
                        <Input
                          id={`${prefix}.certificationAgency`}
                          {...form.register(`${prefix}.certificationAgency`)}
                        />
                      </Field>
                      <Field
                        id={`${prefix}.lastDiveDate`}
                        label="Last dive date"
                        required
                        error={getFieldError(`${prefix}.lastDiveDate`)}
                      >
                        <Input
                          id={`${prefix}.lastDiveDate`}
                          type="date"
                          {...form.register(`${prefix}.lastDiveDate`)}
                        />
                      </Field>
                      <Field
                        id={`${prefix}.divesLogged`}
                        label="Dives logged"
                        required
                        error={getFieldError(`${prefix}.divesLogged`)}
                      >
                        <Input
                          id={`${prefix}.divesLogged`}
                          type="number"
                          min="0"
                          step="1"
                          {...form.register(`${prefix}.divesLogged`)}
                        />
                      </Field>
                    </>
                  ) : null}

                  <Field id={`${prefix}.heightCm`} label="Height (cm)">
                    <Input
                      id={`${prefix}.heightCm`}
                      type="number"
                      min="0"
                      {...form.register(`${prefix}.heightCm`)}
                    />
                  </Field>
                  <Field id={`${prefix}.weightKg`} label="Weight (kg)">
                    <Input
                      id={`${prefix}.weightKg`}
                      type="number"
                      min="0"
                      step="0.01"
                      {...form.register(`${prefix}.weightKg`)}
                    />
                  </Field>
                  <Field id={`${prefix}.shoeSize`} label="Shoe size">
                    <Input
                      id={`${prefix}.shoeSize`}
                      type="number"
                      min="0"
                      step="0.5"
                      {...form.register(`${prefix}.shoeSize`)}
                    />
                  </Field>
                </div>
              </div>
            );
          })}
          {customerError && customerError !== primaryContactMethodError ? (
            <p className="text-sm text-destructive" role="alert">
              {customerError}
            </p>
          ) : null}
          {hasPrimaryContactMethodError ? (
            <p className="text-sm text-destructive" role="alert">
              {primaryContactMethodError}
            </p>
          ) : null}
          <Button
            type="button"
            variant="outline"
            onClick={() => appendCustomer({ ...bookingCustomerDefaultValues })}
          >
            Add customer / diver
          </Button>
        </div>
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
          <Link href="/bookings" onClick={clearAutosave}>
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
