export const demoAccounts = [
  { role: 'Admin', email: 'admin@diveshop.local' },
  { role: 'Customer Service', email: 'cs@diveshop.local' },
  { role: 'Instructor', email: 'erik@diveshop.local' },
] as const;

export type DemoAccountEmail = (typeof demoAccounts)[number]['email'];

/**
 * Checks whether an untrusted value identifies an account offered by the demo UI.
 *
 * @param value - Untrusted account identifier received by the demo login action.
 * @returns Whether the value is one of the explicitly supported demo emails.
 */
export function isDemoAccountEmail(value: unknown): value is DemoAccountEmail {
  return demoAccounts.some((account) => account.email === value);
}
