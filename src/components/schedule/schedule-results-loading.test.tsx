import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';

import { ScheduleResultsPendingSkeleton } from './schedule-results-loading';

afterEach(() => {
  cleanup();
});

test('renders pending feedback for schedule results without replacing filters', () => {
  render(<ScheduleResultsPendingSkeleton />);

  expect(screen.getByRole('status').textContent).toBe('Updating results...');
  expect(screen.queryByLabelText('Schedule filters')).toBeNull();
});
