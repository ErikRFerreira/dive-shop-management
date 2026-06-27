import type { ComponentProps } from 'react';
import { Controller, type FieldPath, type UseFormReturn } from 'react-hook-form';

import {
  BookingFormField,
  EnumSelect,
} from '@/components/bookings/booking-form-controls';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  formatEnumLabel,
  preferredLanguageOptions,
} from '@/features/bookings/form-options';
import type { BookingFormValues } from '@/features/bookings/types';

type CustomerFieldName = keyof BookingFormValues['customers'][number];
type ContactInputProps = { 'aria-invalid'?: boolean; className?: string };

type BaseCustomerFieldsProps = {
  form: UseFormReturn<BookingFormValues>;
  index: number;
};

type CustomerFieldsProps = BaseCustomerFieldsProps & {
  getFieldError: (path: FieldPath<BookingFormValues>) => string | undefined;
  contactInputProps: ContactInputProps;
  isExistingCustomer: boolean;
};

type RegisteredInputFieldProps = BaseCustomerFieldsProps & {
  name: CustomerFieldName;
  label: string;
  required?: boolean;
  error?: string;
  className?: string;
  inputProps?: Omit<ComponentProps<'input'>, 'id' | 'name' | 'defaultValue'>;
};

type RegisteredTextAreaFieldProps = BaseCustomerFieldsProps & {
  name: CustomerFieldName;
  label: string;
  className?: string;
};

function customerFieldPath(index: number, name: CustomerFieldName) {
  return `customers.${index}.${name}` as FieldPath<BookingFormValues>;
}

function RegisteredInputField({
  form,
  index,
  name,
  label,
  required = false,
  error,
  className,
  inputProps,
}: RegisteredInputFieldProps) {
  const path = customerFieldPath(index, name);

  return (
    <BookingFormField
      id={path}
      label={label}
      required={required}
      error={error}
      className={className}
    >
      <Input id={path} {...inputProps} {...form.register(path)} />
    </BookingFormField>
  );
}

function RegisteredTextAreaField({
  form,
  index,
  name,
  label,
  className,
}: RegisteredTextAreaFieldProps) {
  const path = customerFieldPath(index, name);

  return (
    <BookingFormField id={path} label={label} className={className}>
      <Textarea id={path} {...form.register(path)} />
    </BookingFormField>
  );
}

export function CustomerFields({
  form,
  index,
  getFieldError,
  contactInputProps,
  isExistingCustomer,
}: CustomerFieldsProps) {
  const readOnlyInputProps = isExistingCustomer
    ? {
        readOnly: true,
        'aria-readonly': true,
      }
    : {};
  const contactProps = { ...readOnlyInputProps, ...contactInputProps };
  const preferredLanguagePath = `customers.${index}.preferredLanguage` as const;
  const preferredLanguage = form.getValues(preferredLanguagePath);

  return (
    <>
      <RegisteredInputField
        form={form}
        index={index}
        name="customerName"
        label="Customer name"
        required
        error={getFieldError(customerFieldPath(index, 'customerName'))}
        inputProps={readOnlyInputProps}
      />
      <RegisteredInputField
        form={form}
        index={index}
        name="chineseName"
        label="Chinese name"
        inputProps={readOnlyInputProps}
      />
      <RegisteredInputField
        form={form}
        index={index}
        name="weChatId"
        label="WeChat ID"
        inputProps={contactProps}
      />
      <RegisteredInputField
        form={form}
        index={index}
        name="whatsAppNumber"
        label="WhatsApp number"
        inputProps={contactProps}
      />
      <RegisteredInputField
        form={form}
        index={index}
        name="email"
        label="Email"
        inputProps={{ ...contactProps, type: 'email' }}
      />
      <RegisteredInputField
        form={form}
        index={index}
        name="phone"
        label="Phone"
        inputProps={{ ...contactProps, type: 'tel' }}
      />
      <RegisteredInputField
        form={form}
        index={index}
        name="hotelAtBooking"
        label="Hotel for this booking"
      />
      <BookingFormField
        id={preferredLanguagePath}
        label="Preferred language"
      >
        {isExistingCustomer ? (
          <div
            className="flex h-8 items-center rounded-md border bg-muted/30 px-3 text-sm"
            id={preferredLanguagePath}
          >
            {preferredLanguage ? formatEnumLabel(preferredLanguage) : '-'}
          </div>
        ) : (
          <Controller
            control={form.control}
            name={preferredLanguagePath}
            render={({ field }) => (
              <EnumSelect
                id={field.name}
                value={field.value}
                onValueChange={field.onChange}
                values={preferredLanguageOptions}
                placeholder="Select language"
              />
            )}
          />
        )}
      </BookingFormField>
    </>
  );
}

export function EquipmentFields({ form, index }: BaseCustomerFieldsProps) {
  return (
    <RegisteredTextAreaField
      form={form}
      index={index}
      name="equipmentNeeded"
      label="Equipment needed"
      className="grid gap-2 md:col-span-2"
    />
  );
}

export function CustomerNotesField({ form, index }: BaseCustomerFieldsProps) {
  return (
    <RegisteredTextAreaField
      form={form}
      index={index}
      name="customerNotes"
      label="Customer/diver notes"
      className="grid gap-2 md:col-span-2"
    />
  );
}

export function EquipmentSizingFields({
  form,
  index,
}: BaseCustomerFieldsProps) {
  return (
    <>
      <RegisteredInputField
        form={form}
        index={index}
        name="heightCm"
        label="Height (cm)"
        inputProps={{ type: 'number', min: '0' }}
      />
      <RegisteredInputField
        form={form}
        index={index}
        name="weightKg"
        label="Weight (kg)"
        inputProps={{ type: 'number', min: '0', step: '0.01' }}
      />
      <RegisteredInputField
        form={form}
        index={index}
        name="shoeSize"
        label="Shoe size"
        inputProps={{ type: 'number', min: '0', step: '0.5' }}
      />
    </>
  );
}

export function FunDiverFields({
  form,
  index,
  getFieldError,
}: BaseCustomerFieldsProps & {
  getFieldError: (path: FieldPath<BookingFormValues>) => string | undefined;
}) {
  return (
    <>
      <RegisteredInputField
        form={form}
        index={index}
        name="certificationLevel"
        label="Certification level"
        required
        error={getFieldError(customerFieldPath(index, 'certificationLevel'))}
      />
      <RegisteredInputField
        form={form}
        index={index}
        name="certificationAgency"
        label="Certification agency"
      />
      <RegisteredInputField
        form={form}
        index={index}
        name="lastDiveDate"
        label="Last dive date"
        error={getFieldError(customerFieldPath(index, 'lastDiveDate'))}
        inputProps={{ type: 'date' }}
      />
      <RegisteredInputField
        form={form}
        index={index}
        name="divesLogged"
        label="Dives logged"
        required
        error={getFieldError(customerFieldPath(index, 'divesLogged'))}
        inputProps={{ type: 'number', min: '0', step: '1' }}
      />
    </>
  );
}
