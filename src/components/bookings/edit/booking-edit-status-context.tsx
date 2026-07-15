import { BookingStatusBadge } from '@/components/bookings/booking-status-badge';
import { Card, CardContent } from '@/components/ui/card';
import { BookingStatus } from '@/generated/prisma/enums';

type BookingEditStatusContextProps = {
  status: BookingStatus;
  needsMoreInfoReason: string | null;
  adminNotes: string | null;
};

type BookingEditStatusCopy = {
  title: string;
  description: string;
};

const statusCopy: Record<BookingStatus, BookingEditStatusCopy> = {
  [BookingStatus.DRAFT]: {
    title: 'Draft',
    description:
      'This booking is still a draft. Save changes or submit it for approval when it is ready.',
  },
  [BookingStatus.PENDING_APPROVAL]: {
    title: 'Pending Approval',
    description:
      'This booking is waiting for an Admin or Manager to review it.',
  },
  [BookingStatus.NEEDS_MORE_INFO]: {
    title: 'Needs More Info',
    description:
      'Admin requested more information before this booking can be approved.',
  },
  [BookingStatus.APPROVED]: {
    title: 'Approved',
    description: 'This booking has been approved.',
  },
  [BookingStatus.SCHEDULED]: {
    title: 'Scheduled',
    description:
      'This booking is approved and included on the internal schedule.',
  },
  [BookingStatus.CANCELLED]: {
    title: 'Cancelled',
    description: 'This booking has been cancelled.',
  },
};

/**
 * Resolves the administrator request shown while editing a Needs More Info booking.
 *
 * @param needsMoreInfoReason - Request recorded by the active Needs More Info workflow.
 * @param adminNotes - Legacy administrator review notes used as a fallback.
 * @returns The first non-empty request or the safe empty-note message.
 */
function getAdminRequest(
  needsMoreInfoReason: string | null,
  adminNotes: string | null,
) {
  return (
    needsMoreInfoReason?.trim() ||
    adminNotes?.trim() ||
    'No admin note provided.'
  );
}

/**
 * Renders compact workflow context above an existing booking edit form.
 *
 * @param props - Current booking status and the existing administrator note sources.
 * @returns A status card with additional administrator guidance when more information is required.
 */
export function BookingEditStatusContext({
  status,
  needsMoreInfoReason,
  adminNotes,
}: BookingEditStatusContextProps) {
  const copy = statusCopy[status];

  return (
    <Card className="gap-0 rounded-2xl border-border py-0 shadow-sm">
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <p className="text-sm text-muted-foreground">{copy.description}</p>
          {status === BookingStatus.NEEDS_MORE_INFO ? (
            <div className="pt-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Admin request
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
                {getAdminRequest(needsMoreInfoReason, adminNotes)}
              </p>
            </div>
          ) : null}
        </div>
        <BookingStatusBadge status={status} />
      </CardContent>
    </Card>
  );
}
