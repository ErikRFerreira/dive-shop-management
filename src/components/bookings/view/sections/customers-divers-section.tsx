import type { BookingDetailsItem } from '@/features/bookings/queries';
import { BookingCustomerRole } from '@/generated/prisma/enums';
import {
  formatCustomerName,
  formatDate,
  formatEnum,
} from '../booking-detail-display';
import { Field, Section } from '../booking-detail-layout';
import { UserRound } from 'lucide-react';

/**
 * Renders a small titled field group inside a customer card.
 *
 * @param props - Group title and fields.
 * @returns Customer card subgroup.
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
  console.log(customerBooking);

  return (
    <div className="space-y-6 rounded-xl border p-4 sm:col-span-2 bg-muted/30">
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-inset ring-primary/20">
          <UserRound className="size-4" />
        </span>
        <h3 className="font-semibold">{formatCustomerName(customer)}</h3>
        {customerBooking.role === 'PRIMARY_CONTACT' ? (
          <p className="bg-ocean/10 text-ocean ring-ocean/20 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset">
            <span className="size-1.5 rounded-full bg-current" aria-hidden />{' '}
            Primary contact
          </p>
        ) : null}
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

      <CustomerFieldGroup title="Booking logistics" divider={true}>
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
        <CustomerFieldGroup title="Diving experience" divider={true}>
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

      <CustomerFieldGroup title="Equipment details" divider={true}>
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

      <CustomerFieldGroup title="Notes" divider={true}>
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
