import { useCallback, useEffect, useId, useState } from 'react';
import {
  Controller,
  useFieldArray,
  useWatch,
  type FieldPath,
  type UseFormReturn,
} from 'react-hook-form';
import { XIcon } from 'lucide-react';
import { toast } from 'sonner';

import { BookingFormSection } from '@/components/bookings/booking-form-section';
import {
  BookingFormField,
  EnumSelect,
} from '@/components/bookings/booking-form-controls';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  formatEnumLabel,
  preferredLanguageOptions,
} from '@/features/bookings/form-options';
import { mapSelectedCustomerToBookingCustomerValues } from '@/features/bookings/customer-picker';
import { bookingCustomerDefaultValues } from '@/features/bookings/form-values';
import type { BookingFormValues } from '@/features/bookings/types';
import {
  findBookingCustomerDuplicates,
  searchBookingCustomers,
} from '@/features/customers/booking-actions';
import {
  areDuplicateCustomerIdentitySnapshotsEqual,
  getDuplicateCustomerIdentitySnapshot,
  getEligibleDuplicateCustomerLookupInput,
  type DuplicateCustomerIdentitySnapshot,
} from '@/features/customers/duplicate-lookup-rules';
import type {
  BookingCustomerPickerResult,
  PotentialDuplicateBookingCustomer,
  PotentialDuplicateCustomerInput,
} from '@/features/customers/types';
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
  isExistingCustomer: boolean;
};

type SuppressedDuplicateSnapshots = Record<
  string,
  DuplicateCustomerIdentitySnapshot
>;

/**
 * Formats a nullable field for compact customer picker display.
 *
 * @param value - Optional value from a customer search result.
 * @returns Display text for the picker summary.
 */
function pickerValue(value: string | number | null | undefined) {
  return value === null || value === undefined || value === '' ? '-' : value;
}

/**
 * Formats duplicate match field identifiers for staff-facing warning text.
 *
 * @param fields - Strong duplicate fields returned by duplicate detection.
 * @returns Human-readable labels for matched fields.
 */
function formatMatchedFields(
  fields: PotentialDuplicateBookingCustomer['matchedFields'],
) {
  const labels: Record<
    PotentialDuplicateBookingCustomer['matchedFields'][number],
    string
  > = {
    weChatId: 'WeChat ID',
    whatsAppNumber: 'WhatsApp number',
    email: 'email',
    phone: 'phone',
    nameAndChineseName: 'name and Chinese name',
  };

  return fields.map((field) => labels[field]).join(', ');
}

/**
 * Applies a selected existing customer to one booking customer row.
 *
 * @param form - Booking form instance that owns the customer array.
 * @param index - Customer row index to update.
 * @param customer - Existing customer selected from search or duplicate warning.
 */
function applyExistingCustomer(
  form: UseFormReturn<BookingFormValues>,
  index: number,
  customer: BookingCustomerPickerResult,
) {
  const currentValues = form.getValues(`customers.${index}`);

  form.setValue(
    `customers.${index}`,
    mapSelectedCustomerToBookingCustomerValues(currentValues, customer),
    { shouldDirty: true, shouldValidate: true },
  );
}

/**
 * Clears the existing-customer link for one customer row.
 *
 * @param form - Booking form instance that owns the customer array.
 * @param index - Customer row index to update.
 */
function createNewCustomerInstead(
  form: UseFormReturn<BookingFormValues>,
  index: number,
) {
  const currentValues = form.getValues(`customers.${index}`);

  form.setValue(
    `customers.${index}`,
    {
      ...currentValues,
      customerId: undefined,
    },
    { shouldDirty: true, shouldValidate: true },
  );
}

/**
 * Renders one customer search result with an action to link it to the form.
 *
 * @param props - Customer result and selection callback.
 * @returns A compact selectable customer summary.
 */
function CustomerPickerResult({
  customer,
  onUseCustomer,
}: {
  customer: BookingCustomerPickerResult;
  onUseCustomer: (customer: BookingCustomerPickerResult) => void;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 rounded-md border p-3">
      <div>
        <p className="font-medium">{customer.name}</p>
        <p className="text-sm text-muted-foreground">
          WeChat: {pickerValue(customer.weChatId)} - WhatsApp:{' '}
          {pickerValue(customer.whatsAppNumber)} - Email:{' '}
          {pickerValue(customer.email)}
        </p>
        <p className="text-sm text-muted-foreground">
          Cert: {pickerValue(customer.certificationLevel)} - Last dive:{' '}
          {pickerValue(customer.lastDiveDate)} - Logged dives:{' '}
          {pickerValue(customer.divesLogged)}
        </p>
      </div>
      <Button type="button" size="sm" onClick={() => onUseCustomer(customer)}>
        Use this customer
      </Button>
    </div>
  );
}

/**
 * Renders the search control used to attach an existing customer to a row.
 *
 * @param props - Booking form, row index, and selected IDs in other rows.
 * @returns Existing-customer picker UI for one booking customer row.
 */
function CustomerPicker({
  form,
  index,
  selectedCustomerIds,
}: {
  form: UseFormReturn<BookingFormValues>;
  index: number;
  selectedCustomerIds: string[];
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<BookingCustomerPickerResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  /**
   * Searches customers and stores selectable results for this row.
   */
  async function searchExistingCustomers() {
    const normalizedQuery = query.trim();

    if (!normalizedQuery) {
      setResults([]);
      setSearchError(null);
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      const customers = await searchBookingCustomers(normalizedQuery);
      const selectedCustomerIdSet = new Set(selectedCustomerIds);
      setResults(
        customers.filter((customer) => !selectedCustomerIdSet.has(customer.id)),
      );
    } catch {
      setSearchError('Customer search failed. Try again.');
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <div className="space-y-3 rounded-md border bg-muted/20 p-3 md:col-span-2">
      <div className="flex flex-wrap gap-2">
        <div className="min-w-64 flex-1">
          <label className="sr-only" htmlFor={`customer-picker-${index}`}>
            Search existing customers
          </label>
          <Input
            id={`customer-picker-${index}`}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                void searchExistingCustomers();
              }
            }}
            placeholder="Search existing customers"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => void searchExistingCustomers()}
          disabled={isSearching}
        >
          {isSearching ? 'Searching...' : 'Search'}
        </Button>
      </div>
      {searchError ? (
        <p className="text-sm text-destructive" role="alert">
          {searchError}
        </p>
      ) : null}
      {results.length > 0 ? (
        <div className="space-y-2">
          {results.map((customer) => (
            <CustomerPickerResult
              customer={customer}
              key={customer.id}
              onUseCustomer={(selectedCustomer) =>
                applyExistingCustomer(form, index, selectedCustomer)
              }
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Renders duplicate customer actions inside a Sonner toast.
 *
 * @param props - Duplicate matches and selection/dismiss callbacks.
 * @returns Toast content for possible existing customer matches.
 */
function DuplicateCustomerToastContent({
  duplicates,
  onDismiss,
  onUseCustomer,
}: {
  duplicates: PotentialDuplicateBookingCustomer[];
  onDismiss: () => void;
  onUseCustomer: (customer: PotentialDuplicateBookingCustomer) => void;
}) {
  return (
    <div className="grid w-full gap-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="font-medium">Possible existing customer</p>
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          className="text-amber-950 hover:bg-amber-100"
          aria-label="Dismiss possible existing customer notice"
          onClick={onDismiss}
        >
          <XIcon />
        </Button>
      </div>
      <div className="grid gap-2">
        {duplicates.map((duplicate) => (
          <div
            className="flex flex-wrap items-center justify-between gap-3"
            key={duplicate.id}
          >
            <p>
              {duplicate.name} matches by{' '}
              {formatMatchedFields(duplicate.matchedFields)}.
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="bg-background"
              onClick={() => onUseCustomer(duplicate)}
            >
              Use this customer
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Builds duplicate lookup input from a booking customer row.
 *
 * @param customer - Current customer row values.
 * @returns Duplicate lookup identity input.
 */
function duplicateInputFromBookingCustomer(
  customer: BookingFormValues['customers'][number] | undefined,
): PotentialDuplicateCustomerInput {
  return {
    name: customer?.customerName,
    chineseName: customer?.chineseName,
    weChatId: customer?.weChatId,
    whatsAppNumber: customer?.whatsAppNumber,
    email: customer?.email,
    phone: customer?.phone,
  };
}

/**
 * Warns staff when manual customer details strongly match an existing customer.
 *
 * @param props - Booking form, row index, and selected IDs in other rows.
 * @returns Duplicate warning UI for manually entered customer rows.
 */
function PotentialDuplicateCustomerWarning({
  form,
  index,
  rowId,
  selectedCustomerIds,
  suppressedDuplicateSnapshot,
  onDuplicateIdentityEdited,
}: {
  form: UseFormReturn<BookingFormValues>;
  index: number;
  rowId: string;
  selectedCustomerIds: string[];
  suppressedDuplicateSnapshot?: DuplicateCustomerIdentitySnapshot;
  onDuplicateIdentityEdited: (rowId: string) => void;
}) {
  const customer = useWatch({
    control: form.control,
    name: `customers.${index}`,
  });
  const [duplicates, setDuplicates] = useState<
    PotentialDuplicateBookingCustomer[]
  >([]);
  const duplicateToastId = useId();

  useEffect(() => {
    let isCurrent = true;
    const duplicateInput = duplicateInputFromBookingCustomer(customer);
    const duplicateIdentitySnapshot =
      getDuplicateCustomerIdentitySnapshot(duplicateInput);
    const isSuppressedDuplicateSnapshot =
      suppressedDuplicateSnapshot &&
      areDuplicateCustomerIdentitySnapshotsEqual(
        duplicateIdentitySnapshot,
        suppressedDuplicateSnapshot,
      );
    const eligibleDuplicateInput =
      getEligibleDuplicateCustomerLookupInput(duplicateInput);
    const shouldSearchForDuplicates =
      Boolean(customer) &&
      !customer?.customerId &&
      !isSuppressedDuplicateSnapshot;

    if (suppressedDuplicateSnapshot && !isSuppressedDuplicateSnapshot) {
      onDuplicateIdentityEdited(rowId);
    }

    if (!shouldSearchForDuplicates || !eligibleDuplicateInput) {
      const clearTimeoutId = window.setTimeout(() => {
        if (isCurrent) {
          setDuplicates([]);
        }
      }, 0);

      return () => {
        isCurrent = false;
        window.clearTimeout(clearTimeoutId);
      };
    }

    const timeoutId = window.setTimeout(() => {
      void findBookingCustomerDuplicates(eligibleDuplicateInput)
        .then((matches) => {
          if (!isCurrent) return;

          const selectedCustomerIdSet = new Set(selectedCustomerIds);
          setDuplicates(
            matches.filter(
              (match) => !selectedCustomerIdSet.has(match.id),
            ),
          );
        })
        .catch(() => {
          if (isCurrent) {
            setDuplicates([]);
          }
        });
    }, 500);

    return () => {
      isCurrent = false;
      window.clearTimeout(timeoutId);
    };
  }, [
    customer,
    customer?.chineseName,
    customer?.customerId,
    customer?.customerName,
    customer?.email,
    customer?.phone,
    customer?.weChatId,
    customer?.whatsAppNumber,
    onDuplicateIdentityEdited,
    rowId,
    selectedCustomerIds,
    suppressedDuplicateSnapshot,
  ]);

  useEffect(() => {
    const toastId = `possible-existing-customer-${duplicateToastId}`;

    if (duplicates.length === 0) {
      toast.dismiss(toastId);
      return;
    }

    toast.custom(
      () => (
        <DuplicateCustomerToastContent
          duplicates={duplicates}
          onDismiss={() => toast.dismiss(toastId)}
          onUseCustomer={(duplicate) => {
            applyExistingCustomer(form, index, duplicate);
            toast.dismiss(toastId);
          }}
        />
      ),
      {
        id: toastId,
        duration: Infinity,
        position: 'top-right',
      },
    );

    return () => {
      toast.dismiss(toastId);
    };
  }, [duplicateToastId, duplicates, form, index]);

  return null;
}

/**
 * Shows the selected existing customer link for one booking row.
 *
 * @param props - Booking form and row index to summarize.
 * @returns A compact linked-customer summary with an unlink action.
 */
function SelectedBookingCustomer({
  form,
  index,
  onCreateNewInstead,
}: {
  form: UseFormReturn<BookingFormValues>;
  index: number;
  onCreateNewInstead: () => void;
}) {
  const customer = useWatch({
    control: form.control,
    name: `customers.${index}`,
  });

  if (!customer?.customerId) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/20 p-3 md:col-span-2">
      <div>
        <p className="font-medium">Linked existing customer</p>
        <p className="text-sm text-muted-foreground">
          {customer.customerName || customer.customerId}
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onCreateNewInstead}
      >
        Create new instead
      </Button>
    </div>
  );
}

/**
 * Renders the customer identity and contact fields for one booking row.
 *
 * @param props - Booking form context and row configuration.
 * @returns Customer identity/contact inputs or read-only selected-customer data.
 */
function CustomerFields({
  form,
  index,
  getFieldError,
  contactInputProps,
  isExistingCustomer,
}: CustomerFieldsProps) {
  const prefix = `customers.${index}` as const;
  const readOnlyProps = isExistingCustomer
    ? {
        readOnly: true,
        'aria-readonly': true,
      }
    : {};

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
          {...readOnlyProps}
          {...form.register(`${prefix}.customerName`)}
        />
      </BookingFormField>
      <BookingFormField id={`${prefix}.chineseName`} label="Chinese name">
        <Input
          id={`${prefix}.chineseName`}
          {...readOnlyProps}
          {...form.register(`${prefix}.chineseName`)}
        />
      </BookingFormField>
      <BookingFormField id={`${prefix}.weChatId`} label="WeChat ID">
        <Input
          id={`${prefix}.weChatId`}
          {...readOnlyProps}
          {...contactInputProps}
          {...form.register(`${prefix}.weChatId`)}
        />
      </BookingFormField>
      <BookingFormField id={`${prefix}.whatsAppNumber`} label="WhatsApp number">
        <Input
          id={`${prefix}.whatsAppNumber`}
          {...readOnlyProps}
          {...contactInputProps}
          {...form.register(`${prefix}.whatsAppNumber`)}
        />
      </BookingFormField>
      <BookingFormField id={`${prefix}.email`} label="Email">
        <Input
          id={`${prefix}.email`}
          type="email"
          {...readOnlyProps}
          {...contactInputProps}
          {...form.register(`${prefix}.email`)}
        />
      </BookingFormField>
      <BookingFormField id={`${prefix}.phone`} label="Phone">
        <Input
          id={`${prefix}.phone`}
          type="tel"
          {...readOnlyProps}
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
        {isExistingCustomer ? (
          <div
            className="flex h-8 items-center rounded-md border bg-muted/30 px-3 text-sm"
            id={`${prefix}.preferredLanguage`}
          >
            {form.getValues(`${prefix}.preferredLanguage`)
              ? formatEnumLabel(form.getValues(`${prefix}.preferredLanguage`))
              : '-'}
          </div>
        ) : (
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
        )}
      </BookingFormField>
    </>
  );
}

/**
 * Renders equipment request fields for one booking customer.
 *
 * @param props - Booking form and customer row index.
 * @returns Equipment request field.
 */
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

/**
 * Renders booking-specific notes for one customer or diver.
 *
 * @param props - Booking form and customer row index.
 * @returns Customer notes field.
 */
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

/**
 * Renders booking-specific equipment sizing fields for one customer or diver.
 *
 * @param props - Booking form and customer row index.
 * @returns Equipment sizing fields.
 */
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

/**
 * Renders Fun Dive requirements for one customer or diver.
 *
 * @param props - Booking form context and row index.
 * @returns Fun diver fields when the booking includes a Fun Dive.
 */
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

/**
 * Renders the full customer/diver section for the booking intake form.
 *
 * @param props - Booking form context and validation helpers.
 * @returns Customer/diver rows with existing-customer selection support.
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

  return (
    <BookingFormSection title="Customers / Divers">
      <div className="space-y-4 md:col-span-2">
        {fields.map((customer, index) => {
          const prefix = `customers.${index}` as const;
          const isPrimaryContact =
            customers[index]?.role === BookingCustomerRole.PRIMARY_CONTACT;
          const isExistingCustomer = Boolean(customers[index]?.customerId);
          const otherSelectedCustomerIds = selectedCustomerIds.filter(
            (customerId) => customerId !== customers[index]?.customerId,
          );
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
                {isExistingCustomer ? (
                  <SelectedBookingCustomer
                    form={form}
                    index={index}
                    onCreateNewInstead={() => {
                      suppressCurrentDuplicateSnapshot(customer.id, index);
                      createNewCustomerInstead(form, index);
                    }}
                  />
                ) : (
                  <CustomerPicker
                    form={form}
                    index={index}
                    selectedCustomerIds={otherSelectedCustomerIds}
                  />
                )}
                <CustomerFields
                  form={form}
                  index={index}
                  includesFunDive={includesFunDive}
                  getFieldError={getFieldError}
                  contactInputProps={contactInputProps}
                  isExistingCustomer={isExistingCustomer}
                />
                <PotentialDuplicateCustomerWarning
                  form={form}
                  index={index}
                  rowId={customer.id}
                  selectedCustomerIds={otherSelectedCustomerIds}
                  suppressedDuplicateSnapshot={
                    suppressedDuplicateSnapshots[customer.id]
                  }
                  onDuplicateIdentityEdited={clearSuppressedDuplicateSnapshot}
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
