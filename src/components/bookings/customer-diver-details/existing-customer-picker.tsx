import { useState } from 'react';
import { useWatch, type UseFormReturn } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { BookingFormValues } from '@/features/bookings/types';
import { searchBookingCustomers } from '@/features/customers/booking-actions';
import type { BookingCustomerPickerResult } from '@/features/customers/types';

import { applyExistingCustomer } from './customer-form-actions';

function pickerValue(value: string | number | null | undefined) {
  return value === null || value === undefined || value === '' ? '-' : value;
}

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

export function CustomerPicker({
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

export function SelectedBookingCustomer({
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
