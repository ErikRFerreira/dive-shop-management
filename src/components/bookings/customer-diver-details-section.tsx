import {
  Controller,
  useFieldArray,
  useWatch,
  type FieldPath,
  type UseFormReturn,
} from 'react-hook-form';

import { BookingFormSection } from '@/components/bookings/booking-form-section';
import {
  BookingFormField,
  EnumSelect,
} from '@/components/bookings/booking-form-controls';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { preferredLanguageOptions } from '@/features/bookings/form-options';
import { bookingCustomerDefaultValues } from '@/features/bookings/form-values';
import type { BookingFormValues } from '@/features/bookings/types';
import { BookingCustomerRole } from '@/generated/prisma/enums';

const primaryContactMethodError =
  'Provide at least one contact method for the primary contact: WeChat ID, WhatsApp number, email, or phone.';

type CustomerDiverDetailsSectionProps = {
  form: UseFormReturn<BookingFormValues>;
  includesFunDive: boolean;
  getFieldError: (path: FieldPath<BookingFormValues>) => string | undefined;
};

type CustomerFieldsProps = CustomerDiverDetailsSectionProps & {
  index: number;
  contactInputProps: { 'aria-invalid'?: boolean; className?: string };
};

function CustomerFields({
  form,
  index,
  getFieldError,
  contactInputProps,
}: CustomerFieldsProps) {
  const prefix = `customers.${index}` as const;

  return (
    <>
      <BookingFormField
        id={`${prefix}.customerName`}
        label="Customer name"
        required
        error={getFieldError(`${prefix}.customerName`)}
      >
        <Input
          id={`${prefix}.customerName`}
          {...form.register(`${prefix}.customerName`)}
        />
      </BookingFormField>
      <BookingFormField id={`${prefix}.chineseName`} label="Chinese name">
        <Input
          id={`${prefix}.chineseName`}
          {...form.register(`${prefix}.chineseName`)}
        />
      </BookingFormField>
      <BookingFormField id={`${prefix}.weChatId`} label="WeChat ID">
        <Input
          id={`${prefix}.weChatId`}
          {...contactInputProps}
          {...form.register(`${prefix}.weChatId`)}
        />
      </BookingFormField>
      <BookingFormField id={`${prefix}.whatsAppNumber`} label="WhatsApp number">
        <Input
          id={`${prefix}.whatsAppNumber`}
          {...contactInputProps}
          {...form.register(`${prefix}.whatsAppNumber`)}
        />
      </BookingFormField>
      <BookingFormField id={`${prefix}.email`} label="Email">
        <Input
          id={`${prefix}.email`}
          type="email"
          {...contactInputProps}
          {...form.register(`${prefix}.email`)}
        />
      </BookingFormField>
      <BookingFormField id={`${prefix}.phone`} label="Phone">
        <Input
          id={`${prefix}.phone`}
          type="tel"
          {...contactInputProps}
          {...form.register(`${prefix}.phone`)}
        />
      </BookingFormField>
      <BookingFormField
        id={`${prefix}.hotelAtBooking`}
        label="Hotel for this booking"
      >
        <Input
          id={`${prefix}.hotelAtBooking`}
          {...form.register(`${prefix}.hotelAtBooking`)}
        />
      </BookingFormField>
      <BookingFormField
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
              values={preferredLanguageOptions}
              placeholder="Select language"
            />
          )}
        />
      </BookingFormField>
    </>
  );
}

function EquipmentFields({
  form,
  index,
}: Pick<CustomerFieldsProps, 'form' | 'index'>) {
  const prefix = `customers.${index}` as const;

  return (
    <>
      <BookingFormField
        id={`${prefix}.equipmentNeeded`}
        label="Equipment needed"
        className="grid gap-2 md:col-span-2"
      >
        <Textarea
          id={`${prefix}.equipmentNeeded`}
          {...form.register(`${prefix}.equipmentNeeded`)}
        />
      </BookingFormField>
    </>
  );
}

function CustomerNotesField({
  form,
  index,
}: Pick<CustomerFieldsProps, 'form' | 'index'>) {
  const prefix = `customers.${index}` as const;

  return (
    <BookingFormField
      id={`${prefix}.customerNotes`}
      label="Customer/diver notes"
      className="grid gap-2 md:col-span-2"
    >
      <Textarea
        id={`${prefix}.customerNotes`}
        {...form.register(`${prefix}.customerNotes`)}
      />
    </BookingFormField>
  );
}

function EquipmentSizingFields({
  form,
  index,
}: Pick<CustomerFieldsProps, 'form' | 'index'>) {
  const prefix = `customers.${index}` as const;

  return (
    <>
      <BookingFormField id={`${prefix}.heightCm`} label="Height (cm)">
        <Input
          id={`${prefix}.heightCm`}
          type="number"
          min="0"
          {...form.register(`${prefix}.heightCm`)}
        />
      </BookingFormField>
      <BookingFormField id={`${prefix}.weightKg`} label="Weight (kg)">
        <Input
          id={`${prefix}.weightKg`}
          type="number"
          min="0"
          step="0.01"
          {...form.register(`${prefix}.weightKg`)}
        />
      </BookingFormField>
      <BookingFormField id={`${prefix}.shoeSize`} label="Shoe size">
        <Input
          id={`${prefix}.shoeSize`}
          type="number"
          min="0"
          step="0.5"
          {...form.register(`${prefix}.shoeSize`)}
        />
      </BookingFormField>
    </>
  );
}

function FunDiverFields({
  form,
  index,
  getFieldError,
}: Pick<CustomerFieldsProps, 'form' | 'index' | 'getFieldError'>) {
  const prefix = `customers.${index}` as const;

  return (
    <>
      <BookingFormField
        id={`${prefix}.certificationLevel`}
        label="Certification level"
        required
        error={getFieldError(`${prefix}.certificationLevel`)}
      >
        <Input
          id={`${prefix}.certificationLevel`}
          {...form.register(`${prefix}.certificationLevel`)}
        />
      </BookingFormField>
      <BookingFormField
        id={`${prefix}.certificationAgency`}
        label="Certification agency"
      >
        <Input
          id={`${prefix}.certificationAgency`}
          {...form.register(`${prefix}.certificationAgency`)}
        />
      </BookingFormField>
      <BookingFormField
        id={`${prefix}.lastDiveDate`}
        label="Last dive date"
        error={getFieldError(`${prefix}.lastDiveDate`)}
      >
        <Input
          id={`${prefix}.lastDiveDate`}
          type="date"
          {...form.register(`${prefix}.lastDiveDate`)}
        />
      </BookingFormField>
      <BookingFormField
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
      </BookingFormField>
    </>
  );
}

export function CustomerDiverDetailsSection({
  form,
  includesFunDive,
  getFieldError,
}: CustomerDiverDetailsSectionProps) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'customers',
  });
  const customers =
    useWatch({ control: form.control, name: 'customers' }) ?? [];
  const customerError = getFieldError('customers');
  const hasPrimaryContactMethodError =
    customerError === primaryContactMethodError;

  function setPrimaryCustomer(index: number) {
    fields.forEach((_, customerIndex) => {
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
    remove(index);
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

  return (
    <BookingFormSection title="Customers / Divers">
      <div className="space-y-4 md:col-span-2">
        {fields.map((customer, index) => {
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
                  <h3 className="font-medium">Customer / diver {index + 1}</h3>
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
                  {fields.length > 1 ? (
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
                <CustomerFields
                  form={form}
                  index={index}
                  includesFunDive={includesFunDive}
                  getFieldError={getFieldError}
                  contactInputProps={contactInputProps}
                />
                <EquipmentFields form={form} index={index} />
                <CustomerNotesField form={form} index={index} />
                {includesFunDive ? (
                  <FunDiverFields
                    form={form}
                    index={index}
                    getFieldError={getFieldError}
                  />
                ) : null}
                <EquipmentSizingFields form={form} index={index} />
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
          onClick={() => append({ ...bookingCustomerDefaultValues })}
        >
          Add customer / diver
        </Button>
      </div>
    </BookingFormSection>
  );
}
