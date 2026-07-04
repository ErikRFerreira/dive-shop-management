import { MissingInfoPanel } from '@/components/bookings/missing-info-panel';

/**
 * Renders the workflow panel shown when a booking needs more information.
 *
 * @param props - Missing-information reason from the booking workflow.
 * @returns Missing-information explanation for the main detail column.
 */
export function NeedsMoreInfoWorkflow({ reason }: { reason: string | null }) {
  return (
    <div>
      <MissingInfoPanel reason={reason} />
    </div>
  );
}
