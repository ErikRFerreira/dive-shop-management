import { expect, test } from 'vitest';

import { ActivityType, PreferredLanguage } from '@/generated/prisma/enums';
import { bookingCustomerDefaultValues } from './form-values';
import { mapSelectedCustomerToBookingCustomerValues } from './customer-picker';

const selectedCustomer = {
  id: 'customer-1',
  name: 'Maria Santos',
  fullName: 'Maria Santos',
  firstName: null,
  lastName: null,
  chineseName: '玛丽亚',
  hotel: 'Ocean View',
  preferredLanguage: PreferredLanguage.ENGLISH,
  certificationLevel: 'Advanced Open Water',
  certificationAgency: 'PADI',
  lastDiveDate: '2026-06-01',
  divesLogged: 42,
  email: 'maria@example.test',
  phone: '+639171234567',
  weChatId: 'maria-wx',
  whatsAppNumber: '+639170000000',
  lastBookingDate: '2026-07-01',
  lastActivity: ActivityType.FUN_DIVE,
  bookingCount: 2,
};

test('maps a selected customer into a booking customer row', () => {
  expect(
    mapSelectedCustomerToBookingCustomerValues(
      bookingCustomerDefaultValues,
      selectedCustomer,
    ),
  ).toMatchObject({
    customerId: 'customer-1',
    customerName: 'Maria Santos',
    chineseName: '玛丽亚',
    email: 'maria@example.test',
    phone: '+639171234567',
    weChatId: 'maria-wx',
    whatsAppNumber: '+639170000000',
    hotelAtBooking: 'Ocean View',
    preferredLanguage: PreferredLanguage.ENGLISH,
    certificationLevel: 'Advanced Open Water',
    certificationAgency: 'PADI',
    lastDiveDate: '2026-06-01',
    divesLogged: '42',
  });
});

test('preserves existing booking-specific values when selecting a customer', () => {
  expect(
    mapSelectedCustomerToBookingCustomerValues(
      {
        ...bookingCustomerDefaultValues,
        hotelAtBooking: 'Different hotel',
        equipmentNeeded: 'BCD and regulator',
        customerNotes: 'Arrives early.',
        certificationLevel: 'Rescue Diver',
        certificationAgency: 'SSI',
        lastDiveDate: '2026-05-15',
        divesLogged: '75',
      },
      selectedCustomer,
    ),
  ).toMatchObject({
    customerId: 'customer-1',
    hotelAtBooking: 'Different hotel',
    equipmentNeeded: 'BCD and regulator',
    customerNotes: 'Arrives early.',
    certificationLevel: 'Rescue Diver',
    certificationAgency: 'SSI',
    lastDiveDate: '2026-05-15',
    divesLogged: '75',
  });
});
