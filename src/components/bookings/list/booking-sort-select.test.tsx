import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import * as React from 'react';

import { BookingStatus } from '@/generated/prisma/enums';

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
});

import { BookingSortSelect } from './booking-sort-select';

/**
 * Renders the booking sort select with practical defaults.
 *
 * @param props - Optional props to override.
 * @returns The sort selection spy used by the rendered component.
 */
function renderBookingSortSelect(
  props: Partial<React.ComponentProps<typeof BookingSortSelect>> = {},
) {
  const onSortSelect = vi.fn();

  render(
    <BookingSortSelect
      onSortSelect={onSortSelect}
      pageSize={10}
      selectedSort="recently-updated"
      {...props}
    />,
  );

  return onSortSelect;
}

test('renders supported booking sort options', () => {
  renderBookingSortSelect();

  const sortSelect = screen.getByLabelText('Sort by') as HTMLSelectElement;

  expect(Array.from(sortSelect.options).map((option) => option.textContent)).toEqual(
    ['Recently updated', 'Newest created', 'Upcoming activity date'],
  );
  expect(sortSelect.value).toBe('recently-updated');
});

test('builds a sort href that preserves the selected status filter', () => {
  const onSortSelect = renderBookingSortSelect({
    selectedStatus: BookingStatus.PENDING_APPROVAL,
  });

  fireEvent.change(screen.getByLabelText('Sort by'), {
    target: { value: 'activity-date' },
  });

  expect(onSortSelect).toHaveBeenCalledWith(
    '/bookings?status=PENDING_APPROVAL&sort=activity-date&page=1&pageSize=10',
  );
});

test('builds a sort href that preserves the selected queue filter', () => {
  const onSortSelect = renderBookingSortSelect({
    selectedQueue: 'unassigned',
    selectedStatus: BookingStatus.DRAFT,
  });

  fireEvent.change(screen.getByLabelText('Sort by'), {
    target: { value: 'newest-created' },
  });

  expect(onSortSelect).toHaveBeenCalledWith(
    '/bookings?queue=unassigned&sort=newest-created&page=1&pageSize=10',
  );
});
