import type { ActivityType, BookingSource } from '@/generated/prisma/enums';

/** UI-friendly row for the simple internal schedule page. */
export type SchedulePageItem = {
  scheduleItemId: string;
  bookingId: string;
  date: Date;
  startTime: string | null;
  activityType: ActivityType;
  primaryCustomerName: string | null;
  numberOfPeople: number | null;
  hotel: string | null;
  source: BookingSource | null;
  referrerName: string | null;
  notes: string | null;
};

/** A date bucket rendered by the grouped schedule list. */
export type ScheduleDateGroup = {
  dateKey: string;
  date: Date;
  items: SchedulePageItem[];
};
