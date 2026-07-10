/**
 * Interprets booking-specific rental equipment values stored as legacy free
 * text or the current YES/NO choices.
 *
 * @param value - Stored or form equipment-needed value.
 * @returns True unless the value clearly says rental equipment is not needed.
 */
export function isEquipmentNeeded(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase();

  if (
    normalized === 'no' ||
    normalized === 'none' ||
    normalized === 'n/a' ||
    normalized === 'na' ||
    normalized === 'not needed' ||
    normalized?.includes('no equipment') ||
    normalized?.includes('own equipment') ||
    normalized?.includes('bringing own')
  ) {
    return false;
  }

  return true;
}

/**
 * Normalizes legacy equipment text into the current controlled form choices.
 *
 * @param value - Stored or form equipment-needed value.
 * @returns `YES` when equipment should be assumed needed, otherwise `NO`.
 */
export function normalizeEquipmentNeededChoice(
  value: string | null | undefined,
): 'YES' | 'NO' {
  return isEquipmentNeeded(value) ? 'YES' : 'NO';
}

/**
 * Formats equipment-needed values for read-only booking pages.
 *
 * @param value - Stored equipment-needed value from a booking/customer row.
 * @returns Staff-facing Yes/No copy.
 */
export function formatEquipmentNeeded(value: string | null | undefined) {
  return isEquipmentNeeded(value) ? 'Yes' : 'No';
}
