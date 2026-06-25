/** Booking feature types shared by the intake form, validation, and queries. */

import {
  ActivityType,
  BookingCustomerRole,
  BookingSource,
  BookingStatus,
  Currency,
  DepositStatus,
  PreferredLanguage,
} from '@/generated/prisma/enums';

export const bookingStatusFilters = [
  BookingStatus.DRAFT,
  BookingStatus.PENDING_APPROVAL,
  BookingStatus.NEEDS_MORE_INFO,
  BookingStatus.APPROVED,
  BookingStatus.CANCELLED,
] as const;

export type BookingStatusFilter = (typeof bookingStatusFilters)[number];

export type BookingRequestFilter = {
  status?: BookingStatusFilter;
  createdById?: string;
  id?: { in: string[] };
};

/** Browser values for one requested activity. */
export type BookingActivityFormValues = {
  activityType: ActivityType | '';
  specialtyCourse: string;
  requestedDate: string;
  requestedTime: string;
  notes: string;
};

/** Browser values for one customer or diver in a booking. */
export type BookingCustomerFormValues = {
  /** Existing customer ID when editing an already-linked customer. */
  customerId?: string;
  role: BookingCustomerRole;
  customerName: string;
  chineseName: string;
  weChatId: string;
  whatsAppNumber: string;
  email: string;
  phone: string;
  hotelAtBooking: string;
  equipmentNeeded: string;
  customerNotes: string;
  preferredLanguage: PreferredLanguage | '';
  heightCm: string;
  weightKg: string;
  shoeSize: string;
  certificationLevel: string;
  certificationAgency: string;
  lastDiveDate: string;
  divesLogged: string;
};

/** Values managed by the new-booking React Hook Form instance. */
export type BookingFormValues = {
  rawBookingText: string;
  activities: BookingActivityFormValues[];
  numberOfPeople: string;
  source: BookingSource | '';
  referrerName: string;
  internalNotes: string;
  customers: BookingCustomerFormValues[];
  depositStatus: DepositStatus;
  amount: string;
  currency: Currency | '';
  paidTo: string;
  paymentMethod: string;
  paymentNotes: string;
};

export type NormalizedBookingActivityFormValues = {
  activityType: ActivityType | null;
  specialtyCourse: string | null;
  requestedDate: Date | null;
  requestedTime: string | null;
  notes: string | null;
};

export type NormalizedBookingCustomerFormValues = {
  customerId?: string;
  role: BookingCustomerRole;
  customerName: string | null;
  chineseName: string | null;
  weChatId: string | null;
  whatsAppNumber: string | null;
  email: string | null;
  phone: string | null;
  hotelAtBooking: string | null;
  equipmentNeeded: string | null;
  customerNotes: string | null;
  preferredLanguage: PreferredLanguage | null;
  heightCm: number | null;
  weightKg: number | null;
  shoeSize: number | null;
  certificationLevel: string | null;
  certificationAgency: string | null;
  lastDiveDate: Date | null;
  divesLogged: number | null;
};

/** Intake values after conversion to database-friendly nullable types. */
export type NormalizedBookingFormValues = {
  rawBookingText: string | null;
  activities: NormalizedBookingActivityFormValues[];
  numberOfPeople: number | null;
  source: BookingSource | null;
  referrerName: string | null;
  internalNotes: string | null;
  customers: NormalizedBookingCustomerFormValues[];
  depositStatus: DepositStatus;
  amount: number | null;
  currency: Currency | null;
  paidTo: string | null;
  paymentMethod: string | null;
  paymentNotes: string | null;
};
