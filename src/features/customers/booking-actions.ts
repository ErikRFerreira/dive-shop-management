'use server';

import { findPotentialDuplicateCustomers } from '@/features/customers/duplicates';
import { getEligibleDuplicateCustomerLookupInput } from '@/features/customers/duplicate-lookup-rules';
import { searchCustomers } from '@/features/customers/queries';
import type {
  BookingCustomerPickerResult,
  CustomerSearchResult,
  PotentialDuplicateBookingCustomer,
  PotentialDuplicateCustomerInput,
} from '@/features/customers/types';
import { requireCurrentUser } from '@/lib/current-user';
import { requireDashboardRouteAccess } from '@/lib/require-dashboard-route-access';

/**
 * Converts a date returned by customer search into a browser form date string.
 *
 * @param value - Nullable date from customer search or duplicate detection.
 * @returns `YYYY-MM-DD` text for form defaults, or `null` when no date exists.
 */
function formDate(value: Date | null) {
  return value ? value.toISOString().slice(0, 10) : null;
}

/**
 * Verifies that the current user may use customer lookup from booking forms.
 *
 * @returns A promise that resolves after authentication and route access pass.
 */
async function requireBookingCustomerLookupAccess() {
  const currentUser = await requireCurrentUser();
  requireDashboardRouteAccess(currentUser, 'bookings');
}

/**
 * Converts a customer search result into a Server Action serializable picker row.
 *
 * @param customer - Customer search result containing possible Date instances.
 * @returns Picker-safe customer data with dates represented as strings.
 */
function mapBookingCustomerPickerResult(
  customer: CustomerSearchResult,
): BookingCustomerPickerResult {
  return {
    ...customer,
    lastDiveDate: formDate(customer.lastDiveDate),
    lastBookingDate: formDate(customer.lastBookingDate),
  };
}

/**
 * Searches existing customers for use inside booking create/edit forms.
 *
 * @param query - Staff-entered search text.
 * @returns Matching customers in a browser-safe picker shape.
 */
export async function searchBookingCustomers(
  query: string,
): Promise<BookingCustomerPickerResult[]> {
  await requireBookingCustomerLookupAccess();

  const customers = await searchCustomers(query);
  return customers.map(mapBookingCustomerPickerResult);
}

/**
 * Finds strong duplicate customer matches for a manually entered booking row.
 *
 * @param input - Customer identity fields from the booking form row.
 * @returns Strong duplicate matches in a browser-safe picker shape.
 */
export async function findBookingCustomerDuplicates(
  input: PotentialDuplicateCustomerInput,
): Promise<PotentialDuplicateBookingCustomer[]> {
  await requireBookingCustomerLookupAccess();

  const eligibleInput = getEligibleDuplicateCustomerLookupInput(input);
  if (!eligibleInput) {
    return [];
  }

  const customers = await findPotentialDuplicateCustomers(eligibleInput);
  return customers.map((customer) => ({
    ...mapBookingCustomerPickerResult(customer),
    matchedFields: customer.matchedFields,
  }));
}
