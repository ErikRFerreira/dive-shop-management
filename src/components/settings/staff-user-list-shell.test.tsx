import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import * as React from 'react';

import type { StaffUserFilters } from '@/features/settings/types';
import { UserRole } from '@/generated/prisma/enums';

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
   * Collects mocked select options from nested component children.
   *
   * @param children - Select descendants that may contain option nodes.
   * @returns Native option elements for the test select.
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
   * Finds presentation props from the mocked select trigger.
   *
   * @param children - Select descendants that may contain a trigger.
   * @returns Trigger ID and responsive classes when present.
   */
  function getTriggerProps(
    children: React.ReactNode,
  ): { className?: string; id?: string } | undefined {
    for (const child of React.Children.toArray(children)) {
      if (
        !React.isValidElement<{
          children?: React.ReactNode;
          className?: string;
          id?: string;
        }>(child)
      ) {
        continue;
      }

      if (child.type === SelectTrigger) {
        return {
          className: child.props.className,
          id: child.props.id,
        };
      }

      const nestedProps = getTriggerProps(child.props.children);

      if (nestedProps) {
        return nestedProps;
      }
    }

    return undefined;
  }

  /**
   * Replaces the Radix select with a native select for interaction tests.
   *
   * @param props - Controlled select properties and component children.
   * @returns A native select carrying the trigger's classes and ID.
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
    const triggerProps = getTriggerProps(children);

    return (
      <select
        className={triggerProps?.className}
        disabled={disabled}
        id={triggerProps?.id}
        onChange={(event) => onValueChange?.(event.target.value)}
        value={value ?? ''}
      >
        {collectOptions(children)}
      </select>
    );
  }

  /**
   * Passes mocked select content through unchanged.
   *
   * @param props - Nested option content.
   * @returns The provided children.
   */
  function SelectContent({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
  }

  /**
   * Converts a mocked select item into a native option.
   *
   * @param props - Option label and submitted value.
   * @returns A native option element.
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
   * Leaves trigger rendering to the native select mock.
   *
   * @returns No standalone trigger output.
   */
  function SelectTrigger() {
    return null;
  }

  /**
   * Leaves selected-value rendering to the native select mock.
   *
   * @returns No standalone value output.
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

import { StaffUserListShell } from './staff-user-list-shell';

const defaultFilters: StaffUserFilters = {
  search: '',
  role: undefined,
  status: 'all',
  page: 1,
};

/**
 * Renders staff filters with configurable URL-backed values.
 *
 * @param filters - Filter values to expose in the controls.
 * @returns React Testing Library render result.
 */
function renderStaffUserListShell(filters: StaffUserFilters = defaultFilters) {
  return render(
    <StaffUserListShell filters={filters}>
      <p>Staff results</p>
    </StaffUserListShell>,
  );
}

test('uses full-width controls on mobile with desktop width overrides', () => {
  renderStaffUserListShell({
    search: 'marina',
    role: UserRole.INSTRUCTOR,
    status: 'inactive',
    page: 1,
  });

  const searchInput = screen.getByLabelText('Search');
  const searchGroup = searchInput.parentElement;
  const searchWrapper = searchGroup?.parentElement;
  const searchButton = screen.getByRole('button', { name: 'Search' });

  expect(searchWrapper?.classList.contains('w-full')).toBe(true);
  expect(searchWrapper?.classList.contains('md:flex-1')).toBe(true);
  expect(searchGroup?.classList.contains('flex-col')).toBe(true);
  expect(searchGroup?.classList.contains('md:flex-row')).toBe(true);
  expect(searchButton.classList.contains('w-full')).toBe(true);
  expect(searchButton.classList.contains('md:w-auto')).toBe(true);

  for (const label of ['Role', 'Status']) {
    const select = screen.getByLabelText(label);
    const wrapper = select.parentElement;

    expect(select.classList.contains('w-full')).toBe(true);
    expect(wrapper?.classList.contains('w-full')).toBe(true);
    expect(wrapper?.classList.contains('md:w-auto')).toBe(true);
  }

  const clearFilters = screen.getByRole('button', { name: 'Clear filters' });

  expect(clearFilters.classList.contains('w-full')).toBe(true);
  expect(clearFilters.classList.contains('md:w-auto')).toBe(true);
});

test('preserves staff filter URL behavior', () => {
  renderStaffUserListShell({
    search: 'marina',
    role: UserRole.INSTRUCTOR,
    status: 'inactive',
    page: 3,
  });

  fireEvent.change(screen.getByLabelText('Search'), {
    target: { value: '  new staff  ' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Search' }));

  expect(mocks.push).toHaveBeenLastCalledWith(
    '/settings?search=new+staff&role=INSTRUCTOR&status=inactive',
  );

  fireEvent.change(screen.getByLabelText('Role'), {
    target: { value: 'all-roles' },
  });
  expect(mocks.push).toHaveBeenLastCalledWith(
    '/settings?search=marina&status=inactive',
  );

  fireEvent.change(screen.getByLabelText('Status'), {
    target: { value: 'active' },
  });
  expect(mocks.push).toHaveBeenLastCalledWith(
    '/settings?search=marina&role=INSTRUCTOR&status=active',
  );

  fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
  expect(mocks.push).toHaveBeenLastCalledWith('/settings');
});
