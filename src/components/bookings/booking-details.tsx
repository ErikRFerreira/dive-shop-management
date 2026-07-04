import Link from 'next/link';

import {
  BookingDetailsRail,
  type BookingDetailAction,
} from '@/components/bookings/booking-details-rail';
import { BookingStatusBadge } from '@/components/bookings/booking-status-badge';
import { MissingInfoPanel } from '@/components/bookings/missing-info-panel';
import { StickyRailLayout } from '@/components/common/sticky-rail-layout';
import { ScheduleAssignmentsList } from '@/components/schedule/schedule-assignments';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { BookingDetailsItem } from '@/features/bookings/queries';
import { summarizeBookingActivities } from '@/features/bookings/utils';
import type { AssignableStaff } from '@/features/schedule/types';
import {
  formatDisplayDate,
  formatDisplayDateTime,
  formatEnumLabel,
} from '@/lib/format';
import {
  ActivityType,
  BookingCustomerRole,
  BookingStatus,
} from '@/generated/prisma/enums';
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  Contact,
  Hotel,
  MapPin,
  UserRound,
  Users,
  Waves,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import PageHeader from '../common/page-header';

type Props = {
  assignableStaff: AssignableStaff[];
  booking: BookingDetailsItem;
  canEdit: boolean;
  canManageAssignments: boolean;
  canReview: boolean;
  canResubmit: boolean;
};

type BookingActivityDisplay = {
  id: string;
  activityType: BookingDetailsItem['activities'][number]['activityType'];
  specialtyCourse: string | null;
  requestedDate: Date | null;
  requestedTime: string | null;
  notes: string | null;
};

const EMPTY_VALUE = '\u2014';

/**
 * Formats a nullable date for booking detail display.
 *
 * @param value - Date value from the booking detail payload.
 * @returns Staff-facing date text, or the empty-value placeholder.
 */
function formatDate(value: Date | null | undefined) {
  return formatDisplayDate(value);
}

/**
 * Formats a date-time for booking detail display.
 *
 * @param value - Date-time value from the booking detail payload.
 * @returns Staff-facing date-time text, or the empty-value placeholder.
 */
function formatDateTime(value: Date) {
  return formatDisplayDateTime(value);
}

/**
 * Formats enum-like values for booking detail display.
 *
 * @param value - Raw enum text from the booking detail payload.
 * @returns Staff-facing label text, or the empty-value placeholder.
 */
function formatEnum(value: string | null | undefined) {
  return formatEnumLabel(value);
}

/**
 * Formats a time field where missing values should be operationally explicit.
 *
 * @param value - Stored time text from a booking activity or schedule item.
 * @returns The stored time or the explicit TBD label.
 */
function formatTimeOrTbd(value: string | null | undefined) {
  return value?.trim() || 'TBD';
}

/**
 * Formats the preferred customer name for booking detail display.
 *
 * @param customer - Customer selected for display.
 * @returns A full name, first/last fallback, or the empty-value placeholder.
 */
function formatCustomerName(customer: BookingDetailsItem['displayCustomer']) {
  const fullName = customer?.fullName?.trim();
  if (fullName) return fullName;

  return (
    [customer?.firstName, customer?.lastName]
      .filter((part): part is string => Boolean(part))
      .join(' ') || EMPTY_VALUE
  );
}

/**
 * Finds the booking customer staff should treat as the primary operational contact.
 *
 * @param booking - Booking detail payload with customer join rows.
 * @returns The explicit primary contact, first customer, or null when none exists.
 */
function getPrimaryBookingCustomer(booking: BookingDetailsItem) {
  return (
    booking.customers.find(
      (customer) => customer.role === BookingCustomerRole.PRIMARY_CONTACT,
    ) ??
    booking.customers[0] ??
    null
  );
}

/**
 * Formats a source and optional referrer into the standard staff-facing label.
 *
 * @param booking - Booking fields used for source/referrer display.
 * @returns Source, referrer, both joined with a slash, or the empty placeholder.
 */
function formatSourceReferrer(
  booking: Pick<BookingDetailsItem, 'source' | 'referrerName'>,
) {
  const source = booking.source ? formatEnum(booking.source) : null;
  const referrer = booking.referrerName?.trim();

  if (source && referrer) {
    return `${source} / ${referrer}`;
  }

  return source ?? referrer ?? EMPTY_VALUE;
}

/**
 * Formats assigned staff names for the compact booking overview.
 *
 * @param booking - Booking detail payload with optional schedule assignments.
 * @returns Comma-separated staff names, unassigned text, or the empty placeholder.
 */
function formatAssignedStaffSummary(booking: BookingDetailsItem) {
  if (!booking.scheduleItem) {
    return EMPTY_VALUE;
  }

  const names = booking.scheduleItem.assignments.map(
    (assignment) => assignment.user.name,
  );

  return names.length > 0 ? names.join(', ') : 'Unassigned';
}

/**
 * Returns the activity rows used by the detail view, including legacy fallback data.
 *
 * @param booking - Booking detail payload.
 * @returns Existing activities, or one legacy summary row when no activities exist.
 */
function getDisplayActivities(
  booking: BookingDetailsItem,
): BookingActivityDisplay[] {
  if (booking.activities.length > 0) {
    return booking.activities;
  }

  return [
    {
      id: 'legacy-summary',
      activityType: booking.activityType,
      specialtyCourse: booking.specialtyCourse,
      requestedDate: booking.requestedDate,
      requestedTime: booking.requestedTime,
      notes: null,
    },
  ];
}

/**
 * Resolves the first requested date/time visible in the booking overview.
 *
 * @param booking - Booking detail payload.
 * @param activities - Activity rows already normalized for display.
 * @returns Requested date and time using activity data before legacy fields.
 */
function getOverviewRequestedDateTime(
  booking: BookingDetailsItem,
  activities: BookingActivityDisplay[],
) {
  const firstActivityWithDate =
    activities.find((activity) => activity.requestedDate) ?? activities[0];

  return {
    requestedDate:
      firstActivityWithDate?.requestedDate ?? booking.requestedDate,
    requestedTime:
      firstActivityWithDate?.requestedTime ?? booking.requestedTime ?? null,
  };
}

/**
 * Formats the requested date/time pair for compact booking reference display.
 *
 * @param booking - Booking detail payload.
 * @param activities - Normalized activity rows visible on the detail page.
 * @returns A joined requested date/time label.
 */
function formatRequestedDateTime(
  booking: BookingDetailsItem,
  activities: BookingActivityDisplay[],
) {
  const requested = getOverviewRequestedDateTime(booking, activities);

  return `${formatDate(requested.requestedDate)} / ${formatTimeOrTbd(requested.requestedTime)}`;
}

/**
 * Checks whether the booking includes a fun dive activity.
 *
 * @param activities - Activity rows shown on the detail page.
 * @returns True when any activity is a fun dive.
 */
function includesFunDiveActivity(activities: BookingActivityDisplay[]) {
  return activities.some(
    (activity) => activity.activityType === ActivityType.FUN_DIVE,
  );
}

/**
 * Builds navigation actions from booking status and permissions.
 *
 * @param booking - Booking detail payload used to resolve workflow state.
 * @param canEdit - Whether the current user may edit this booking.
 * @param canReview - Whether the current user may review this booking.
 * @returns Ordered actions for the sticky operational rail.
 */
function getBookingDetailActions(
  booking: BookingDetailsItem,
  canEdit: boolean,
  canReview: boolean,
): BookingDetailAction[] {
  const actions: BookingDetailAction[] = [];
  const editHref = `/bookings/${booking.id}/edit`;

  if (booking.status === BookingStatus.DRAFT && canEdit) {
    actions.push({ href: editHref, label: 'Edit booking' });
  }

  if (booking.status === BookingStatus.PENDING_APPROVAL) {
    if (canReview) {
      actions.push({
        href: `/bookings/${booking.id}/review`,
        label: 'Review booking',
      });
    }

    if (canEdit) {
      actions.push({
        href: editHref,
        label: 'Edit booking',
        variant: 'outline',
      });
    }
  }

  if (booking.status === BookingStatus.NEEDS_MORE_INFO && canEdit) {
    actions.push({ href: editHref, label: 'Fix details' });
  }

  if (
    (booking.status === BookingStatus.SCHEDULED ||
      booking.status === BookingStatus.APPROVED) &&
    booking.scheduleItem
  ) {
    actions.push({ href: '/schedule', label: 'View schedule' });
  }

  if (
    (booking.status === BookingStatus.SCHEDULED ||
      booking.status === BookingStatus.APPROVED) &&
    canEdit
  ) {
    actions.push({
      href: editHref,
      label: 'Edit booking',
      variant: 'outline',
    });
  }

  actions.push({
    href: '/bookings',
    label: 'Back to booking requests',
    variant: 'outline',
  });

  return actions;
}

/**
 * Renders a label/value pair in the booking detail view.
 *
 * @param props - Field label and rendered value.
 * @returns A compact booking detail field.
 */
function Field({ label, value }: { label: string; value: React.ReactNode }) {
  const displayValue =
    value === null || value === undefined || value === '' ? EMPTY_VALUE : value;

  return (
    <div className="min-w-0">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="mt-1 break-words text-sm font-medium">{displayValue}</div>
    </div>
  );
}

/**
 * Renders a titled booking detail section with a two-column content grid.
 *
 * @param props - Section title and child content.
 * @returns A bordered detail section.
 */
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="border-b">
        <h2 className="font-heading text-base font-medium leading-snug">
          {title}
        </h2>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        {children}
      </CardContent>
    </Card>
  );
}

/**
 * Renders one icon-backed metadata item in the booking reference card.
 *
 * @param props - Icon, label, and value for the metadata item.
 * @returns A compact operational metadata row.
 */
function BookingReferenceMetaItem({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
}) {
  const displayValue =
    value === null || value === undefined || value === '' ? EMPTY_VALUE : value;

  return (
    <div className="flex min-w-0 gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <div className="mt-0.5 break-words text-sm font-semibold">
          {displayValue}
        </div>
      </div>
    </div>
  );
}

/**
 * Renders the high-level booking reference card for operational scanning.
 *
 * @param props - Booking and normalized activities used for reference values.
 * @returns Top booking reference card.
 */
function BookingReferenceCard({
  activities,
  booking,
}: {
  activities: BookingActivityDisplay[];
  booking: BookingDetailsItem;
}) {
  const bookingCustomer = getPrimaryBookingCustomer(booking);

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="border-b">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Booking reference
            </p>
            <p className="mt-1 font-mono text-sm font-semibold">{booking.id}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        <BookingReferenceMetaItem
          icon={Contact}
          label="Primary customer"
          value={formatCustomerName(bookingCustomer?.customer ?? null)}
        />
        <BookingReferenceMetaItem
          icon={Waves}
          label="Activity"
          value={summarizeBookingActivities(
            booking.activities,
            booking.activityType,
          )}
        />
        <BookingReferenceMetaItem
          icon={CalendarDays}
          label="Requested date / time"
          value={formatRequestedDateTime(booking, activities)}
        />
        <BookingReferenceMetaItem
          icon={Users}
          label="Total participants"
          value={booking.numberOfPeople}
        />
        <BookingReferenceMetaItem
          icon={MapPin}
          label="Source / referrer"
          value={formatSourceReferrer(booking)}
        />
        <BookingReferenceMetaItem
          icon={Hotel}
          label="Hotel / pickup location"
          value={
            bookingCustomer?.hotelAtBooking ??
            bookingCustomer?.customer.hotel ??
            EMPTY_VALUE
          }
        />
        <BookingReferenceMetaItem
          icon={UserRound}
          label="Customer service owner"
          value={booking.createdBy.name}
        />
        <BookingReferenceMetaItem
          icon={Clock3}
          label="Last updated"
          value={formatDateTime(booking.updatedAt)}
        />
        <BookingReferenceMetaItem
          icon={Users}
          label="Assigned staff"
          value={formatAssignedStaffSummary(booking)}
        />
      </CardContent>
    </Card>
  );
}

/**
 * Renders the original customer message with helpful empty text.
 *
 * @param props - Original message text from the booking.
 * @returns Read-only original booking message block.
 */
function OriginalBookingMessage({ notes }: { notes: string | null }) {
  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="border-b">
        <CardTitle>Original booking message</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-xl border border-dashed bg-muted/20 p-6 text-center">
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">
            {notes?.trim() || 'No original message saved.'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Renders the workflow panel shown when a booking needs more information.
 *
 * @param props - Missing-information reason from the booking workflow.
 * @returns Missing-information explanation for the main detail column.
 */
function NeedsMoreInfoWorkflow({ reason }: { reason: string | null }) {
  return (
    <div>
      <MissingInfoPanel reason={reason} />
    </div>
  );
}

/**
 * Renders the booking summary metadata section.
 *
 * @param props - Booking detail payload.
 * @returns Booking summary fields.
 */
function BookingSummarySection({ booking }: { booking: BookingDetailsItem }) {
  return (
    <Section title="Booking summary">
      <Field label="Total participants" value={booking.numberOfPeople} />
      <Field label="Source / referrer" value={formatSourceReferrer(booking)} />
      <Field label="Referrer name" value={booking.referrerName} />
      <Field label="Customer service owner" value={booking.createdBy.name} />
      <Field label="Created date" value={formatDateTime(booking.createdAt)} />
      <Field label="Updated date" value={formatDateTime(booking.updatedAt)} />
    </Section>
  );
}

/**
 * Renders schedule details and assignment controls when a schedule item exists.
 *
 * @param props - Schedule assignment data and management permissions.
 * @returns Schedule detail section or null.
 */
function ScheduleSection({
  assignableStaff,
  booking,
  canManageAssignments,
}: {
  assignableStaff: AssignableStaff[];
  booking: BookingDetailsItem;
  canManageAssignments: boolean;
}) {
  if (!booking.scheduleItem) {
    return null;
  }

  return (
    <Section title="Schedule">
      <Field
        label="Scheduled date"
        value={formatDate(booking.scheduleItem.date)}
      />
      <Field
        label="Scheduled time"
        value={formatTimeOrTbd(booking.scheduleItem.startTime)}
      />
      {booking.scheduleItem.scheduleNotes ? (
        <div className="sm:col-span-2">
          <Field
            label="Schedule notes"
            value={booking.scheduleItem.scheduleNotes}
          />
        </div>
      ) : null}
      <div className="sm:col-span-2">
        <ScheduleAssignmentsList
          assignableStaff={assignableStaff}
          assignments={booking.scheduleItem.assignments}
          canManageAssignments={canManageAssignments}
          scheduleItemId={booking.scheduleItem.id}
        />
      </div>
    </Section>
  );
}

/**
 * Renders one requested activity card.
 *
 * @param props - Activity row and its one-based display index.
 * @returns Read-only activity detail card.
 */
function ActivityCard({
  activity,
  index,
}: {
  activity: BookingActivityDisplay;
  index: number;
}) {
  return (
    <div className="space-y-4 rounded-lg border p-4 sm:col-span-2">
      <h3 className="font-medium">Activity {index + 1}</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Activity type"
          value={formatEnum(activity.activityType)}
        />
        {activity.specialtyCourse ? (
          <Field label="Specialty course" value={activity.specialtyCourse} />
        ) : null}
        <Field
          label="Requested date"
          value={formatDate(activity.requestedDate)}
        />
        <Field
          label="Requested time"
          value={formatTimeOrTbd(activity.requestedTime)}
        />
        <div className="sm:col-span-2">
          <Field
            label="Activity notes"
            value={activity.notes?.trim() || 'No activity notes.'}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Renders all requested booking activities as cards.
 *
 * @param props - Normalized activity rows for the detail page.
 * @returns Activities section.
 */
function ActivitiesSection({
  activities,
}: {
  activities: BookingActivityDisplay[];
}) {
  return (
    <Section title="Activities">
      {activities.map((activity, index) => (
        <ActivityCard activity={activity} index={index} key={activity.id} />
      ))}
    </Section>
  );
}

/**
 * Renders a small titled field group inside a customer card.
 *
 * @param props - Group title and fields.
 * @returns Customer card subgroup.
 */
function CustomerFieldGroup({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <div>
      <h4 className="font-medium">{title}</h4>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}

/**
 * Renders one customer or diver in grouped read-only sections.
 *
 * @param props - Booking customer row and fun-dive display flag.
 * @returns Readable customer/diver card.
 */
function CustomerDiverCard({
  customerBooking,
  includesFunDive,
}: {
  customerBooking: BookingDetailsItem['customers'][number];
  includesFunDive: boolean;
}) {
  const customer = customerBooking.customer;

  return (
    <div className="space-y-6 rounded-lg border p-4 sm:col-span-2">
      <div>
        <h3 className="font-medium">{formatCustomerName(customer)}</h3>
        <p className="text-sm text-muted-foreground">
          {formatEnum(customerBooking.role)}
        </p>
      </div>

      <CustomerFieldGroup title="Contact details">
        <Field label="Customer name" value={formatCustomerName(customer)} />
        <Field label="Chinese name" value={customer.chineseName} />
        <Field label="WeChat ID" value={customer.weChatId} />
        <Field label="WhatsApp number" value={customer.whatsAppNumber} />
        <Field label="Email" value={customer.email} />
        <Field label="Phone" value={customer.phone} />
        <Field
          label="Preferred language"
          value={formatEnum(customer.preferredLanguage)}
        />
      </CustomerFieldGroup>

      <CustomerFieldGroup title="Booking logistics">
        <Field
          label="Hotel / pickup location"
          value={customerBooking.hotelAtBooking ?? customer.hotel}
        />
        <Field
          label="Primary contact"
          value={
            customerBooking.role === BookingCustomerRole.PRIMARY_CONTACT
              ? 'Yes'
              : 'No'
          }
        />
        <Field
          label="Role in booking"
          value={formatEnum(customerBooking.role)}
        />
      </CustomerFieldGroup>

      {includesFunDive ? (
        <CustomerFieldGroup title="Diving experience">
          <Field
            label="Certification level"
            value={customerBooking.certificationLevel}
          />
          <Field
            label="Certification agency"
            value={customerBooking.certificationAgency}
          />
          <Field
            label="Last dive date"
            value={formatDate(customerBooking.lastDiveAt)}
          />
          <Field label="Logged dives" value={customerBooking.divesLogged} />
        </CustomerFieldGroup>
      ) : null}

      <CustomerFieldGroup title="Equipment details">
        <Field
          label="Equipment needed?"
          value={customerBooking.equipmentNeeded}
        />
        <Field
          label="Height"
          value={
            customerBooking.heightCm === null
              ? null
              : `${customerBooking.heightCm} cm`
          }
        />
        <Field
          label="Weight"
          value={
            customerBooking.weightKg === null
              ? null
              : `${customerBooking.weightKg.toString()} kg`
          }
        />
        <Field label="Shoe size" value={customerBooking.shoeSize?.toString()} />
      </CustomerFieldGroup>

      <CustomerFieldGroup title="Notes">
        <div className="sm:col-span-2">
          <Field
            label="Customer notes"
            value={customerBooking.notes?.trim() || 'No customer notes.'}
          />
        </div>
      </CustomerFieldGroup>
    </div>
  );
}

/**
 * Renders the grouped customer and diver detail cards.
 *
 * @param props - Booking customers and activity context.
 * @returns Customers and divers section.
 */
function CustomersDiversSection({
  booking,
  includesFunDive,
}: {
  booking: BookingDetailsItem;
  includesFunDive: boolean;
}) {
  return (
    <Section title="Customers & divers">
      {booking.customers.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No customer or diver details.
        </p>
      ) : (
        booking.customers.map((customerBooking) => (
          <CustomerDiverCard
            customerBooking={customerBooking}
            includesFunDive={includesFunDive}
            key={customerBooking.customerId}
          />
        ))
      )}
    </Section>
  );
}

/**
 * Renders one deposit/payment record.
 *
 * @param props - Deposit record from the booking detail payload.
 * @returns Read-only deposit/payment card.
 */
function DepositPaymentCard({
  deposit,
}: {
  deposit: BookingDetailsItem['deposits'][number];
}) {
  return (
    <div className="grid gap-4 rounded-lg border p-4 sm:col-span-2 sm:grid-cols-2">
      <Field label="Deposit status" value={formatEnum(deposit.status)} />
      <Field
        label="Amount"
        value={
          deposit.amount === null
            ? null
            : `${deposit.amount.toString()} ${deposit.currency ?? ''}`.trim()
        }
      />
      <Field label="Currency" value={deposit.currency} />
      <Field label="Paid to" value={deposit.paidTo} />
      <Field label="Payment method" value={deposit.paymentMethod} />
      <Field label="Due date" value={formatDate(deposit.dueAt)} />
      <Field label="Paid date" value={formatDate(deposit.paidAt)} />
      <div className="sm:col-span-2">
        <Field
          label="Payment notes"
          value={deposit.notes?.trim() || 'No payment notes.'}
        />
      </div>
    </div>
  );
}

/**
 * Renders deposit and payment details for the booking.
 *
 * @param props - Booking detail payload with deposit records.
 * @returns Deposit/payment section.
 */
function DepositPaymentSection({ booking }: { booking: BookingDetailsItem }) {
  return (
    <Section title="Deposit / payment">
      {booking.deposits.length === 0 ? (
        <p className="text-sm text-muted-foreground">No deposit recorded.</p>
      ) : (
        booking.deposits.map((deposit) => (
          <DepositPaymentCard deposit={deposit} key={deposit.id} />
        ))
      )}
    </Section>
  );
}

/**
 * Renders internal and admin notes with helpful empty-state text.
 *
 * @param props - Booking detail payload.
 * @returns Notes section.
 */
function NotesSection({ booking }: { booking: BookingDetailsItem }) {
  return (
    <Section title="Internal notes">
      <Field
        label="Internal notes"
        value={booking.internalNotes?.trim() || 'No internal notes.'}
      />
      <Field
        label="Admin notes"
        value={booking.adminNotes?.trim() || 'No admin notes yet.'}
      />
    </Section>
  );
}

/**
 * Renders the internal booking detail page content.
 *
 * @param props - Booking detail data plus workflow and assignment permissions.
 * @returns The booking detail UI with optional schedule assignment controls.
 */
function BookingDetails({
  assignableStaff,
  booking,
  canEdit,
  canManageAssignments,
  canReview,
  canResubmit,
}: Props) {
  const activities = getDisplayActivities(booking);
  const actions = getBookingDetailActions(booking, canEdit, canReview);
  const includesFunDive = includesFunDiveActivity(activities);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="space-y-4">
        <Button asChild variant="ghost" className="-ml-3 w-fit">
          <Link href="/bookings">
            <ArrowLeft className="size-4" />
            Back to booking requests
          </Link>
        </Button>
        <PageHeader
          title="Booking details"
          description="Review the full booking request, customer details, and operational
            notes"
        />
      </header>

      <StickyRailLayout
        className="lg:grid-cols-[minmax(0,1fr)_20rem]"
        contentClassName="space-y-6"
        railClassName="space-y-4"
        rail={
          <BookingDetailsRail
            actions={actions}
            activities={activities}
            booking={booking}
            canResubmit={canResubmit}
          />
        }
      >
        <BookingReferenceCard activities={activities} booking={booking} />
        {booking.status === BookingStatus.NEEDS_MORE_INFO ? (
          <NeedsMoreInfoWorkflow reason={booking.needsMoreInfoReason} />
        ) : null}
        <OriginalBookingMessage notes={booking.notes} />
        <BookingSummarySection booking={booking} />
        <ScheduleSection
          assignableStaff={assignableStaff}
          booking={booking}
          canManageAssignments={canManageAssignments}
        />
        <ActivitiesSection activities={activities} />
        <CustomersDiversSection
          booking={booking}
          includesFunDive={includesFunDive}
        />
        <DepositPaymentSection booking={booking} />
        <NotesSection booking={booking} />
      </StickyRailLayout>
    </div>
  );
}

export default BookingDetails;
