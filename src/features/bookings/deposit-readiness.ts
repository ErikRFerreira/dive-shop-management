import type { BookingDetailsItem } from '@/features/bookings/queries';
import { DepositStatus } from '@/generated/prisma/enums';
import { formatEnumLabel } from '@/lib/format';

export type DepositReadiness = {
  label: string;
  status: 'complete' | 'missing' | 'not required';
  description: string;
};

/**
 * Formats a short staff-facing list with a final conjunction.
 *
 * @param values - Display values to join.
 * @returns A comma-separated list ending with "and" when needed.
 */
function formatList(values: string[]) {
  if (values.length <= 1) return values[0] ?? '';
  if (values.length === 2) return `${values[0]} and ${values[1]}`;

  return `${values.slice(0, -1).join(', ')}, and ${values.at(-1)}`;
}

/**
 * Builds the shared deposit readiness result without changing deposit requirements.
 *
 * Paid and partially paid deposits require a positive amount, currency, and paid-to
 * value. All other recorded statuses remain non-blocking under the existing rules.
 *
 * @param deposits - Deposit records loaded with a booking detail payload.
 * @returns Staff-facing readiness label, status, and explanatory description.
 */
export function getDepositReadiness(
  deposits: BookingDetailsItem['deposits'],
): DepositReadiness {
  if (deposits.length === 0) {
    return {
      label: 'Deposit not required',
      status: 'not required',
      description: 'No deposit recorded.',
    };
  }

  const paidDeposits = deposits.filter(
    (deposit) =>
      deposit.status === DepositStatus.PAID ||
      deposit.status === DepositStatus.PARTIALLY_PAID,
  );

  if (paidDeposits.length === 0) {
    const recordedStatuses = Array.from(
      new Set(deposits.map((deposit) => formatEnumLabel(deposit.status))),
    );
    const statusLabel = formatList(recordedStatuses);

    return {
      label: 'Deposit details not required',
      status: 'not required',
      description: `Recorded deposit ${recordedStatuses.length === 1 ? 'status' : 'statuses'}: ${statusLabel}.`,
    };
  }

  const missingFields = [
    paidDeposits.some(
      (deposit) => deposit.amount === null || !deposit.amount.gt(0),
    )
      ? 'amount'
      : null,
    paidDeposits.some((deposit) => !deposit.currency?.trim())
      ? 'currency'
      : null,
    paidDeposits.some((deposit) => !deposit.paidTo?.trim()) ? 'paid to' : null,
  ].filter((field): field is string => field !== null);

  if (missingFields.length > 0) {
    return {
      label: 'Deposit details incomplete',
      status: 'missing',
      description: `Missing payment ${missingFields.length === 1 ? 'detail' : 'details'}: ${formatList(missingFields)}.`,
    };
  }

  return {
    label: 'Deposit details complete',
    status: 'complete',
    description: 'Payment details are recorded.',
  };
}
