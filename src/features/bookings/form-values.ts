/** Default browser values for booking intake forms. */

import { BookingCustomerRole, DepositStatus } from '@/generated/prisma/enums';
import type {
  BookingActivityFormValues,
  BookingCustomerFormValues,
  BookingFormValues,
} from './types';

export const bookingActivityDefaultValues: BookingActivityFormValues = {
  activityType: '',
  specialtyCourse: '',
  requestedDate: '',
  requestedTime: '',
  notes: '',
};

export const bookingCustomerDefaultValues: BookingCustomerFormValues = {
  role: BookingCustomerRole.PARTICIPANT,
  customerName: '',
  chineseName: '',
  weChatId: '',
  whatsAppNumber: '',
  email: '',
  phone: '',
  hotelAtBooking: '',
  equipmentNeeded: '',
  customerNotes: '',
  preferredLanguage: '',
  heightCm: '',
  weightKg: '',
  shoeSize: '',
  certificationLevel: '',
  certificationAgency: '',
  lastDiveDate: '',
  divesLogged: '',
};

export const bookingFormDefaultValues: BookingFormValues = {
  rawBookingText: '',
  activities: [{ ...bookingActivityDefaultValues }],
  numberOfPeople: '',
  source: '',
  referrerName: '',
  internalNotes: '',
  customers: [
    {
      ...bookingCustomerDefaultValues,
      role: BookingCustomerRole.PRIMARY_CONTACT,
    },
  ],
  depositStatus: DepositStatus.UNKNOWN,
  amount: '',
  currency: '',
  paidTo: '',
  paymentMethod: '',
  paymentNotes: '',
};
