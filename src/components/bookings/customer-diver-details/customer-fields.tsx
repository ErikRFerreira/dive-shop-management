import type { ComponentProps } from 'react';
import {
  Controller,
  type FieldPath,
  type UseFormReturn,
} from 'react-hook-form';

import {
  BookingFormField,
  EnumSelect,
} from '@/components/bookings/booking-form-controls';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  formatEnumLabel,
  preferredLanguageOptions,
} from '@/features/bookings/form-options';
import type { BookingFormValues } from '@/features/bookings/types';
import { inputClassName } from '@/lib/consts';

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

type EquipmentNeededOption = 'UNKNOWN' | 'NO' | 'YES';

/**
 * Builds a React Hook Form path for one booking customer field.
 *
 * @param index - Customer/diver row index.
 * @param name - Field name within the customer/diver row.
 * @returns A typed React Hook Form field path.
 */
function customerFieldPath(index: number, name: CustomerFieldName) {
  return `customers.${index}.${name}` as FieldPath<BookingFormValues>;
}

/**
 * Converts persisted equipment text into the select option shown to staff.
 *
 * @param value - Current form value, including possible legacy free text.
 * @returns The equipment select option that should be displayed.
 */
function equipmentNeededOptionFromValue(
  value: string | undefined,
): EquipmentNeededOption {
  if (value === 'NO') return 'NO';
  if (value === 'YES') return 'YES';
  return value?.trim() ? 'YES' : 'UNKNOWN';
}

/**
 * Converts the equipment select option into the existing string form field.
 *
 * @param option - Staff-selected equipment value.
 * @returns The string stored in form state and later normalized for persistence.
 */
function equipmentNeededValueFromOption(option: EquipmentNeededOption) {
  return option === 'UNKNOWN' ? '' : option;
}

/**
 * Renders a text input registered to one customer/diver field.
 *
 * @param props - Field registration, label, validation, and input props.
 * @returns A labeled booking form input.
 */
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
      <Input
        id={path}
        {...inputProps}
        {...form.register(path)}
        className={inputClassName}
      />
    </BookingFormField>
  );
}

/**
 * Renders a textarea registered to one customer/diver field.
 *
 * @param props - Field registration, label, and layout class.
 * @returns A labeled booking form textarea.
 */
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
      <Textarea
        id={path}
        {...form.register(path)}
        className={`${inputClassName} h-24 resize-none`}
      />
    </BookingFormField>
  );
}

/**
 * Renders customer profile and booking contact fields for one row.
 *
 * @param props - Form state, row index, field errors, and readonly flags.
 * @returns Core customer identity, contact, hotel, and language fields.
 */
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
    <div className="space-y-4 md:col-span-2">
      <h4 className="text-sm font-medium">Contact details</h4>
      <div className="grid gap-4 md:grid-cols-2">
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
          label="Hotel / pickup location"
        />
        <BookingFormField id={preferredLanguagePath} label="Preferred language">
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
                  className={inputClassName}
                />
              )}
            />
          )}
        </BookingFormField>
      </div>
    </div>
  );
}

/**
 * Renders the controlled equipment-needed selector.
 *
 * @param props - Form state and row index for the equipment field.
 * @returns An Unknown/No/Yes selector backed by the existing string field.
 */
export function EquipmentFields({ form, index }: BaseCustomerFieldsProps) {
  const path = customerFieldPath(index, 'equipmentNeeded');

  return (
    <BookingFormField id={path} label="Equipment needed?">
      <Controller
        control={form.control}
        name={path}
        render={({ field }) => (
          <Select
            value={equipmentNeededOptionFromValue(field.value as string)}
            onValueChange={(value) =>
              field.onChange(
                equipmentNeededValueFromOption(value as EquipmentNeededOption),
              )
            }
          >
            <SelectTrigger id={field.name} className={inputClassName}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="UNKNOWN">Unknown</SelectItem>
              <SelectItem value="NO">No</SelectItem>
              <SelectItem value="YES">Yes</SelectItem>
            </SelectContent>
          </Select>
        )}
      />
    </BookingFormField>
  );
}

/**
 * Renders booking-specific notes for one customer/diver.
 *
 * @param props - Form state and row index for the notes field.
 * @returns A labeled customer notes textarea.
 */
export function CustomerNotesField({ form, index }: BaseCustomerFieldsProps) {
  return (
    <RegisteredTextAreaField
      form={form}
      index={index}
      name="customerNotes"
      label="Customer notes"
      className="grid gap-2 md:col-span-2"
    />
  );
}

/**
 * Renders booking-specific equipment details for one customer/diver.
 *
 * @param props - Form state and row index for equipment fields.
 * @returns Equipment needed, shoe size, height, and weight fields.
 */
export function EquipmentSizingFields({
  form,
  index,
}: BaseCustomerFieldsProps) {
  return (
    <div className="space-y-4 md:col-span-2">
      <h4 className="text-sm font-medium">Equipment details</h4>
      <div className="grid gap-4 md:grid-cols-2">
        <EquipmentFields form={form} index={index} />
        <RegisteredInputField
          form={form}
          index={index}
          name="shoeSize"
          label="Shoe size"
          inputProps={{ type: 'number', min: '0', step: '0.5' }}
        />
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
      </div>
    </div>
  );
}

/**
 * Renders diving experience fields for one customer/diver.
 *
 * @param props - Form state, row index, fun-dive requirement flag, and error lookup.
 * @returns Certification, last-dive, and logged-dive fields.
 */
export function DivingExperienceFields({
  form,
  index,
  requiresDivingExperience,
  getFieldError,
}: BaseCustomerFieldsProps & {
  requiresDivingExperience: boolean;
  getFieldError: (path: FieldPath<BookingFormValues>) => string | undefined;
}) {
  return (
    <div className="space-y-4 md:col-span-2">
      <h4 className="text-sm font-medium">Diving experience</h4>
      <div className="grid gap-4 md:grid-cols-2">
        <RegisteredInputField
          form={form}
          index={index}
          name="certificationLevel"
          label="Certification level"
          required={requiresDivingExperience}
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
          label="Logged dives"
          required={requiresDivingExperience}
          error={getFieldError(customerFieldPath(index, 'divesLogged'))}
          inputProps={{ type: 'number', min: '0', step: '1' }}
        />
      </div>
    </div>
  );
}
