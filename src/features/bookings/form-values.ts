/**
 * Purpose: Defines the default values for booking-related forms, including activity and customer information.
 *
 * @module features/bookings/form-values
 */

import {
  BookingCustomerRole,
  DepositStatus,
  ScheduleTimeSlot,
} from '@/generated/prisma/enums';
import type {
  BookingActivityFormValues,
  BookingCustomerFormValues,
  BookingFormValues,
} from './types';

export const bookingActivityDefaultValues: BookingActivityFormValues = {
  activityType: '',
  specialtyCourse: '',
  durationDays: '',
  requestedDate: '',
  requestedTime: '',
  requestedTimeSlot: ScheduleTimeSlot.TBD,
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
