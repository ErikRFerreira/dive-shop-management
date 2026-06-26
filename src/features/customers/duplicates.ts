/**
 * Purpose: This file adds a strong-match duplicate detection layer for customer records.
 *
 * @module features/customers/duplicates
 */

import 'server-only';

import { Prisma } from '@/generated/prisma/client';
import { db } from '@/lib/db';
import {
  customerSearchArgs,
  mapCustomerSearchResult,
} from '@/features/customers/queries';
import type {
  CustomerSearchResult,
  DuplicateCustomerMatchField,
  PotentialDuplicateCustomer,
  PotentialDuplicateCustomerInput,
} from './types';

/**
 * Normalizes free-text input into a non-empty trimmed value or `null`.
 *
 * @param value - Raw string-like value from customer intake/search input.
 * @returns Trimmed text, or `null` when the value is missing or blank.
 */
function normalizedText(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized || null;
}

/**
 * Normalizes text for case-insensitive in-memory comparison.
 *
 * @param value - Raw string-like value to compare.
 * @returns Lowercase trimmed text, or `null` when the value is missing or blank.
 */
function normalizedComparable(value: string | null | undefined) {
  return normalizedText(value)?.toLocaleLowerCase() ?? null;
}

/**
 * Creates a Prisma nullable string filter for exact case-insensitive matching.
 *
 * @param value - Non-empty text to match exactly.
 * @returns Prisma filter suitable for duplicate identity fields.
 */
function exactTextFilter(value: string): Prisma.StringNullableFilter {
  return {
    equals: value,
    mode: 'insensitive',
  };
}

/**
 * Builds the comparable display name used by duplicate name checks.
 *
 * @param customer - Customer name fields from a mapped search result.
 * @returns Full name when present, otherwise first and last name joined.
 */
function displayCustomerNameForMatch(
  customer: Pick<CustomerSearchResult, 'fullName' | 'firstName' | 'lastName'>,
) {
  return (
    normalizedText(customer.fullName) ??
    [customer.firstName, customer.lastName]
      .map(normalizedText)
      .filter((part): part is string => Boolean(part))
      .join(' ')
      .trim()
  );
}

/**
 * Determines which strong duplicate criteria matched a candidate customer.
 *
 * @param customer - Mapped customer candidate returned from the database.
 * @param input - Normalized duplicate-detection input values.
 * @returns Matched field identifiers; empty when the candidate is not a true strong match.
 */
function getMatchedFields(
  customer: CustomerSearchResult,
  input: Required<
    Pick<
      PotentialDuplicateCustomerInput,
      'name' | 'chineseName' | 'weChatId' | 'whatsAppNumber' | 'email' | 'phone'
    >
  >,
) {
  const matchedFields: DuplicateCustomerMatchField[] = [];

  if (
    normalizedComparable(input.weChatId) &&
    normalizedComparable(customer.weChatId) ===
    normalizedComparable(input.weChatId)
  ) {
    matchedFields.push('weChatId');
  }

  if (
    normalizedComparable(input.whatsAppNumber) &&
    normalizedComparable(customer.whatsAppNumber) ===
    normalizedComparable(input.whatsAppNumber)
  ) {
    matchedFields.push('whatsAppNumber');
  }

  if (
    normalizedComparable(input.email) &&
    normalizedComparable(customer.email) === normalizedComparable(input.email)
  ) {
    matchedFields.push('email');
  }

  if (
    normalizedComparable(input.phone) &&
    normalizedComparable(customer.phone) === normalizedComparable(input.phone)
  ) {
    matchedFields.push('phone');
  }

  if (
    normalizedComparable(input.name) &&
    normalizedComparable(input.chineseName) &&
    normalizedComparable(displayCustomerNameForMatch(customer)) ===
      normalizedComparable(input.name) &&
    normalizedComparable(customer.chineseName) ===
      normalizedComparable(input.chineseName)
  ) {
    matchedFields.push('nameAndChineseName');
  }

  return matchedFields;
}

/**
 * Finds existing customers that strongly match identifying customer input.
 *
 * @param input - Customer identity values to compare against existing records.
 * @returns Potential duplicates with the strong-match fields that caused each result.
 *
 * @remarks Empty values are ignored, and name matching requires both name and Chinese name.
 */
export async function findPotentialDuplicateCustomers(
  input: PotentialDuplicateCustomerInput,
): Promise<PotentialDuplicateCustomer[]> {
  const normalizedInput = {
    name: normalizedText(input.name),
    chineseName: normalizedText(input.chineseName),
    weChatId: normalizedText(input.weChatId),
    whatsAppNumber: normalizedText(input.whatsAppNumber),
    email: normalizedText(input.email),
    phone: normalizedText(input.phone),
  };
  const duplicateClauses: Prisma.CustomerWhereInput[] = [];

  if (normalizedInput.weChatId) {
    duplicateClauses.push({ weChatId: exactTextFilter(normalizedInput.weChatId) });
  }

  if (normalizedInput.whatsAppNumber) {
    duplicateClauses.push({
      whatsAppNumber: exactTextFilter(normalizedInput.whatsAppNumber),
    });
  }

  if (normalizedInput.email) {
    duplicateClauses.push({ email: exactTextFilter(normalizedInput.email) });
  }

  if (normalizedInput.phone) {
    duplicateClauses.push({ phone: exactTextFilter(normalizedInput.phone) });
  }

  if (normalizedInput.name && normalizedInput.chineseName) {
    duplicateClauses.push({
      chineseName: exactTextFilter(normalizedInput.chineseName),
    });
  }

  if (duplicateClauses.length === 0) {
    return [];
  }

  const customers = await db.customer.findMany({
    ...customerSearchArgs,
    where: {
      AND: [
        input.excludeCustomerId
          ? {
              id: {
                not: input.excludeCustomerId,
              },
            }
          : {},
        {
          OR: duplicateClauses,
        },
      ],
    },
    orderBy: {
      updatedAt: 'desc',
    },
    take: 10,
  });

  return customers
    .map((customer) => {
      const result = mapCustomerSearchResult(customer);
      const matchedFields = getMatchedFields(result, {
        name: normalizedInput.name,
        chineseName: normalizedInput.chineseName,
        weChatId: normalizedInput.weChatId,
        whatsAppNumber: normalizedInput.whatsAppNumber,
        email: normalizedInput.email,
        phone: normalizedInput.phone,
      });

      return {
        ...result,
        matchedFields,
      };
    })
    .filter((customer) => customer.matchedFields.length > 0);
}
