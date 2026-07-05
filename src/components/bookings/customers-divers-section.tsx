import type { BookingDetailsItem } from '@/features/bookings/queries';
import { BookingCustomerRole } from '@/generated/prisma/enums';
import { UserRound } from 'lucide-react';
import {
  formatBookingCustomerName,
  formatBookingDate,
  formatBookingEnum,
} from './booking-display-utils';
import {
  BookingInfoField,
  BookingInfoFieldGroup,
  BookingInfoSection,
} from './booking-info-layout';

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
    <div className="space-y-6 rounded-xl border bg-muted/30 p-4 sm:col-span-2">
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-inset ring-primary/20">
          <UserRound className="size-4" />
        </span>
        <h3 className="font-semibold">{formatBookingCustomerName(customer)}</h3>
        {customerBooking.role === BookingCustomerRole.PRIMARY_CONTACT ? (
          <p className="inline-flex items-center gap-1.5 rounded-full bg-ocean/10 px-2.5 py-1 text-xs font-medium text-ocean ring-1 ring-inset ring-ocean/20">
            <span className="size-1.5 rounded-full bg-current" aria-hidden />{' '}
            Primary contact
          </p>
        ) : null}
      </div>

      <BookingInfoFieldGroup title="Contact details">
        <BookingInfoField
          label="Customer name"
          value={formatBookingCustomerName(customer)}
        />
        <BookingInfoField label="Chinese name" value={customer.chineseName} />
        <BookingInfoField label="WeChat ID" value={customer.weChatId} />
        <BookingInfoField
          label="WhatsApp number"
          value={customer.whatsAppNumber}
        />
        <BookingInfoField label="Email" value={customer.email} />
        <BookingInfoField label="Phone" value={customer.phone} />
        <BookingInfoField
          label="Preferred language"
          value={formatBookingEnum(customer.preferredLanguage)}
        />
      </BookingInfoFieldGroup>

      <BookingInfoFieldGroup title="Booking logistics" divider={true}>
        <BookingInfoField
          label="Hotel / pickup location"
          value={customerBooking.hotelAtBooking ?? customer.hotel}
        />
        <BookingInfoField
          label="Primary contact"
          value={
            customerBooking.role === BookingCustomerRole.PRIMARY_CONTACT
              ? 'Yes'
              : 'No'
          }
        />
        <BookingInfoField
          label="Role in booking"
          value={formatBookingEnum(customerBooking.role)}
        />
      </BookingInfoFieldGroup>

      {includesFunDive ? (
        <BookingInfoFieldGroup title="Diving experience" divider={true}>
          <BookingInfoField
            label="Certification level"
            value={customerBooking.certificationLevel}
          />
          <BookingInfoField
            label="Certification agency"
            value={customerBooking.certificationAgency}
          />
          <BookingInfoField
            label="Last dive date"
            value={formatBookingDate(customerBooking.lastDiveAt)}
          />
          <BookingInfoField
            label="Logged dives"
            value={customerBooking.divesLogged}
          />
        </BookingInfoFieldGroup>
      ) : null}

      <BookingInfoFieldGroup title="Equipment details" divider={true}>
        <BookingInfoField
          label="Equipment needed?"
          value={customerBooking.equipmentNeeded}
        />
        <BookingInfoField
          label="Height"
          value={
            customerBooking.heightCm === null
              ? null
              : `${customerBooking.heightCm} cm`
          }
        />
        <BookingInfoField
          label="Weight"
          value={
            customerBooking.weightKg === null
              ? null
              : `${customerBooking.weightKg.toString()} kg`
          }
        />
        <BookingInfoField
          label="Shoe size"
          value={customerBooking.shoeSize?.toString()}
        />
      </BookingInfoFieldGroup>

      <BookingInfoFieldGroup title="Notes" divider={true}>
        <div className="sm:col-span-2">
          <BookingInfoField
            label="Customer notes"
            value={customerBooking.notes?.trim() || 'No customer notes.'}
          />
        </div>
      </BookingInfoFieldGroup>
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
    <BookingInfoSection title="Customers & divers">
      {booking.customers.length === 0 ? (
        <p className="text-sm text-muted-foreground sm:col-span-2">
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
    </BookingInfoSection>
  );
}
