import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';

import { ScheduleResultsPendingSkeleton } from './schedule-results-loading';

afterEach(() => {
  cleanup();
});

test('renders pending feedback for schedule results without replacing filters', () => {
  const { container } = render(<ScheduleResultsPendingSkeleton />);
  const viewSkeletons = container.querySelector('.grid-cols-4');

  expect(screen.getByRole('status').textContent).toBe('Updating results...');
  expect(screen.queryByLabelText('Schedule filters')).toBeNull();
  expect(viewSkeletons).not.toBeNull();
  expect(viewSkeletons?.classList.contains('w-full')).toBe(true);
  expect(viewSkeletons?.children).toHaveLength(4);
});
