import { expect, test } from 'vitest';

import { bookingCustomerDefaultValues } from './form-values';
import { duplicateInputFromBookingCustomer } from './customer-duplicate-input';

test('maps booking customer identity fields into duplicate lookup input', () => {
  expect(
    duplicateInputFromBookingCustomer({
      ...bookingCustomerDefaultValues,
      customerName: 'Maria Santos',
      chineseName: 'Ma Li',
      weChatId: 'maria-wx',
      whatsAppNumber: '+639170000000',
      email: 'maria@example.test',
      phone: '+639171234567',
      hotelAtBooking: 'Ocean View',
      certificationLevel: 'Advanced Open Water',
    }),
  ).toEqual({
    name: 'Maria Santos',
    chineseName: 'Ma Li',
    weChatId: 'maria-wx',
    whatsAppNumber: '+639170000000',
    email: 'maria@example.test',
    phone: '+639171234567',
  });
});
