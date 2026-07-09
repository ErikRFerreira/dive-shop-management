'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  addCustomerToScheduledBooking,
  type AddScheduledBookingParticipantActionResult,
  type AddScheduledBookingParticipantValues,
} from '@/features/bookings/actions';
import { bookingCustomerDefaultValues } from '@/features/bookings/form-values';
import type { BookingDetailsItem } from '@/features/bookings/queries';
import { searchBookingCustomers } from '@/features/customers/booking-actions';
import type { BookingCustomerPickerResult } from '@/features/customers/types';
import { inputClassName } from '@/lib/consts';
import { AddScheduledBookingParticipantFields } from './add-scheduled-booking-participant-fields';

type Props = {
  booking: BookingDetailsItem;
};

type ParticipantFieldName = keyof AddScheduledBookingParticipantValues;

const blankParticipantValues: AddScheduledBookingParticipantValues = {
  customerName: bookingCustomerDefaultValues.customerName,
  chineseName: bookingCustomerDefaultValues.chineseName,
  weChatId: bookingCustomerDefaultValues.weChatId,
  whatsAppNumber: bookingCustomerDefaultValues.whatsAppNumber,
  email: bookingCustomerDefaultValues.email,
  phone: bookingCustomerDefaultValues.phone,
  hotelAtBooking: bookingCustomerDefaultValues.hotelAtBooking,
  equipmentNeeded: bookingCustomerDefaultValues.equipmentNeeded,
  customerNotes: bookingCustomerDefaultValues.customerNotes,
  preferredLanguage: bookingCustomerDefaultValues.preferredLanguage,
  heightCm: bookingCustomerDefaultValues.heightCm,
  weightKg: bookingCustomerDefaultValues.weightKg,
  shoeSize: bookingCustomerDefaultValues.shoeSize,
  certificationLevel: bookingCustomerDefaultValues.certificationLevel,
  certificationAgency: bookingCustomerDefaultValues.certificationAgency,
  lastDiveDate: bookingCustomerDefaultValues.lastDiveDate,
  divesLogged: bookingCustomerDefaultValues.divesLogged,
};

/**
 * Formats nullable picker values for compact customer search result summaries.
 *
 * @param value - Nullable customer detail value from customer search.
 * @returns A display string for the picker row.
 */
function pickerValue(value: string | number | null | undefined) {
  return value === null || value === undefined || value === '' ? '-' : value;
}

/**
 * Builds the add-participant form values from a selected existing customer.
 *
 * @param customer - Existing customer selected from booking customer search.
 * @returns Dialog form values prefilled from reusable customer data.
 */
function participantValuesFromExistingCustomer(
  customer: BookingCustomerPickerResult,
): AddScheduledBookingParticipantValues {
  return {
    ...blankParticipantValues,
    customerId: customer.id,
    customerName: customer.name,
    chineseName: customer.chineseName ?? '',
    weChatId: customer.weChatId ?? '',
    whatsAppNumber: customer.whatsAppNumber ?? '',
    email: customer.email ?? '',
    phone: customer.phone ?? '',
    hotelAtBooking: customer.hotel ?? '',
    preferredLanguage: customer.preferredLanguage ?? '',
    certificationLevel: customer.certificationLevel ?? '',
    certificationAgency: customer.certificationAgency ?? '',
    lastDiveDate: customer.lastDiveDate ?? '',
    divesLogged: customer.divesLogged?.toString() ?? '',
  };
}

/**
 * Returns the first validation or form-level error from the add-participant action.
 *
 * @param result - Failed add-participant action result.
 * @returns Staff-facing error message.
 */
function getAddParticipantErrorMessage(
  result: Extract<AddScheduledBookingParticipantActionResult, { success: false }>,
) {
  const fieldError = result.fieldErrors
    ? Object.values(result.fieldErrors).flat()[0]
    : undefined;

  return result.formError ?? fieldError ?? 'Unable to add participant.';
}

/**
 * Renders one existing customer result inside the add-participant dialog.
 *
 * @param props - Search result and selection callback.
 * @returns Search result row.
 */
function CustomerSearchResult({
  customer,
  onSelect,
}: {
  customer: BookingCustomerPickerResult;
  onSelect: (customer: BookingCustomerPickerResult) => void;
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
      <Button type="button" size="sm" onClick={() => onSelect(customer)}>
        Use customer
      </Button>
    </div>
  );
}

/**
 * Renders the admin/manager dialog for appending one active scheduled participant.
 *
 * @param props - Scheduled booking detail data, including attached customer IDs.
 * @returns Add customer/diver dialog trigger and content.
 */
export function AddScheduledBookingParticipantDialog({ booking }: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [values, setValues] =
    useState<AddScheduledBookingParticipantValues>(blankParticipantValues);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<BookingCustomerPickerResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState<string>();
  const [submitError, setSubmitError] = useState<string>();
  const [isSearching, setIsSearching] = useState(false);
  const [isPending, startTransition] = useTransition();
  const pendingSubmitRef = useRef(false);
  const attachedCustomerIds = new Set(
    booking.customers.map((customer) => customer.customerId),
  );

  /**
   * Updates one dialog form field.
   *
   * @param name - Add-participant field being edited.
   * @param value - Next browser text value.
   */
  function updateField(name: ParticipantFieldName, value: string) {
    setValues((currentValues) => ({
      ...currentValues,
      [name]: value,
    }));
  }

  /**
   * Searches reusable customer records and hides customers already attached to this booking.
   */
  async function searchExistingCustomers() {
    const normalizedQuery = query.trim();

    if (!normalizedQuery) {
      setResults([]);
      setHasSearched(false);
      setSearchError(undefined);
      return;
    }

    setIsSearching(true);
    setHasSearched(false);
    setSearchError(undefined);

    try {
      const customers = await searchBookingCustomers(normalizedQuery);
      setResults(
        customers.filter((customer) => !attachedCustomerIds.has(customer.id)),
      );
      setHasSearched(true);
    } catch {
      setSearchError('Customer search failed. Try again.');
    } finally {
      setIsSearching(false);
    }
  }

  /**
   * Selects one existing customer and prefills the add-participant form.
   *
   * @param customer - Existing customer selected from search results.
   */
  function selectExistingCustomer(customer: BookingCustomerPickerResult) {
    setValues(participantValuesFromExistingCustomer(customer));
    setSubmitError(undefined);
  }

  /**
   * Resets the dialog to a new-customer form state.
   */
  function createNewInstead() {
    setValues(blankParticipantValues);
    setSubmitError(undefined);
  }

  /**
   * Submits the selected or manually entered participant to the server action.
   */
  function submitParticipant() {
    if (pendingSubmitRef.current || isPending) return;

    pendingSubmitRef.current = true;
    setSubmitError(undefined);
    startTransition(async () => {
      try {
        const result = await addCustomerToScheduledBooking(booking.id, values);

        if (result.success) {
          setIsOpen(false);
          setValues(blankParticipantValues);
          setQuery('');
          setResults([]);
          setHasSearched(false);
          router.refresh();
          return;
        }

        setSubmitError(getAddParticipantErrorMessage(result));
      } finally {
        pendingSubmitRef.current = false;
      }
    });
  }

  const isExistingCustomer = Boolean(values.customerId);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Plus />
          Add customer / diver
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add customer / diver</DialogTitle>
          <DialogDescription>
            Add one active participant to this scheduled booking.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-3 rounded-lg border p-3">
            <Label htmlFor="scheduled-participant-search">
              Search existing customers
            </Label>
            <div className="flex flex-wrap gap-2">
              <div className="min-w-56 flex-1">
                <Input
                  id="scheduled-participant-search"
                  className={inputClassName}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      void searchExistingCustomers();
                    }
                  }}
                  type="search"
                  value={query}
                  placeholder="Search by name, WeChat, WhatsApp, email, or phone"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => void searchExistingCustomers()}
                disabled={isSearching}
              >
                <Search />
                {isSearching ? 'Searching...' : 'Search'}
              </Button>
            </div>
            {searchError ? (
              <p className="text-sm text-destructive" role="alert">
                {searchError}
              </p>
            ) : null}
            {hasSearched && !isSearching && !searchError && results.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No available customers found.
              </p>
            ) : null}
            {results.length > 0 ? (
              <div className="space-y-2">
                {results.map((customer) => (
                  <CustomerSearchResult
                    customer={customer}
                    key={customer.id}
                    onSelect={selectExistingCustomer}
                  />
                ))}
              </div>
            ) : null}
          </div>

          <AddScheduledBookingParticipantFields
            isExistingCustomer={isExistingCustomer}
            onCreateNewInstead={createNewInstead}
            onFieldChange={updateField}
            values={values}
          />

          {submitError ? (
            <p className="text-sm text-destructive" role="alert">
              {submitError}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            onClick={submitParticipant}
            disabled={isPending}
          >
            {isPending ? 'Adding...' : 'Add participant'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
