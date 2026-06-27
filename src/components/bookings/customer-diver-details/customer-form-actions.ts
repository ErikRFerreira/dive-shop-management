import type { UseFormReturn } from 'react-hook-form';

import { mapSelectedCustomerToBookingCustomerValues } from '@/features/bookings/customer-picker';
import type { BookingFormValues } from '@/features/bookings/types';
import type { BookingCustomerPickerResult } from '@/features/customers/types';

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
