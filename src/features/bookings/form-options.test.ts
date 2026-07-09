import { expect, test } from 'vitest';

import { ActivityType } from '@/generated/prisma/enums';
import { activityTypeOptions } from './form-options';

test('includes Emergency First Response in activity type options', () => {
  expect(activityTypeOptions).toContain(ActivityType.EMERGENCY_FIRST_RESPONSE);
});
