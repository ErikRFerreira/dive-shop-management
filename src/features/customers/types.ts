import {
  ActivityType,
  BookingCustomerRole,
  BookingSource,
  BookingStatus,
  PreferredLanguage,
} from '@/generated/prisma/enums';

export type CustomerSearchResult = {
  id: string;
  name: string;
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
  chineseName: string | null;
  hotel: string | null;
  preferredLanguage: PreferredLanguage | null;
  certificationLevel: string | null;
  certificationAgency: string | null;
  lastDiveDate: Date | null;
  divesLogged: number | null;
  email: string | null;
  phone: string | null;
  weChatId: string | null;
  whatsAppNumber: string | null;
  lastBookingDate: Date | null;
  lastActivity: ActivityType | null;
  bookingCount: number;
};

export type DuplicateCustomerMatchField =
  | 'weChatId'
  | 'whatsAppNumber'
  | 'email'
  | 'phone'
  | 'nameAndChineseName';

export type PotentialDuplicateCustomerInput = {
  excludeCustomerId?: string | null;
  name?: string | null;
  chineseName?: string | null;
  weChatId?: string | null;
  whatsAppNumber?: string | null;
  email?: string | null;
  phone?: string | null;
};

export type PotentialDuplicateCustomer = CustomerSearchResult & {
  matchedFields: DuplicateCustomerMatchField[];
};

export type BookingCustomerPickerResult = Omit<
  CustomerSearchResult,
  'lastDiveDate' | 'lastBookingDate'
> & {
  lastDiveDate: string | null;
  lastBookingDate: string | null;
};

export type PotentialDuplicateBookingCustomer = BookingCustomerPickerResult & {
  matchedFields: DuplicateCustomerMatchField[];
};

export type CustomerDiveInfo = {
  certificationLevel: string | null;
  certificationAgency: string | null;
  lastDiveDate: Date | null;
  divesLogged: number | null;
  heightCm: number | null;
  weightKg: string | null;
  shoeSize: string | null;
  equipmentNotes: string | null;
};

export type CustomerBookingHistoryItem = {
  bookingId: string;
  status: BookingStatus;
  date: Date | null;
  requestedDate: Date | null;
  requestedTime: string | null;
  scheduledDate: Date | null;
  scheduledTime: string | null;
  activityType: ActivityType | null;
  activities: Array<{
    activityType: ActivityType | null;
    requestedDate: Date | null;
    requestedTime: string | null;
  }>;
  role: BookingCustomerRole;
  isPrimaryContact: boolean;
  numberOfPeople: number | null;
  source: BookingSource | null;
  referrerName: string | null;
  hotelAtBooking: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CustomerDetail = {
  id: string;
  name: string;
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
  chineseName: string | null;
  weChatId: string | null;
  whatsAppNumber: string | null;
  email: string | null;
  phone: string | null;
  hotel: string | null;
  preferredLanguage: PreferredLanguage | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  diveInfo: CustomerDiveInfo;
  bookingHistory: CustomerBookingHistoryItem[];
};
