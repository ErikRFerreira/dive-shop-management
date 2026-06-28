import type {
  ActivityType,
  BookingSource,
  ScheduleAssignmentRole,
  UserRole,
} from '@/generated/prisma/enums';

/** Supported date-range shortcuts for schedule filtering. */
export type ScheduleRangeFilter = 'all' | 'today' | 'tomorrow' | 'this-week';

/** Server-side filters accepted by schedule queries. */
export type ScheduleFilters = {
  range?: ScheduleRangeFilter;
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
  id: string;
  activityType: ActivityType | null;
  activityLabel: string | null;
  specialtyCourse: string | null;
  requestedDate: Date | null;
  requestedTime: string | null;
  notes: string | null;
};

/** Read-only schedule item assigned to the current staff user. */
export type MyScheduleAssignment = {
  scheduleItemId: string;
  bookingId: string;
  date: Date;
  startTime: string | null;
  endTime: string | null;
  isTimeTbd: boolean;
  activityType: ActivityType;
  activityLabel: string;
  activitySummary: string;
  activities: MyScheduleAssignmentActivity[];
  primaryCustomerName: string | null;
  otherCustomerNames: string[];
  numberOfPeople: number | null;
  hotel: string | null;
  scheduleNotes: string | null;
  assignmentRole: ScheduleAssignmentRole;
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
  startTime: string | null;
  activityType: ActivityType;
  primaryCustomerName: string | null;
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

/** Activity detail included with each schedule calendar event. */
export type ScheduleCalendarActivity = {
  id: string;
  activityType: ActivityType | null;
  activityLabel: string | null;
  specialtyCourse: string | null;
  requestedDate: Date | null;
  requestedTime: string | null;
  notes: string | null;
};

/** Serialized activity detail safe to pass into client schedule components. */
export type SerializedScheduleCalendarActivity = Omit<
  ScheduleCalendarActivity,
  'requestedDate'
> & {
  requestedDate: string | null;
};

/** Feature-specific event data prepared for the schedule calendar UI. */
export type ScheduleCalendarEvent = {
  id: string;
  title: string;
  start: string;
  end: string | null;
  allDay: boolean;
  bookingId: string;
  bookingReference: string;
  scheduleItemId: string;
  date: Date;
  startTime: string | null;
  endTime: string | null;
  activityType: ActivityType;
  activityLabel: string;
  activitySummary: string;
  activities: ScheduleCalendarActivity[];
  primaryCustomerName: string | null;
  numberOfPeople: number | null;
  hotel: string | null;
  source: BookingSource | null;
  referrerName: string | null;
  notes: string | null;
  assignments: ScheduleAssignmentDetail[];
  isTimeTbd: boolean;
};

/** Serialized schedule event safe to pass across the Server/Client boundary. */
export type SerializedScheduleCalendarEvent = Omit<
  ScheduleCalendarEvent,
  'activities' | 'date'
> & {
  activities: SerializedScheduleCalendarActivity[];
  date: string;
};
