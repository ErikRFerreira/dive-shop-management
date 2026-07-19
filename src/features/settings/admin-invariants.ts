import 'server-only';

import type { Prisma } from '@/generated/prisma/client';
import { UserRole } from '@/generated/prisma/enums';

type ActiveAdminCounter = {
  count(args: { where: Prisma.UserWhereInput }): Promise<number>;
};

/**
 * Checks whether an active ADMIN other than the target remains available.
 *
 * The caller supplies either the root Prisma user delegate or a transaction
 * delegate so advisory UI checks and authoritative mutations share the exact
 * same persisted-user predicate.
 *
 * @param user - Prisma user delegate used to count persisted accounts.
 * @param targetUserId - User excluded from the active ADMIN backup count.
 * @returns Whether at least one different active ADMIN exists.
 */
export async function hasAnotherActiveAdmin(
  user: ActiveAdminCounter,
  targetUserId: string,
): Promise<boolean> {
  const otherActiveAdminCount = await user.count({
    where: {
      role: UserRole.ADMIN,
      isActive: true,
      id: { not: targetUserId },
    },
  });

  return otherActiveAdminCount > 0;
}
