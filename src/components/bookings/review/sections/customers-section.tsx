import type { BookingDetailsItem } from '@/features/bookings/queries';
import { BookingCustomerRole } from '@/generated/prisma/enums';
import {
  Field,
  ReviewDetailsCard,
  formatCustomerName,
  formatDate,
  formatEnum,
} from '../booking-review-display';

/**
 * Renders a titled field group inside one customer or diver review card.
 *
 * @param props - Group title, fields, and optional divider flag.
 * @returns Grouped customer review fields.
 */
function CustomerFieldGroup({
  children,
  title,
  divider = false,
}: {
  children: React.ReactNode;
  title: string;
  divider?: boolean;
}) {
  return (
    <div className={divider ? 'border-t border-muted-foreground/20 pt-4' : ''}>
      <h4 className="text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h4>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}

/**
 * Renders the equipment fields for one booking customer.
 *
 * @param props - Booking customer row with equipment and sizing fields.
 * @returns Equipment review field group.
 */
function EquipmentFieldGroup({
  bookingCustomer,
}: {
  bookingCustomer: BookingDetailsItem['customers'][number];
}) {
  return (
    <CustomerFieldGroup title="Equipment details" divider>
      <Field label="Equipment needed?" value={bookingCustomer.equipmentNeeded} />
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
    </CustomerFieldGroup>
  );
}

/**
 * Renders fun-dive experience fields when the reviewed booking includes a fun dive.
 *
 * @param props - Booking customer row with diving experience fields.
 * @returns Diving experience review field group.
 */
function DivingExperienceFieldGroup({
  bookingCustomer,
}: {
  bookingCustomer: BookingDetailsItem['customers'][number];
}) {
  return (
    <CustomerFieldGroup title="Diving experience" divider>
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
      <Field label="Logged dives" value={bookingCustomer.divesLogged} />
    </CustomerFieldGroup>
  );
}

/**
 * Renders the customer and diver details reviewed by admins and managers.
 *
 * @param props - Booking detail payload and fun-dive display flag.
 * @returns Customer/diver review section.
 */
export function CustomersSection({
  booking,
  includesFunDive,
}: {
  booking: BookingDetailsItem;
  includesFunDive: boolean;
}) {
  return (
    <ReviewDetailsCard title="Customers & divers">
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

              <CustomerFieldGroup title="Booking logistics" divider>
                <Field
                  label="Hotel / pickup location"
                  value={bookingCustomer.hotelAtBooking ?? customer.hotel}
                />
                <Field
                  label="Primary contact"
                  value={
                    bookingCustomer.role === BookingCustomerRole.PRIMARY_CONTACT
                      ? 'Yes'
                      : 'No'
                  }
                />
                <Field label="Role in booking" value={formatEnum(bookingCustomer.role)} />
              </CustomerFieldGroup>

              {includesFunDive ? (
                <DivingExperienceFieldGroup
                  bookingCustomer={bookingCustomer}
                />
              ) : null}

              <EquipmentFieldGroup bookingCustomer={bookingCustomer} />

              <CustomerFieldGroup title="Notes" divider>
                <div className="sm:col-span-2">
                  <Field
                    label="Customer notes"
                    value={bookingCustomer.notes?.trim() || 'No customer notes.'}
                  />
                </div>
              </CustomerFieldGroup>
            </div>
          );
        })
      )}
    </ReviewDetailsCard>
  );
}
