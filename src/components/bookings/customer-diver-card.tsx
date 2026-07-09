'use client';

import { AssignmentBadge } from '@/components/common/assignment-badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import type { BookingDetailsItem } from '@/features/bookings/queries';
import { BookingCustomerRole } from '@/generated/prisma/enums';
import { cn } from '@/lib/utils';
import { UserRound } from 'lucide-react';
import {
  formatBookingCustomerName,
  formatBookingDate,
  formatBookingEnum,
} from './booking-display-utils';
import { BookingInfoField, BookingInfoFieldGroup } from './booking-info-layout';
import {
  ParticipantStatusBadge,
  ParticipantStatusSelect,
} from './participant-status-controls';

/**
 * Renders one customer or diver with contact details visible and secondary
 * booking details collapsed behind an accordion.
 *
 * @param props - Booking, customer row, fun-dive display flag, and participant status management permission.
 * @returns Readable customer/diver card.
 */
export function CustomerDiverCard({
  booking,
  canManageParticipantStatus,
  customerBooking,
  includesFunDive,
  isHistorical = false,
}: {
  booking: BookingDetailsItem;
  canManageParticipantStatus: boolean;
  customerBooking: BookingDetailsItem['customers'][number];
  includesFunDive: boolean;
  isHistorical?: boolean;
}) {
  const customer = customerBooking.customer;

  return (
    <div
      className={cn(
        'rounded-xl border bg-muted/30 p-4 sm:col-span-2',
        isHistorical && 'border-dashed bg-muted/15 text-muted-foreground',
      )}
    >
      <Accordion collapsible type="single">
        <AccordionItem className="border-0" value="participant-details">
          <div className="flex items-center gap-3 justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-inset ring-primary/20">
                <UserRound className="size-4" />
              </span>
              <h3
                className={cn(
                  'font-semibold',
                  isHistorical ? 'text-muted-foreground' : 'text-foreground',
                )}
              >
                {formatBookingCustomerName(customer)}
              </h3>
              {customerBooking.role === BookingCustomerRole.PRIMARY_CONTACT ? (
                <AssignmentBadge
                  label="Primary contact"
                  variant="secondary"
                  colorScheme="ocean"
                  className="px-2.5 py-1 text-xs font-medium"
                />
              ) : null}
              <ParticipantStatusBadge
                status={customerBooking.participationStatus}
              />
              {canManageParticipantStatus ? (
                <ParticipantStatusSelect
                  bookingId={booking.id}
                  customerId={customerBooking.customerId}
                  status={customerBooking.participationStatus}
                />
              ) : null}
            </div>

            <ParticipantDetailsTrigger />
          </div>

          <div className="mt-6">
            <BookingInfoFieldGroup title="Contact details">
              <BookingInfoField
                label="Customer name"
                value={formatBookingCustomerName(customer)}
              />
              <BookingInfoField
                label="Chinese name"
                value={customer.chineseName}
              />
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
          </div>

          <AccordionContent className="space-y-6 pb-0 pt-6">
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
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

/**
 * Renders the text-only accordion toggle for secondary participant details.
 *
 * @returns A compact trigger that swaps between show-more and show-less copy.
 */
function ParticipantDetailsTrigger() {
  return (
    <AccordionTrigger className="ml-auto flex-none items-center rounded-full border-border bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground shadow-sm hover:no-underline hover:text-foreground [&_[data-slot=accordion-trigger-icon]]:hidden">
      <span className="group-aria-expanded/accordion-trigger:hidden">
        Show more info
      </span>
      <span className="hidden group-aria-expanded/accordion-trigger:inline">
        Show less
      </span>
    </AccordionTrigger>
  );
}
