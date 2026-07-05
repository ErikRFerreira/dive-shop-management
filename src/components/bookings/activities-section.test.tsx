import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';

import { ActivityType } from '@/generated/prisma/enums';
import { ActivitiesSection } from './activities-section';

afterEach(() => {
  cleanup();
});

test('renders shared booking activity cards with formatted operational fields', () => {
  render(
    <ActivitiesSection
      activities={[
        {
          id: 'activity-1',
          activityType: ActivityType.SPECIALTY_COURSE,
          specialtyCourse: 'Nitrox',
          requestedDate: new Date('2026-07-01T00:00:00.000Z'),
          requestedTime: null,
          notes: null,
        },
      ]}
    />,
  );

  expect(screen.getByText('Activity 1')).not.toBeNull();
  expect(screen.getByText('Specialty Course')).not.toBeNull();
  expect(screen.getByText('Specialty course')).not.toBeNull();
  expect(screen.getByText('Nitrox')).not.toBeNull();
  expect(screen.getByText('01 Jul 2026')).not.toBeNull();
  expect(screen.getByText('Requested time')).not.toBeNull();
  expect(screen.getByText('TBD')).not.toBeNull();
  expect(screen.getByText('No activity notes.')).not.toBeNull();
});
