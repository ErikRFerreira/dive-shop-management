import type {
  ActivityType,
  BookingCustomerRole,
  BookingSource,
  ScheduleAssignmentRole,
  ScheduleTimeSlot,
  UserRole,
} from '@/generated/prisma/enums';

/** Supported date-range shortcuts for schedule filtering. */
export type ScheduleRangeFilter = 'all' | 'today' | 'tomorrow' | 'this-week';

/** Broad operational schedule categories supported by the schedule page. */
export type ScheduleTypeFilter = 'fun-dives' | 'courses';

/** Server-side filters accepted by schedule queries. */
export type ScheduleFilters = {
  range?: ScheduleRangeFilter;
  scheduleType?: ScheduleTypeFilter;
  staffId?: string;
  activityType?: ActivityType;
  unassignedOnly?: boolean;
};

/** Staff user data safe to show in schedule assignment controls. */
export type AssignableStaff = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

/** Minimal active staff metadata used by read-only schedule filters. */
export type ScheduleStaffFilterOption = Pick<
  AssignableStaff,
  'id' | 'name' | 'role'
>;

/** Assigned staff metadata safe for every global schedule viewer. */
export type ScheduleAssignedStaff = {
  name: string;
  role: ScheduleAssignmentRole;
};

/** Staff assignment attached to a scheduled activity. */
export type ScheduleAssignmentDetail = {
  id: string;
  userId: string;
  role: ScheduleAssignmentRole;
  notes: string | null;
  user: AssignableStaff;
};

/** Activity detail included with each personal assignment row. */
export type MyScheduleAssignmentActivity = {
  activityType: ActivityType | null;
  activityLabel: string | null;
  specialtyCourse: string | null;
};

/** Customer or diver attached to a scheduled booking for compact display. */
export type ScheduleBookingCustomerDisplay = {
  name: string;
  chineseName: string | null;
  isPrimaryContact: boolean;
  role: BookingCustomerRole;
};

/** Read-only schedule item assigned to the current staff user. */
export type MyScheduleAssignment = {
  scheduleItemId: string;
  date: Date;
  timeSlot: ScheduleTimeSlot;
  isTimeTbd: boolean;
  activityType: ActivityType;
  activityLabel: string;
  activitySummary: string;
  dayNumber: number | null;
  totalDays: number;
  dayLabel: string | null;
  activities: MyScheduleAssignmentActivity[];
  primaryCustomerName: string | null;
  customers: ScheduleBookingCustomerDisplay[];
  /** Active operational participant count derived from booking/customer rows. */
  numberOfPeople: number | null;
  hotel: string | null;
  scheduleNotes: string | null;
  assignmentRole: ScheduleAssignmentRole;
};

/** Compact metadata for the next assignment summary card. */
export type MyScheduleAssignmentNextAssignment = {
  date: Date;
  activitySummary: string;
};

/** Summary counts shown at the top of the staff My Assignments briefing. */
export type MyScheduleAssignmentSummary = {
  todayCount: number;
  tomorrowCount: number;
  upcomingCount: number;
  nextAssignment: MyScheduleAssignmentNextAssignment | null;
};

/** Bounded staff briefing payload for the My Assignments page. */
export type MyScheduleAssignmentBriefing = {
  todayAssignments: MyScheduleAssignment[];
  tomorrowAssignments: MyScheduleAssignment[];
  upcomingAssignments: MyScheduleAssignment[];
  upcomingLimit: number;
  summary: MyScheduleAssignmentSummary;
};

/** Supported personal assignment buckets for the My Assignments page. */
export type MyScheduleAssignmentGroupKey = 'today' | 'tomorrow' | 'upcoming';

/** Date bucket rendered by the future read-only My Assignments page. */
export type MyScheduleAssignmentGroup = {
  key: MyScheduleAssignmentGroupKey;
  label: string;
  items: MyScheduleAssignment[];
};

/** UI-friendly row for the simple internal schedule page. */
export type SchedulePageItem = {
  scheduleItemId: string;
  bookingId: string;
  date: Date;
  timeSlot: ScheduleTimeSlot;
  startTime: string | null;
  activityType: ActivityType;
  activityLabel: string;
  activitySummary: string;
  dayNumber: number | null;
  totalDays: number;
  dayLabel: string | null;
  primaryCustomerName: string | null;
  /** Active operational participant count derived from booking/customer rows. */
  numberOfPeople: number | null;
  hotel: string | null;
  source: BookingSource | null;
  referrerName: string | null;
  notes: string | null;
  assignments: ScheduleAssignmentDetail[];
};

/** A date bucket rendered by the grouped schedule list. */
export type ScheduleDateGroup = {
  dateKey: string;
  date: Date;
  items: SchedulePageItem[];
};

/** Feature-specific event data prepared for the schedule calendar UI. */
export type ScheduleCalendarEvent = {
  id: string;
  title: string;
  start: string;
  end: string | null;
  allDay: boolean;
  bookingId?: string;
  scheduleItemId: string;
  date: Date;
  timeSlot: ScheduleTimeSlot;
  activityType: ActivityType;
  activityLabel: string;
  activitySummary: string;
  dayNumber: number | null;
  totalDays: number;
  dayLabel: string | null;
  primaryCustomerName: string | null;
  customers: ScheduleBookingCustomerDisplay[];
  /** Active operational participant count derived from booking/customer rows. */
  numberOfPeople: number | null;
  hotel: string | null;
  source?: BookingSource | null;
  referrerName?: string | null;
  scheduleNotes: string | null;
  assignments: ScheduleAssignedStaff[];
  managementAssignments?: ScheduleAssignmentDetail[];
  isTimeTbd: boolean;
};

/** Serialized schedule event safe to pass across the Server/Client boundary. */
export type SerializedScheduleCalendarEvent = Omit<ScheduleCalendarEvent, 'date'> & {
  date: string;
};
