import {
  EMPTY_VALUE,
  Field,
  ReviewDetailsCard,
  formatCustomerName,
  formatDate,
  formatEnum,
} from '@/components/bookings/booking-review-display';
import type { BookingDetailsItem } from '@/features/bookings/queries';
import { ActivityType } from '@/generated/prisma/enums';

type ReviewActivity = Pick<
  BookingDetailsItem['activities'][number],
  'id' | 'activityType' | 'specialtyCourse' | 'requestedDate' | 'requestedTime' | 'notes'
>;

type ReviewSectionsProps = {
  booking: BookingDetailsItem;
  activities: ReviewActivity[];
  includesFunDive: boolean;
};

export function BookingReviewMainSections({
  booking,
  activities,
  includesFunDive,
}: ReviewSectionsProps) {
  return (
    <main className="space-y-6">
      <ReviewDetailsCard title="Booking details">
        <Field label="Number of people" value={booking.numberOfPeople} />
        <Field label="Customer service owner" value={booking.createdBy.name} />
        <Field label="Source/referrer" value={formatEnum(booking.source)} />
        <Field label="Referrer name" value={booking.referrerName} />
      </ReviewDetailsCard>

      <ActivitiesSection activities={activities} />
      <CustomersSection booking={booking} includesFunDive={includesFunDive} />
      <DepositsSection booking={booking} />

      <ReviewDetailsCard title="Internal notes from customer service">
        <div className="sm:col-span-2">
          <p className="whitespace-pre-wrap text-sm">
            {booking.internalNotes || EMPTY_VALUE}
          </p>
        </div>
      </ReviewDetailsCard>
    </main>
  );
}

function ActivitiesSection({ activities }: { activities: ReviewActivity[] }) {
  return (
    <ReviewDetailsCard title="Activities">
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
            {activity.activityType === ActivityType.SPECIALTY_COURSE ? (
              <Field
                label="Specialty course"
                value={activity.specialtyCourse}
              />
            ) : null}
            <Field
              label="Requested date"
              value={formatDate(activity.requestedDate)}
            />
            <Field label="Requested time" value={activity.requestedTime} />
            <Field label="Activity notes" value={activity.notes} />
          </div>
        </div>
      ))}
    </ReviewDetailsCard>
  );
}

function CustomersSection({
  booking,
  includesFunDive,
}: {
  booking: BookingDetailsItem;
  includesFunDive: boolean;
}) {
  return (
    <ReviewDetailsCard title="Customer/diver details">
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
                <h3 className="font-medium">{formatCustomerName(customer)}</h3>
                <p className="text-sm text-muted-foreground">
                  {formatEnum(bookingCustomer.role)}
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

              <EquipmentDetails bookingCustomer={bookingCustomer} />

              {includesFunDive ? (
                <FunDiverDetails bookingCustomer={bookingCustomer} />
              ) : null}
            </div>
          );
        })
      )}
    </ReviewDetailsCard>
  );
}

function EquipmentDetails({
  bookingCustomer,
}: {
  bookingCustomer: BookingDetailsItem['customers'][number];
}) {
  return (
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
        <Field label="Shoe size" value={bookingCustomer.shoeSize?.toString()} />
      </div>
    </div>
  );
}

function FunDiverDetails({
  bookingCustomer,
}: {
  bookingCustomer: BookingDetailsItem['customers'][number];
}) {
  return (
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
  );
}

function DepositsSection({ booking }: { booking: BookingDetailsItem }) {
  return (
    <ReviewDetailsCard title="Deposit/payment details">
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
            <Field label="Payment notes" value={deposit.notes} />
          </div>
        ))
      )}
    </ReviewDetailsCard>
  );
}
