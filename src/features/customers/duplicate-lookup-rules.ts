import type { PotentialDuplicateCustomerInput } from './types';

export const duplicateCustomerLookupMinimumLengths = {
  name: 2,
  chineseName: 2,
  weChatId: 3,
  whatsAppNumberDigits: 6,
  phoneDigits: 6,
  email: 5,
} as const;

export type DuplicateCustomerIdentitySnapshot = {
  name: string;
  chineseName: string;
  weChatId: string;
  whatsAppNumberDigits: string;
  email: string;
  phoneDigits: string;
};

/**
 * Normalizes text for stable duplicate-gating decisions.
 *
 * @param value - Raw customer identity text.
 * @returns Trimmed text or an empty string.
 */
function normalizedText(value: string | null | undefined) {
  return value?.trim() ?? '';
}

/**
 * Extracts digits from a phone-like value so thresholds ignore punctuation.
 *
 * @param value - Raw phone or WhatsApp text.
 * @returns Digits-only text.
 */
function digitsOnly(value: string | null | undefined) {
  return normalizedText(value).replace(/\D/g, '');
}

/**
 * Creates a normalized identity snapshot for comparing staff edits.
 *
 * @param input - Raw customer identity values.
 * @returns Stable comparable duplicate identity snapshot.
 */
export function getDuplicateCustomerIdentitySnapshot(
  input: PotentialDuplicateCustomerInput,
): DuplicateCustomerIdentitySnapshot {
  return {
    name: normalizedText(input.name).toLocaleLowerCase(),
    chineseName: normalizedText(input.chineseName).toLocaleLowerCase(),
    weChatId: normalizedText(input.weChatId).toLocaleLowerCase(),
    whatsAppNumberDigits: digitsOnly(input.whatsAppNumber),
    email: normalizedText(input.email).toLocaleLowerCase(),
    phoneDigits: digitsOnly(input.phone),
  };
}

/**
 * Compares two duplicate identity snapshots.
 *
 * @param first - First normalized snapshot.
 * @param second - Second normalized snapshot.
 * @returns Whether the identity values are equivalent.
 */
export function areDuplicateCustomerIdentitySnapshotsEqual(
  first: DuplicateCustomerIdentitySnapshot,
  second: DuplicateCustomerIdentitySnapshot,
) {
  return (
    first.name === second.name &&
    first.chineseName === second.chineseName &&
    first.weChatId === second.weChatId &&
    first.whatsAppNumberDigits === second.whatsAppNumberDigits &&
    first.email === second.email &&
    first.phoneDigits === second.phoneDigits
  );
}

/**
 * Removes duplicate lookup fields that are too short to query safely.
 *
 * @param input - Raw duplicate lookup input.
 * @returns Filtered duplicate lookup input, or `null` when no field is eligible.
 */
export function getEligibleDuplicateCustomerLookupInput(
  input: PotentialDuplicateCustomerInput,
): PotentialDuplicateCustomerInput | null {
  const name = normalizedText(input.name);
  const chineseName = normalizedText(input.chineseName);
  const weChatId = normalizedText(input.weChatId);
  const whatsAppNumber = normalizedText(input.whatsAppNumber);
  const email = normalizedText(input.email);
  const phone = normalizedText(input.phone);
  const eligibleInput: PotentialDuplicateCustomerInput = {};

  if (input.excludeCustomerId) {
    eligibleInput.excludeCustomerId = input.excludeCustomerId;
  }

  if (
    name.length >= duplicateCustomerLookupMinimumLengths.name &&
    chineseName.length >= duplicateCustomerLookupMinimumLengths.chineseName
  ) {
    eligibleInput.name = name;
    eligibleInput.chineseName = chineseName;
  }

  if (weChatId.length >= duplicateCustomerLookupMinimumLengths.weChatId) {
    eligibleInput.weChatId = weChatId;
  }

  if (
    digitsOnly(whatsAppNumber).length >=
    duplicateCustomerLookupMinimumLengths.whatsAppNumberDigits
  ) {
    eligibleInput.whatsAppNumber = whatsAppNumber;
  }

  if (
    email.length >= duplicateCustomerLookupMinimumLengths.email &&
    email.includes('@')
  ) {
    eligibleInput.email = email;
  }

  if (
    digitsOnly(phone).length >= duplicateCustomerLookupMinimumLengths.phoneDigits
  ) {
    eligibleInput.phone = phone;
  }

  return Object.keys(eligibleInput).some((key) => key !== 'excludeCustomerId')
    ? eligibleInput
    : null;
}
