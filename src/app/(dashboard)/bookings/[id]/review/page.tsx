import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { BookingStatusBadge } from '@/components/bookings/booking-status-badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { canReviewBookingRequest } from '@/features/bookings/permissions';
import {
  getBookingRequestById,
  type BookingDetailsItem,
} from '@/features/bookings/queries';
import { summarizeBookingActivities } from '@/features/bookings/utils';
import {
  ActivityType,
  BookingCustomerRole,
  BookingStatus,
  DepositStatus,
} from '@/generated/prisma/enums';
import { requireCurrentUser } from '@/lib/current-user';

type Props = {
  params: Promise<{ id: string }>;
};

const EMPTY_VALUE = '—';

const dateFormatter = new Intl.DateTimeFormat('en-SG', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'Asia/Singapore',
});

function formatDate(value: Date | null | undefined) {
  return value ? dateFormatter.format(value) : EMPTY_VALUE;
}

function formatEnum(value: string | null | undefined) {
  return value
    ? value
        .toLowerCase()
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    : EMPTY_VALUE;
}

function hasText(value: string | null | undefined) {
  return Boolean(value?.trim());
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

function DetailsCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        {children}
      </CardContent>
    </Card>
  );
}

function getMissingInformation(booking: BookingDetailsItem) {
  const warnings: string[] = [];
  const activities = booking.activities;

  if (activities.length === 0) {
    warnings.push('Add at least one activity.');
  }

  activities.forEach((activity, index) => {
    const activityLabel = `Activity ${index + 1}`;

    if (activity.activityType === null) {
      warnings.push(`${activityLabel}: activity type is required.`);
    }

    if (activity.requestedDate === null) {
      warnings.push(`${activityLabel}: requested date is required.`);
    }

    if (
      activity.activityType === ActivityType.SPECIALTY_COURSE &&
      !hasText(activity.specialtyCourse)
    ) {
      warnings.push(`${activityLabel}: specialty course is required.`);
    }
  });

  if (booking.numberOfPeople === null || booking.numberOfPeople < 1) {
    warnings.push('Number of people must be at least 1.');
  }

  if (booking.source === null) {
    warnings.push('Booking source is required.');
  }

  if (booking.customers.length === 0) {
    warnings.push('Add at least one customer or diver.');
  }

  booking.customers.forEach((bookingCustomer, index) => {
    const customerLabel = `Customer/diver ${index + 1}`;
    const customer = bookingCustomer.customer;

    if (formatCustomerName(customer) === EMPTY_VALUE) {
      warnings.push(`${customerLabel}: name is required.`);
    }
  });

  const primaryContacts = booking.customers.filter(
    (bookingCustomer) =>
      bookingCustomer.role === BookingCustomerRole.PRIMARY_CONTACT,
  );

  if (primaryContacts.length !== 1) {
    warnings.push('Select exactly one primary contact.');
  } else {
    const primaryContact = primaryContacts[0].customer;
    const hasContactMethod = [
      primaryContact.weChatId,
      primaryContact.whatsAppNumber,
      primaryContact.email,
      primaryContact.phone,
    ].some(hasText);

    if (!hasContactMethod) {
      warnings.push('Primary contact needs at least one contact method.');
    }
  }

  const includesFunDive = activities.some(
    (activity) => activity.activityType === ActivityType.FUN_DIVE,
  );

  if (includesFunDive) {
    booking.customers.forEach((bookingCustomer, index) => {
      const customerLabel = `Customer/diver ${index + 1}`;

      if (!hasText(bookingCustomer.certificationLevel)) {
        warnings.push(`${customerLabel}: certification level is required.`);
      }

      if (bookingCustomer.lastDiveAt === null) {
        warnings.push(`${customerLabel}: last dive date is required.`);
      }

      if (bookingCustomer.divesLogged === null) {
        warnings.push(`${customerLabel}: logged dives are required.`);
      }
    });
  }

  booking.deposits.forEach((deposit, index) => {
    if (
      deposit.status !== DepositStatus.PAID &&
      deposit.status !== DepositStatus.PARTIALLY_PAID
    ) {
      return;
    }

    const depositLabel = `Deposit ${index + 1}`;

    if (deposit.amount === null || deposit.amount.lte(0)) {
      warnings.push(`${depositLabel}: a positive amount is required.`);
    }

    if (!hasText(deposit.currency)) {
      warnings.push(`${depositLabel}: currency is required.`);
    }

    if (!hasText(deposit.paidTo)) {
      warnings.push(`${depositLabel}: paid to is required.`);
    }
  });

  return warnings;
}

async function ReviewBooking({ params }: Props) {
  const currentUser = await requireCurrentUser();

  if (!canReviewBookingRequest(currentUser)) {
    redirect('/dashboard');
  }

  const { id } = await params;
  const booking = await getBookingRequestById(currentUser, id);

  if (!booking) {
    notFound();
  }

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
  const missingInformation = getMissingInformation(booking);
  const isReviewable = booking.status === BookingStatus.PENDING_APPROVAL;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold">Admin review</h1>
            <BookingStatusBadge status={booking.status} />
          </div>
          <p className="font-mono text-sm text-muted-foreground">
            Booking ID: {booking.id}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/bookings/${booking.id}`}>Back to booking details</Link>
        </Button>
      </header>

      <Card>
        <CardContent className="grid gap-4 pt-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field
            label="Requested date"
            value={formatDate(booking.requestedDate)}
          />
          <Field label="Requested time" value={booking.requestedTime} />
          <Field
            label="Activities"
            value={summarizeBookingActivities(
              booking.activities,
              booking.activityType,
            )}
          />
          <Field label="Source/referrer" value={formatEnum(booking.source)} />
          {booking.referrerName ? (
            <Field label="Referrer name" value={booking.referrerName} />
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_26rem]">
        <main className="space-y-6">
          <DetailsCard title="Booking details">
            <Field label="Number of people" value={booking.numberOfPeople} />
            <Field
              label="Customer service owner"
              value={booking.createdBy.name}
            />
            <Field label="Source/referrer" value={formatEnum(booking.source)} />
            <Field label="Referrer name" value={booking.referrerName} />
          </DetailsCard>

          <DetailsCard title="Activities">
            {activities.map((activity, index) => (
              <div
                className="space-y-4 rounded-lg border p-4 sm:col-span-2"
                key={activity.id}
              >
                <h3 className="font-medium">Activity {index + 1}</h3>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
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
                  <Field
                    label="Requested time"
                    value={activity.requestedTime}
                  />
                  <Field label="Activity notes" value={activity.notes} />
                </div>
              </div>
            ))}
          </DetailsCard>

          <DetailsCard title="Customer/diver details">
            {booking.customers.length === 0 ? (
              <p className="text-sm text-muted-foreground sm:col-span-2">
                No customer or diver details.
              </p>
            ) : (
              booking.customers.map((bookingCustomer) => {
                const customer = bookingCustomer.customer;

                return (
                  <div
                    className="space-y-6 rounded-lg border p-4 sm:col-span-2"
                    key={bookingCustomer.customerId}
                  >
                    <div>
                      <h3 className="font-medium">
                        {formatCustomerName(customer)}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {formatEnum(bookingCustomer.role)}
                      </p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field
                        label="Chinese name"
                        value={customer.chineseName}
                      />
                      <Field label="WeChat ID" value={customer.weChatId} />
                      <Field
                        label="WhatsApp number"
                        value={customer.whatsAppNumber}
                      />
                      <Field label="Email" value={customer.email} />
                      <Field label="Phone" value={customer.phone} />
                      <Field
                        label="Hotel for this booking"
                        value={bookingCustomer.hotelAtBooking}
                      />
                      <Field
                        label="Preferred language"
                        value={formatEnum(customer.preferredLanguage)}
                      />
                      <Field
                        label="Customer/diver notes"
                        value={bookingCustomer.notes}
                      />
                    </div>

                    <div>
                      <h4 className="font-medium">Equipment details</h4>
                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <Field
                          label="Equipment needed"
                          value={bookingCustomer.equipmentNeeded}
                        />
                        <Field
                          label="Height"
                          value={
                            bookingCustomer.heightCm === null
                              ? null
                              : `${bookingCustomer.heightCm} cm`
                          }
                        />
                        <Field
                          label="Weight"
                          value={
                            bookingCustomer.weightKg === null
                              ? null
                              : `${bookingCustomer.weightKg.toString()} kg`
                          }
                        />
                        <Field
                          label="Shoe size"
                          value={bookingCustomer.shoeSize?.toString()}
                        />
                      </div>
                    </div>

                    {includesFunDive ? (
                      <div>
                        <h4 className="font-medium">Fun diver details</h4>
                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                          <Field
                            label="Certification level"
                            value={bookingCustomer.certificationLevel}
                          />
                          <Field
                            label="Certification agency"
                            value={bookingCustomer.certificationAgency}
                          />
                          <Field
                            label="Last dive date"
                            value={formatDate(bookingCustomer.lastDiveAt)}
                          />
                          <Field
                            label="Number of logged dives"
                            value={bookingCustomer.divesLogged}
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </DetailsCard>

          <DetailsCard title="Deposit/payment details">
            {booking.deposits.length === 0 ? (
              <p className="text-sm text-muted-foreground sm:col-span-2">
                No deposit records.
              </p>
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
          </DetailsCard>

          <DetailsCard title="Internal notes from customer service">
            <div className="sm:col-span-2">
              <p className="whitespace-pre-wrap text-sm">
                {booking.internalNotes || EMPTY_VALUE}
              </p>
            </div>
          </DetailsCard>
        </main>

        <aside className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Raw booking text</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">
                {booking.notes || EMPTY_VALUE}
              </p>
            </CardContent>
          </Card>

          {missingInformation.length > 0 ? (
            <Card className="border-destructive/40">
              <CardHeader>
                <CardTitle>Missing information</CardTitle>
                <CardDescription>
                  Review these submission requirements before making a decision.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="list-disc space-y-2 pl-5 text-sm">
                  {missingInformation.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Admin notes</CardTitle>
              <CardDescription>
                Saving admin notes will be enabled with the decision workflow in
                a later issue.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea disabled placeholder="Admin notes are not saved yet." />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Admin decision</CardTitle>
              <CardDescription>
                {isReviewable
                  ? 'Decision actions will be enabled in a later issue.'
                  : 'This booking is not currently pending admin review.'}
              </CardDescription>
            </CardHeader>
            {isReviewable ? (
              <CardContent className="grid gap-2">
                <Button disabled type="button">
                  Approve
                </Button>
                <Button disabled type="button" variant="outline">
                  Mark as Needs More Info
                </Button>
                <Button disabled type="button" variant="destructive">
                  Cancel / Reject
                </Button>
              </CardContent>
            ) : null}
          </Card>
        </aside>
      </div>
    </div>
  );
}

export default ReviewBooking;
