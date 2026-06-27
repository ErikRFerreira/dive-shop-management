import type { PotentialDuplicateCustomerInput } from '@/features/customers/types';

import type { BookingFormValues } from './types';

type BookingCustomerDuplicateInputValues = Partial<
  Pick<
    BookingFormValues['customers'][number],
    | 'customerName'
    | 'chineseName'
    | 'weChatId'
    | 'whatsAppNumber'
    | 'email'
    | 'phone'
  >
>;

export function duplicateInputFromBookingCustomer(
  customer: BookingCustomerDuplicateInputValues | undefined,
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
