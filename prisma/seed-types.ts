import type {
  ActivityType,
  BookingParticipantStatus,
  BookingSource,
  BookingStatus,
  DepositStatus,
  PreferredLanguage,
  ScheduleAssignmentRole,
  ScheduleTimeSlot,
} from '../src/generated/prisma/enums';

export type DemoCustomerSeed = {
  key: string;
  profile: {
    fullName: string;
    firstName?: string;
    lastName?: string;
    chineseName?: string;
    weChatId?: string;
    whatsAppNumber?: string;
    email?: string;
    phone?: string;
    hotel?: string;
    preferredLanguage?: PreferredLanguage;
    notes?: string;
  };
  diving?: {
    certificationAgency?: string;
    certificationLevel?: string;
    lastDiveOffset?: number;
    heightCm?: number;
    weightKg?: number;
    shoeSize?: number;
    divesLogged?: number;
    equipmentNeeded?: string;
  };
};

export type DemoActivitySeed = {
  key: string;
  activityType: ActivityType;
  dateOffset: number;
  durationDays?: number;
  requestedTime?: string;
  timeSlot: ScheduleTimeSlot;
  specialtyCourse?: string;
  notes?: string;
  scheduleNotes?: string;
  assignments?: Array<{
    email: string;
    role: ScheduleAssignmentRole;
    notes?: string;
  }>;
};

export type DemoBookingParticipantSeed = {
  customerKey: string;
  status?: BookingParticipantStatus;
  statusNote?: string;
  hotelAtBooking?: string;
  equipmentNeeded?: string;
  notes?: string;
  certificationAgency?: string;
  certificationLevel?: string;
  lastDiveOffset?: number;
  heightCm?: number;
  weightKg?: number;
  shoeSize?: number;
  divesLogged?: number;
};

export type DemoBookingSeed = {
  key: string;
  status: BookingStatus;
  createdByEmail: string;
  source: BookingSource;
  createdOffset: number;
  updatedOffset?: number;
  referrerName?: string;
  notes?: string;
  internalNotes?: string;
  adminNotes?: string;
  needsMoreInfoReason?: string;
  preserveCancelledSchedule?: boolean;
  participants: DemoBookingParticipantSeed[];
  activities: DemoActivitySeed[];
  deposit?: {
    amount?: number;
    status: DepositStatus;
    currency?: string;
    paidTo?: string;
    paymentMethod?: string;
    dueOffset?: number;
    paidOffset?: number;
    notes?: string;
  };
};
