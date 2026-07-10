import type { BookingDetailsItem } from '@/features/bookings/queries';
import { CustomerDiverCard } from './customer-diver-card';

/**
 * Renders one participant status group inside booking detail.
 *
 * @param props - Group title, participant rows, and card display options.
 * @returns Grouped participant cards, or null when no rows exist.
 */
export function ParticipantGroup({
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
