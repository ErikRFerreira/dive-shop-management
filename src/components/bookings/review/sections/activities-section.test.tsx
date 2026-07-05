import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';

import { ActivityType } from '@/generated/prisma/enums';
import { ActivitiesSection } from './activities-section';

afterEach(() => {
  cleanup();
});

test('shows TBD and empty activity notes for missing review activity fields', () => {
  render(
    <ActivitiesSection
      activities={[
        {
          id: 'activity-1',
          activityType: ActivityType.FUN_DIVE,
          specialtyCourse: null,
          requestedDate: new Date('2026-07-01T00:00:00.000Z'),
          requestedTime: null,
          notes: null,
        },
      ]}
    />,
  );

  expect(screen.getByText('Requested time')).not.toBeNull();
  expect(screen.getByText('TBD')).not.toBeNull();
  expect(screen.getByText('No activity notes.')).not.toBeNull();
});
