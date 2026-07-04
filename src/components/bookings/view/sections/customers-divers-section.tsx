import type { BookingDetailsItem } from '@/features/bookings/queries';
import { BookingCustomerRole } from '@/generated/prisma/enums';
import {
  formatCustomerName,
  formatDate,
  formatEnum,
} from '../booking-detail-display';
import { Field, Section } from '../booking-detail-layout';

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
        <Field label="Role in booking" value={formatEnum(customerBooking.role)} />
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
          <Field label="Last dive date" value={formatDate(customerBooking.lastDiveAt)} />
          <Field label="Logged dives" value={customerBooking.divesLogged} />
        </CustomerFieldGroup>
      ) : null}

      <CustomerFieldGroup title="Equipment details">
        <Field label="Equipment needed?" value={customerBooking.equipmentNeeded} />
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
export function CustomersDiversSection({
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
