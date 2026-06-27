import Link from 'next/link';

import {
  ResubmitBookingForApprovalForm,
} from '@/components/bookings/booking-workflow-forms';
import { BookingStatusBadge } from '@/components/bookings/booking-status-badge';
import { MissingInfoPanel } from '@/components/bookings/missing-info-panel';
import { Button } from '@/components/ui/button';
import type { BookingDetailsItem } from '@/features/bookings/queries';
import { summarizeBookingActivities } from '@/features/bookings/utils';
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

type Props = {
  booking: BookingDetailsItem;
  canEdit: boolean;
  canReview: boolean;
  canResubmit: boolean;
};

const EMPTY_VALUE = '—';

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

function formatCustomerName(customer: BookingDetailsItem['displayCustomer']) {
  const fullName = customer?.fullName?.trim();
  if (fullName) return fullName;

  return (
    [customer?.firstName, customer?.lastName]
      .filter((part): part is string => Boolean(part))
      .join(' ') || EMPTY_VALUE
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  const displayValue =
    value === null || value === undefined || value === '' ? EMPTY_VALUE : value;

  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="mt-1 text-sm">{displayValue}</div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t pt-6">
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function BookingDetails({ booking, canEdit, canReview, canResubmit }: Props) {
  const bookingCustomer =
    booking.customers.find(
      (customer) => customer.role === BookingCustomerRole.PRIMARY_CONTACT,
    ) ?? booking.customers[0];
  const customerName = formatCustomerName(bookingCustomer?.customer ?? null);
  const activities =
    booking.activities.length > 0
      ? booking.activities
      : [
          {
            id: 'legacy-summary',
            activityType: booking.activityType,
            specialtyCourse: booking.specialtyCourse,
            requestedDate: booking.requestedDate,
            requestedTime: booking.requestedTime,
            notes: null,
          },
        ];
  const includesFunDive = activities.some(
    (activity) => activity.activityType === ActivityType.FUN_DIVE,
  );

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6">
      <header>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold">Booking details</h1>
          <div className="flex flex-wrap gap-2">
            {canEdit ? (
              <Button asChild variant="outline">
                <Link href={`/bookings/${booking.id}/edit`}>Edit booking</Link>
              </Button>
            ) : null}
            {canReview ? (
              <Button asChild>
                <Link href={`/bookings/${booking.id}/review`}>
                  Review booking
                </Link>
              </Button>
            ) : null}
            <Button asChild variant="outline">
              <Link href="/bookings">Back to booking requests</Link>
            </Button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Booking ID" value={booking.id} />
          <Field
            label="Status"
            value={<BookingStatusBadge status={booking.status} />}
          />
          <Field
            label="Activities"
            value={summarizeBookingActivities(
              booking.activities,
              booking.activityType,
            )}
          />
          <Field label="Primary customer" value={customerName} />
        </div>

        <div className="mt-6">
          <p className="text-sm text-muted-foreground">Raw booking text</p>
          <p className="mt-1 whitespace-pre-wrap text-sm">
            {booking.notes || EMPTY_VALUE}
          </p>
        </div>

        {booking.status === BookingStatus.NEEDS_MORE_INFO ? (
          <div className="mt-6">
            <MissingInfoPanel reason={booking.needsMoreInfoReason} />
            {canResubmit ? (
              <ResubmitBookingForApprovalForm bookingId={booking.id} />
            ) : null}
          </div>
        ) : null}
      </header>

      <Section title="Booking details">
        <Field label="Number of people" value={booking.numberOfPeople} />
        <Field label="Source/referrer" value={formatEnum(booking.source)} />
        <Field label="Referrer name" value={booking.referrerName} />
        <Field label="Customer service owner" value={booking.createdBy.name} />
        <Field label="Created date" value={formatDateTime(booking.createdAt)} />
        <Field label="Updated date" value={formatDateTime(booking.updatedAt)} />
      </Section>

      <Section title="Activities">
        {activities.map((activity, index) => (
          <div
            className="space-y-4 rounded-lg border p-4 sm:col-span-2"
            key={activity.id}
          >
            <h3 className="font-medium">Activity {index + 1}</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Activity type"
                value={formatEnum(activity.activityType)}
              />
              <Field
                label="Specialty course"
                value={activity.specialtyCourse}
              />
              <Field
                label="Requested date"
                value={formatDate(activity.requestedDate)}
              />
              <Field label="Requested time" value={activity.requestedTime} />
              <Field label="Activity notes" value={activity.notes} />
            </div>
          </div>
        ))}
      </Section>

      <Section title="Customer/diver details">
        {booking.customers.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No customer or diver details.
          </p>
        ) : (
          booking.customers.map((customerBooking) => {
            const customer = customerBooking.customer;

            return (
              <div
                className="space-y-6 rounded-lg border p-4 sm:col-span-2"
                key={customerBooking.customerId}
              >
                <div>
                  <h3 className="font-medium">
                    {formatCustomerName(customer)}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {formatEnum(customerBooking.role)}
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Chinese name" value={customer.chineseName} />
                  <Field label="WeChat ID" value={customer.weChatId} />
                  <Field
                    label="WhatsApp number"
                    value={customer.whatsAppNumber}
                  />
                  <Field label="Email" value={customer.email} />
                  <Field label="Phone" value={customer.phone} />
                  <Field
                    label="Hotel for this booking"
                    value={customerBooking.hotelAtBooking}
                  />
                  <Field
                    label="Preferred language"
                    value={formatEnum(customer.preferredLanguage)}
                  />
                  <Field
                    label="Equipment needed"
                    value={customerBooking.equipmentNeeded}
                  />
                  <Field
                    label="Customer/diver notes"
                    value={customerBooking.notes}
                  />
                </div>

                {includesFunDive ? (
                  <div>
                    <h4 className="font-medium">Fun diver details</h4>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
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
                      <Field
                        label="Number of logged dives"
                        value={customerBooking.divesLogged}
                      />
                    </div>
                  </div>
                ) : null}

                <div>
                  <h4 className="font-medium">Sizing details</h4>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
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
                    <Field
                      label="Shoe size"
                      value={customerBooking.shoeSize?.toString()}
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </Section>

      <Section title="Deposit/payment details">
        {booking.deposits.length === 0 ? (
          <p className="text-sm text-muted-foreground">No deposit records.</p>
        ) : (
          booking.deposits.map((deposit) => (
            <div
              className="grid gap-4 rounded-lg border p-4 sm:col-span-2 sm:grid-cols-2"
              key={deposit.id}
            >
              <Field
                label="Deposit status"
                value={formatEnum(deposit.status)}
              />
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
              <Field label="Payment notes" value={deposit.notes} />
            </div>
          ))
        )}
      </Section>

      <Section title="Internal notes">
        <Field label="Internal notes" value={booking.internalNotes} />
        <Field label="Admin notes" value={booking.adminNotes} />
      </Section>
    </div>
  );
}

export default BookingDetails;
