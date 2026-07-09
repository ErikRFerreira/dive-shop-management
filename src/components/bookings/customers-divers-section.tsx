'use client';

import { useId, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { AssignmentBadge } from '@/components/common/assignment-badge';
import { AddScheduledBookingParticipantDialog } from '@/components/bookings/add-scheduled-booking-participant-dialog';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  updateBookingParticipantStatus,
  type BookingParticipantStatusActionResult,
} from '@/features/bookings/actions';
import {
  formatParticipantStatusLabel,
  getActiveBookingParticipants,
  getInactiveBookingParticipants,
} from '@/features/bookings/participants';
import type { BookingDetailsItem } from '@/features/bookings/queries';
import {
  BookingCustomerRole,
  BookingParticipantStatus,
  type BookingParticipantStatus as BookingParticipantStatusValue,
} from '@/generated/prisma/enums';
import { cn } from '@/lib/utils';
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

const participantStatuses = Object.values(BookingParticipantStatus);
const participantStatusSelectClass =
  'h-8 min-w-36 truncate rounded-lg border border-border bg-background px-2.5 text-xs text-foreground shadow-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 [&>span]:truncate';

type ParticipantStatusActionErrorProps = {
  message?: string;
};

/**
 * Renders one customer or diver in grouped read-only sections.
 *
 * @param props - Booking, customer row, fun-dive display flag, and participant status management permission.
 * @returns Readable customer/diver card.
 */
function CustomerDiverCard({
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
        'space-y-6 rounded-xl border bg-muted/30 p-4 sm:col-span-2',
        isHistorical && 'border-dashed bg-muted/15 text-muted-foreground',
      )}
    >
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
        <ParticipantStatusBadge status={customerBooking.participationStatus} />
        {canManageParticipantStatus ? (
          <ParticipantStatusSelect
            bookingId={booking.id}
            customerId={customerBooking.customerId}
            status={customerBooking.participationStatus}
          />
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
 * Renders a compact visual label for a participant's operational status.
 *
 * @param props - Participant status to format.
 * @returns Status badge with severity matched to operational meaning.
 */
function ParticipantStatusBadge({
  status,
}: {
  status: BookingParticipantStatusValue;
}) {
  const variant =
    status === BookingParticipantStatus.ACTIVE
      ? 'secondary'
      : status === BookingParticipantStatus.CANCELLED
        ? 'destructive'
        : 'outline';

  return (
    <Badge variant={variant}>{formatParticipantStatusLabel(status)}</Badge>
  );
}

/**
 * Renders the admin/manager participant status picker for a scheduled booking.
 *
 * @param props - Booking/customer identifiers and the current participant status.
 * @returns A compact status select with inline server-action feedback.
 */
function ParticipantStatusSelect({
  bookingId,
  customerId,
  status,
}: {
  bookingId: string;
  customerId: string;
  status: BookingParticipantStatusValue;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const pendingActionRef = useRef(false);
  const [isActionInFlight, setIsActionInFlight] = useState(false);
  const [error, setError] = useState<string>();
  const statusSelectId = useId();
  const isActionPending = isPending || isActionInFlight;

  /**
   * Persists a participant status change through the booking server action.
   *
   * @param nextStatus - New operational status selected by an Admin or Manager.
   */
  function handleStatusChange(nextStatus: BookingParticipantStatusValue) {
    if (nextStatus === status || pendingActionRef.current || isActionPending) {
      return;
    }

    pendingActionRef.current = true;
    setIsActionInFlight(true);
    setError(undefined);
    startTransition(async () => {
      try {
        const result = await updateBookingParticipantStatus(
          bookingId,
          customerId,
          nextStatus,
        );
        handleParticipantStatusActionResult(result, router.refresh, setError);
      } finally {
        pendingActionRef.current = false;
        setIsActionInFlight(false);
      }
    });
  }

  return (
    <div className="grid gap-1">
      <Label className="sr-only" htmlFor={statusSelectId}>
        Participant status
      </Label>
      <Select
        disabled={isActionPending}
        onValueChange={(nextStatus) =>
          handleStatusChange(nextStatus as BookingParticipantStatusValue)
        }
        value={status}
      >
        <SelectTrigger
          id={statusSelectId}
          className={participantStatusSelectClass}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {participantStatuses.map((participantStatus) => (
            <SelectItem key={participantStatus} value={participantStatus}>
              {formatParticipantStatusLabel(participantStatus)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <ParticipantStatusActionError message={error} />
    </div>
  );
}

/**
 * Applies a participant status action result to the client UI.
 *
 * @param result - Result returned by the participant status server action.
 * @param refresh - Callback that refreshes the current route.
 * @param setError - Callback that stores inline error text.
 */
function handleParticipantStatusActionResult(
  result: BookingParticipantStatusActionResult,
  refresh: () => void,
  setError: (message?: string) => void,
) {
  if (result.success) {
    refresh();
    return;
  }

  setError(getParticipantStatusActionErrorMessage(result));
}

/**
 * Formats server action errors for inline participant status display.
 *
 * @param result - Failed participant status action result.
 * @returns A single staff-facing error message.
 */
function getParticipantStatusActionErrorMessage(
  result: Extract<BookingParticipantStatusActionResult, { success: false }>,
) {
  const fieldError = result.fieldErrors
    ? Object.values(result.fieldErrors).flat()[0]
    : undefined;

  return (
    result.formError ?? fieldError ?? 'Unable to update participant status.'
  );
}

/**
 * Renders an accessible inline participant status action error.
 *
 * @param props - Optional error message.
 * @returns Inline error text when a message exists.
 */
function ParticipantStatusActionError({
  message,
}: ParticipantStatusActionErrorProps) {
  return message ? (
    <p aria-live="polite" className="text-xs text-destructive">
      {message}
    </p>
  ) : null;
}

/**
 * Renders one participant status group inside booking detail.
 *
 * @param props - Group title, participant rows, and card display options.
 * @returns Grouped participant cards, or null when no rows exist.
 */
function ParticipantGroup({
  booking,
  canManageParticipantStatus,
  emptyMessage,
  includesFunDive,
  isHistorical = false,
  participants,
  title,
}: {
  booking: BookingDetailsItem;
  canManageParticipantStatus: boolean;
  emptyMessage?: string;
  includesFunDive: boolean;
  isHistorical?: boolean;
  participants: BookingDetailsItem['customers'];
  title: string;
}) {
  if (participants.length === 0 && !emptyMessage) {
    return null;
  }

  return (
    <section className="space-y-3 sm:col-span-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      {participants.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <div className="grid gap-4">
          {participants.map((customerBooking) => (
            <CustomerDiverCard
              booking={booking}
              canManageParticipantStatus={canManageParticipantStatus}
              customerBooking={customerBooking}
              includesFunDive={includesFunDive}
              isHistorical={isHistorical}
              key={customerBooking.customerId}
            />
          ))}
        </div>
      )}
    </section>
  );
}

/**
 * Renders the grouped customer and diver detail cards.
 *
 * @param props - Booking customers, activity context, and participant status permission.
 * @returns Customers and divers section.
 */
export function CustomersDiversSection({
  booking,
  canManageParticipantStatus = false,
  includesFunDive,
}: {
  booking: BookingDetailsItem;
  canManageParticipantStatus?: boolean;
  includesFunDive: boolean;
}) {
  const activeParticipants = getActiveBookingParticipants(booking.customers);
  const historicalParticipants = getInactiveBookingParticipants(
    booking.customers,
  );

  return (
    <BookingInfoSection title="Customers & divers">
      {canManageParticipantStatus ? (
        <div className="flex justify-end sm:col-span-2">
          <AddScheduledBookingParticipantDialog booking={booking} />
        </div>
      ) : null}
      {booking.customers.length === 0 ? (
        <p className="text-sm text-muted-foreground sm:col-span-2">
          No customer or diver details.
        </p>
      ) : (
        <>
          <ParticipantGroup
            booking={booking}
            canManageParticipantStatus={canManageParticipantStatus}
            emptyMessage="No active participants."
            includesFunDive={includesFunDive}
            participants={activeParticipants}
            title="Active participants"
          />
          <ParticipantGroup
            booking={booking}
            canManageParticipantStatus={canManageParticipantStatus}
            includesFunDive={includesFunDive}
            isHistorical
            participants={historicalParticipants}
            title="Historical participants"
          />
        </>
      )}
    </BookingInfoSection>
  );
}
