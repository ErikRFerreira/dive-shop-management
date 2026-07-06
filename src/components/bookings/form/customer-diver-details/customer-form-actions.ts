import type { UseFormReturn } from 'react-hook-form';

import { mapSelectedCustomerToBookingCustomerValues } from '@/features/bookings/customer-picker';
import type { BookingFormValues } from '@/features/bookings/types';
import type { BookingCustomerPickerResult } from '@/features/customers/types';

/**
 * Replaces one booking customer row with values from a linked customer profile.
 *
 * @param form - React Hook Form instance for the booking intake form.
 * @param index - Customer/diver row index to replace.
 * @param customer - Existing customer selected by staff.
 */
export function applyExistingCustomer(
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
 * Unlinks an existing customer row while preserving its booking-specific values.
 *
 * @param form - React Hook Form instance for the booking intake form.
 * @param index - Customer/diver row index to unlink from the reusable customer record.
 */
export function createNewCustomerInstead(
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
