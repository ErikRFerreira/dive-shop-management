import type { FieldPath, UseFormReturn } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import type { BookingFormValues } from '@/features/bookings/types';
import type { DuplicateCustomerIdentitySnapshot } from '@/features/customers/duplicate-lookup-rules';

import {
  CustomerFields,
  CustomerNotesField,
  DivingExperienceFields,
  EquipmentSizingFields,
} from './customer-fields';
import { PotentialDuplicateCustomerWarning } from './duplicate-customer-warning';
import {
  CustomerPicker,
  SelectedBookingCustomer,
} from './existing-customer-picker';
import { Trash2, UserRound } from 'lucide-react';

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

/**
 * Renders one booking customer/diver intake card.
 *
 * @param props - Row state, duplicate handling callbacks, and form helpers.
 * @returns A customer/diver row with contact, equipment, and dive details.
 */
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
    <div className="rounded-xl border border-border bg-muted/30">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4 p-4 border-b border-border">
        <div className="">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-full bg-ocean/10 text-ocean ring-1 ring-inset ring-ocean/20">
              <UserRound className="size-4" />
            </span>
            <h3 className="font-medium">Customer / diver {index + 1}</h3>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label
            htmlFor={`${prefix}.primaryContact`}
            className={
              isPrimaryContact
                ? 'cursor-pointer rounded-full bg-primary/10 px-2 py-0.5 text-[0.68rem] font-semibold text-primary ring-1 ring-inset ring-primary/20'
                : 'text-muted-foreground rounded-full hover:text-foreground cursor-pointer px-2 py-0.5 text-[0.68rem] font-semibold'
            }
          >
            <input
              id={`${prefix}.primaryContact`}
              type="checkbox"
              checked={isPrimaryContact}
              onChange={() => onSetPrimary(index)}
              className="sr-only"
            />
            {isPrimaryContact ? 'Primary contact' : 'Set as primary contact'}
          </label>

          {rowCount > 1 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onRemove(index)}
            >
              <Trash2 className="size-4" />
              Remove
            </Button>
          ) : null}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 p-4">
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
        <DivingExperienceFields
          form={form}
          index={index}
          requiresDivingExperience={includesFunDive}
          getFieldError={getFieldError}
        />
        <EquipmentSizingFields form={form} index={index} />
        <CustomerNotesField form={form} index={index} />
      </div>
    </div>
  );
}
