import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import * as React from 'react';

import type { ScheduleStaffFilterOption } from '@/features/schedule/types';
import { ActivityType, UserRole } from '@/generated/prisma/enums';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mocks.push,
  }),
}));

vi.mock('@/components/ui/select', () => {
  /**
   * Extracts native option elements from mocked shadcn Select children.
   *
   * @param children - Select children that may contain mocked SelectItem nodes.
   * @returns Native option elements for the test double.
   */
  function collectOptions(children: React.ReactNode): React.ReactNode[] {
    return React.Children.toArray(children).flatMap((child) => {
      if (!React.isValidElement<{ children?: React.ReactNode }>(child)) {
        return [];
      }

      if (child.type === SelectItem) {
        return child;
      }

      return collectOptions(child.props.children);
    });
  }

  /**
   * Finds the trigger ID so labels point at the native select mock.
   *
   * @param children - Select children that may include a mocked trigger.
   * @returns The trigger ID when present.
   */
  function getTriggerId(children: React.ReactNode): string | undefined {
    for (const child of React.Children.toArray(children)) {
      if (
        !React.isValidElement<{ id?: string; children?: React.ReactNode }>(
          child,
        )
      ) {
        continue;
      }

      if (child.type === SelectTrigger) {
        return child.props.id;
      }

      const nestedId = getTriggerId(child.props.children);

      if (nestedId) {
        return nestedId;
      }
    }

    return undefined;
  }

  /**
   * Test double for Radix Select using a native select element.
   *
   * @param props - Select props supplied by the component under test.
   * @returns Native select with collected option nodes.
   */
  function Select({
    children,
    disabled,
    onValueChange,
    value,
  }: {
    children: React.ReactNode;
    disabled?: boolean;
    onValueChange?: (value: string) => void;
    value?: string;
  }) {
    return (
      <select
        disabled={disabled}
        id={getTriggerId(children)}
        onChange={(event) => onValueChange?.(event.target.value)}
        value={value ?? ''}
      >
        {collectOptions(children)}
      </select>
    );
  }

  /**
   * Mock passthrough for SelectContent.
   *
   * @param props - Content children.
   * @returns Content children.
   */
  function SelectContent({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
  }

  /**
   * Mock option for SelectItem.
   *
   * @param props - Option value and label.
   * @returns Native option.
   */
  function SelectItem({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
  }) {
    return <option value={value}>{children}</option>;
  }

  /**
   * Mock placeholder for SelectTrigger.
   *
   * @returns Null because Select renders the native control.
   */
  function SelectTrigger() {
    return null;
  }

  /**
   * Mock placeholder for SelectValue.
   *
   * @returns Null because native select displays the selected option.
   */
  function SelectValue() {
    return null;
  }

  return {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  };
});

afterEach(() => {
  cleanup();
  mocks.push.mockReset();
});

import { ScheduleFilters, buildScheduleFilterHref } from './schedule-filters';

/**
 * Builds assignable staff used by schedule filter tests.
 *
 * @param overrides - Staff fields to override for a specific scenario.
 * @returns Assignable staff record.
 */
function staffFilterOption(
  overrides: Partial<ScheduleStaffFilterOption> = {},
): ScheduleStaffFilterOption {
  return {
    id: 'instructor-1',
    name: 'Inez Instructor',
    role: UserRole.INSTRUCTOR,
    ...overrides,
  };
}

/**
 * Renders schedule filters with practical defaults.
 *
 * @param props - Optional component props to override.
 * @returns React Testing Library render result.
 */
function renderScheduleFilters(
  props: Partial<React.ComponentProps<typeof ScheduleFilters>> = {},
) {
  return render(
    <ScheduleFilters
      staffFilterOptions={[staffFilterOption()]}
      filters={{}}
      onFilterChange={mocks.push}
      {...props}
    />,
  );
}

/**
 * Reads option labels from a mocked native select by accessible label.
 *
 * @param label - Select label text.
 * @returns Option labels in rendered order.
 */
function getSelectOptionNames(label: string) {
  const select = screen.getByLabelText(label) as HTMLSelectElement;

  return Array.from(select.options).map((option) => option.textContent);
}

test('shows all activity options when schedule type is all', () => {
  renderScheduleFilters();

  expect(getSelectOptionNames('Activity')).toEqual([
    'All activities',
    'Fun Dive',
    'DSD',
    'Open Water',
    'Advanced Open Water',
    'Rescue Diver Course',
    'EFR',
    'Divemaster',
    'Specialty Course',
    'Scuba Review',
    'Snorkeling',
    'Other',
  ]);
});

test('limits activity options to fun dives when schedule type is fun dives', () => {
  renderScheduleFilters({
    filters: {
      scheduleType: 'fun-dives',
    },
  });

  expect(getSelectOptionNames('Activity')).toEqual(['All fun dives']);
});

test('limits activity options to courses when schedule type is courses', () => {
  renderScheduleFilters({
    filters: {
      scheduleType: 'courses',
    },
  });

  expect(getSelectOptionNames('Activity')).toEqual([
    'All course activities',
    'DSD',
    'Open Water',
    'Advanced Open Water',
    'Rescue Diver Course',
    'EFR',
    'Specialty Course',
  ]);
});

test('navigates when dropdown and checkbox filters change', () => {
  renderScheduleFilters({
    filters: {
      range: 'this-week',
    },
  });

  fireEvent.change(screen.getByLabelText('Staff'), {
    target: { value: 'instructor-1' },
  });
  expect(mocks.push).toHaveBeenLastCalledWith(
    '/schedule?range=this-week&staffId=instructor-1',
  );

  fireEvent.change(screen.getByLabelText('Schedule type'), {
    target: { value: 'courses' },
  });
  expect(mocks.push).toHaveBeenLastCalledWith(
    '/schedule?range=this-week&scheduleType=courses',
  );

  fireEvent.change(screen.getByLabelText('Activity'), {
    target: { value: ActivityType.FUN_DIVE },
  });
  expect(mocks.push).toHaveBeenLastCalledWith(
    '/schedule?range=this-week&activityType=FUN_DIVE',
  );

  fireEvent.click(screen.getByLabelText('Unassigned only'));
  expect(mocks.push).toHaveBeenLastCalledWith(
    '/schedule?range=this-week&unassignedOnly=true',
  );
});

test('clears an invalid activity when schedule type changes', () => {
  renderScheduleFilters({
    filters: {
      activityType: ActivityType.FUN_DIVE,
      range: 'this-week',
      scheduleType: 'fun-dives',
    },
  });

  fireEvent.change(screen.getByLabelText('Schedule type'), {
    target: { value: 'courses' },
  });

  expect(mocks.push).toHaveBeenLastCalledWith(
    '/schedule?range=this-week&scheduleType=courses',
  );
});

test('preserves a valid activity when schedule type changes', () => {
  renderScheduleFilters({
    filters: {
      activityType: ActivityType.RESCUE_DIVER_COURSE,
      range: 'this-week',
    },
  });

  fireEvent.change(screen.getByLabelText('Schedule type'), {
    target: { value: 'courses' },
  });

  expect(mocks.push).toHaveBeenLastCalledWith(
    '/schedule?range=this-week&scheduleType=courses&activityType=RESCUE_DIVER_COURSE',
  );
});

test('renders clear filters link to the base schedule page', () => {
  renderScheduleFilters({
    filters: {
      activityType: ActivityType.SNORKELING,
      range: 'tomorrow',
      scheduleType: 'courses',
    },
  });

  expect(
    screen.getByRole('link', { name: 'Clear filters' }).getAttribute('href'),
  ).toBe('/schedule');
});

test('hides clear filters when no filter is active', () => {
  renderScheduleFilters();

  expect(screen.queryByRole('link', { name: 'Clear filters' })).toBeNull();
});

test('disables schedule filter controls while results are pending', () => {
  renderScheduleFilters({
    filters: {
      staffId: 'instructor-1',
    },
    isPending: true,
  });

  expect((screen.getByLabelText('Staff') as HTMLSelectElement).disabled).toBe(
    true,
  );
  expect(
    (screen.getByLabelText('Schedule type') as HTMLSelectElement).disabled,
  ).toBe(true);
  expect(
    (screen.getByLabelText('Activity') as HTMLSelectElement).disabled,
  ).toBe(true);
  expect(
    (screen.getByLabelText('Unassigned only') as HTMLButtonElement).disabled,
  ).toBe(true);
  expect(
    screen
      .getByRole('link', { name: 'Clear filters' })
      .getAttribute('aria-disabled'),
  ).toBe('true');
});

test('builds schedule filter URLs with only active params', () => {
  expect(
    buildScheduleFilterHref(
      {
        activityType: ActivityType.SNORKELING,
        range: 'today',
        staffId: 'staff-1',
        unassignedOnly: true,
      },
      {
        range: 'all',
        scheduleType: 'fun-dives',
        staffId: undefined,
      },
    ),
  ).toBe('/schedule?scheduleType=fun-dives&unassignedOnly=true');

  expect(
    buildScheduleFilterHref(
      {
        activityType: ActivityType.FUN_DIVE,
      },
      {
        scheduleType: 'fun-dives',
      },
    ),
  ).toBe('/schedule?scheduleType=fun-dives');

  expect(
    buildScheduleFilterHref(
      {
        activityType: ActivityType.RESCUE_DIVER_COURSE,
        range: 'today',
      },
      {
        scheduleType: 'courses',
      },
    ),
  ).toBe(
    '/schedule?range=today&scheduleType=courses&activityType=RESCUE_DIVER_COURSE',
  );

  expect(
    buildScheduleFilterHref(
      {
        range: 'this-week',
        scheduleType: 'courses',
        unassignedOnly: true,
      },
      {
        scheduleType: undefined,
        unassignedOnly: undefined,
      },
    ),
  ).toBe('/schedule?range=this-week');
});
