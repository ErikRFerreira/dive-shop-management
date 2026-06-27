import type { FieldPath, UseFormReturn } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import type { BookingFormValues } from '@/features/bookings/types';
import type { DuplicateCustomerIdentitySnapshot } from '@/features/customers/duplicate-lookup-rules';

import {
  CustomerFields,
  CustomerNotesField,
  EquipmentFields,
  EquipmentSizingFields,
  FunDiverFields,
} from './customer-fields';
import { PotentialDuplicateCustomerWarning } from './duplicate-customer-warning';
import {
  CustomerPicker,
  SelectedBookingCustomer,
} from './existing-customer-picker';

type ContactInputProps = { 'aria-invalid'?: boolean; className?: string };

type CustomerDiverRowProps = {
  form: UseFormReturn<BookingFormValues>;
  index: number;
  rowId: string;
  rowCount: number;
  includesFunDive: boolean;
  isPrimaryContact: boolean;
  isExistingCustomer: boolean;
  selectedCustomerIds: string[];
  contactInputProps: ContactInputProps;
  suppressedDuplicateSnapshot?: DuplicateCustomerIdentitySnapshot;
  getFieldError: (path: FieldPath<BookingFormValues>) => string | undefined;
  onSetPrimary: (index: number) => void;
  onRemove: (index: number) => void;
  onCreateNewInstead: (rowId: string, index: number) => void;
  onDuplicateIdentityEdited: (rowId: string) => void;
};

export function CustomerDiverRow({
  form,
  index,
  rowId,
  rowCount,
  includesFunDive,
  isPrimaryContact,
  isExistingCustomer,
  selectedCustomerIds,
  contactInputProps,
  suppressedDuplicateSnapshot,
  getFieldError,
  onSetPrimary,
  onRemove,
  onCreateNewInstead,
  onDuplicateIdentityEdited,
}: CustomerDiverRowProps) {
  const prefix = `customers.${index}` as const;

  return (
    <div className="rounded-lg border p-4">
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
              onChange={() => onSetPrimary(index)}
            />
            Primary contact
          </label>
          {rowCount > 1 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onRemove(index)}
            >
              Remove customer
            </Button>
          ) : null}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {isExistingCustomer ? (
          <SelectedBookingCustomer
            form={form}
            index={index}
            onCreateNewInstead={() => onCreateNewInstead(rowId, index)}
          />
        ) : (
          <CustomerPicker
            form={form}
            index={index}
            selectedCustomerIds={selectedCustomerIds}
          />
        )}
        <CustomerFields
          form={form}
          index={index}
          getFieldError={getFieldError}
          contactInputProps={contactInputProps}
          isExistingCustomer={isExistingCustomer}
        />
        <PotentialDuplicateCustomerWarning
          form={form}
          index={index}
          rowId={rowId}
          selectedCustomerIds={selectedCustomerIds}
          suppressedDuplicateSnapshot={suppressedDuplicateSnapshot}
          onDuplicateIdentityEdited={onDuplicateIdentityEdited}
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
}
