import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import * as React from 'react';

import type { AssignableStaff } from '@/features/schedule/types';
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
      if (!React.isValidElement<{ id?: string; children?: React.ReactNode }>(
        child,
      )) {
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

import {
  ScheduleFilters,
  buildScheduleFilterHref,
} from './schedule-filters';

/**
 * Builds assignable staff used by schedule filter tests.
 *
 * @param overrides - Staff fields to override for a specific scenario.
 * @returns Assignable staff record.
 */
function assignableStaff(overrides: Partial<AssignableStaff> = {}): AssignableStaff {
  return {
    id: 'instructor-1',
    name: 'Inez Instructor',
    email: 'inez@example.test',
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
      assignableStaff={[assignableStaff()]}
      filters={{}}
      {...props}
    />,
  );
}

test('does not render date range shortcut filters', () => {
  renderScheduleFilters({
    filters: {
      activityType: ActivityType.FUN_DIVE,
      range: 'today',
      staffId: 'instructor-1',
      unassignedOnly: true,
    },
  });

  expect(screen.getByRole('heading', { name: 'Filters' })).not.toBeNull();
  expect(screen.queryByRole('link', { name: 'All' })).toBeNull();
  expect(screen.queryByRole('link', { name: 'Today' })).toBeNull();
  expect(screen.queryByRole('link', { name: 'Tomorrow' })).toBeNull();
  expect(screen.queryByRole('link', { name: 'This week' })).toBeNull();
});

test('renders staff and activity filter dropdown options', () => {
  renderScheduleFilters({
    assignableStaff: [
      assignableStaff(),
      assignableStaff({
        id: 'divemaster-1',
        name: 'Dina Divemaster',
        role: UserRole.DIVEMASTER,
      }),
    ],
  });

  expect(screen.getByRole('option', { name: 'All staff' })).not.toBeNull();
  expect(
    screen.getByRole('option', { name: 'Inez Instructor (Instructor)' }),
  ).not.toBeNull();
  expect(
    screen.getByRole('option', { name: 'Dina Divemaster (Divemaster)' }),
  ).not.toBeNull();
  expect(screen.getByRole('option', { name: 'All activities' })).not.toBeNull();
  expect(screen.getByRole('option', { name: 'DSD' })).not.toBeNull();
  expect(screen.getByRole('option', { name: 'Open Water' })).not.toBeNull();
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

test('renders clear filters link to the base schedule page', () => {
  renderScheduleFilters({
    filters: {
      activityType: ActivityType.SNORKELING,
      range: 'tomorrow',
    },
  });

  expect(screen.getByRole('link', { name: 'Clear filters' }).getAttribute('href'))
    .toBe('/schedule');
});

test('hides clear filters when no filter is active', () => {
  renderScheduleFilters();

  expect(screen.queryByRole('link', { name: 'Clear filters' })).toBeNull();
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
        staffId: undefined,
      },
    ),
  ).toBe('/schedule?activityType=SNORKELING&unassignedOnly=true');

  expect(
    buildScheduleFilterHref(
      {
        range: 'this-week',
        unassignedOnly: true,
      },
      {
        unassignedOnly: undefined,
      },
    ),
  ).toBe('/schedule?range=this-week');
});
