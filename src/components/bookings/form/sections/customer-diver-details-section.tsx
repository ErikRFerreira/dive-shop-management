import { useCallback, useState } from 'react';
import {
  useFieldArray,
  useWatch,
  type FieldPath,
  type UseFormReturn,
} from 'react-hook-form';

import { CustomerDiverRow } from '@/components/bookings/form/customer-diver-details/customer-diver-row';
import { createNewCustomerInstead } from '@/components/bookings/form/customer-diver-details/customer-form-actions';
import { BookingFormSection } from '@/components/bookings/form/booking-form-section';
import { Button } from '@/components/ui/button';
import { duplicateInputFromBookingCustomer } from '@/features/bookings/customer-duplicate-input';
import { bookingCustomerDefaultValues } from '@/features/bookings/form-values';
import type { BookingFormValues } from '@/features/bookings/types';
import { primaryContactMethodError } from '@/features/bookings/validation-messages';
import {
  getDuplicateCustomerIdentitySnapshot,
  type DuplicateCustomerIdentitySnapshot,
} from '@/features/customers/duplicate-lookup-rules';
import { BookingCustomerRole } from '@/generated/prisma/enums';
import { Plus } from 'lucide-react';

type CustomerDiverDetailsSectionProps = {
  form: UseFormReturn<BookingFormValues>;
  includesFunDive: boolean;
  getFieldError: (path: FieldPath<BookingFormValues>) => string | undefined;
};

type ContactInputProps = { 'aria-invalid'?: boolean; className?: string };

type SuppressedDuplicateSnapshots = Record<
  string,
  DuplicateCustomerIdentitySnapshot
>;

/**
 * Renders the repeatable customers and divers intake section.
 *
 * @param props - Form state, fun-dive flag, and field error lookup.
 * @returns Customer/diver rows with search, contact, equipment, and dive details.
 */
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
  const selectedCustomerIds = customers.flatMap((customer) =>
    customer.customerId ? [customer.customerId] : [],
  );
  const customerError = getFieldError('customers');
  const hasPrimaryContactMethodError =
    customerError === primaryContactMethodError;
  const [suppressedDuplicateSnapshots, setSuppressedDuplicateSnapshots] =
    useState<SuppressedDuplicateSnapshots>({});

  const clearSuppressedDuplicateSnapshot = useCallback((rowId: string) => {
    setSuppressedDuplicateSnapshots((currentSnapshots) => {
      if (!currentSnapshots[rowId]) {
        return currentSnapshots;
      }

      const nextSnapshots = { ...currentSnapshots };
      delete nextSnapshots[rowId];
      return nextSnapshots;
    });
  }, []);

  const suppressCurrentDuplicateSnapshot = useCallback(
    (rowId: string, index: number) => {
      const currentCustomer = form.getValues(`customers.${index}`);

      setSuppressedDuplicateSnapshots((currentSnapshots) => ({
        ...currentSnapshots,
        [rowId]: getDuplicateCustomerIdentitySnapshot(
          duplicateInputFromBookingCustomer(currentCustomer),
        ),
      }));
    },
    [form],
  );

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
    const removedRowId = fields[index]?.id;
    if (removedRowId) {
      clearSuppressedDuplicateSnapshot(removedRowId);
    }

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

  function createNewCustomerForRow(rowId: string, index: number) {
    suppressCurrentDuplicateSnapshot(rowId, index);
    createNewCustomerInstead(form, index);
  }

  return (
    <BookingFormSection
      sectionNumber={4}
      title="Customers & divers"
      description="Add the primary contact and any other divers or students in the booking."
    >
      <div className="space-y-4 md:col-span-2">
        {fields.map((customer, index) => {
          const isPrimaryContact =
            customers[index]?.role === BookingCustomerRole.PRIMARY_CONTACT;
          const isExistingCustomer = Boolean(customers[index]?.customerId);
          const otherSelectedCustomerIds = selectedCustomerIds.filter(
            (customerId) => customerId !== customers[index]?.customerId,
          );
          const contactInputProps: ContactInputProps =
            isPrimaryContact && hasPrimaryContactMethodError
              ? {
                  'aria-invalid': true,
                  className:
                    'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20',
                }
              : {};

          return (
            <CustomerDiverRow
              key={customer.id}
              form={form}
              index={index}
              rowId={customer.id}
              rowCount={fields.length}
              includesFunDive={includesFunDive}
              isPrimaryContact={isPrimaryContact}
              isExistingCustomer={isExistingCustomer}
              selectedCustomerIds={otherSelectedCustomerIds}
              contactInputProps={contactInputProps}
              suppressedDuplicateSnapshot={
                suppressedDuplicateSnapshots[customer.id]
              }
              getFieldError={getFieldError}
              onSetPrimary={setPrimaryCustomer}
              onRemove={removeCustomerAndKeepPrimary}
              onCreateNewInstead={createNewCustomerForRow}
              onDuplicateIdentityEdited={clearSuppressedDuplicateSnapshot}
            />
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
          <Plus className="h-4 w-4" />
          Add customer / diver
        </Button>
      </div>
    </BookingFormSection>
  );
}
