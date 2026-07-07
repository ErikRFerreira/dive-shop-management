'use client';

import { Search, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ChangeEvent, FormEvent, useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type CustomerSearchProps = {
  query: string;
};

/**
 * Renders the GET-based customer search form for the `/customers` page.
 *
 * @param props - Current search query used to keep the input refresh-safe.
 * @returns A search form that submits to `/customers?q=...`.
 */
export function CustomerSearch({ query }: CustomerSearchProps) {
  return <CustomerSearchForm key={query} query={query} />;
}

/**
 * Renders the stateful customer search controls for the current URL query.
 *
 * @param props - Current search query used as the initial controlled input value.
 * @returns A search form with submit and clear controls.
 */
function CustomerSearchForm({ query }: CustomerSearchProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState(query);
  const [isPending, startTransition] = useTransition();

  /**
   * Keeps the controlled search input in sync with the user's typed query.
   *
   * @param event - Input change event containing the next query text.
   */
  function handleQueryChange(event: ChangeEvent<HTMLInputElement>) {
    setSearchQuery(event.target.value);
  }

  /**
   * Navigates to the customer search results page with the submitted query.
   *
   * @param event - Browser submit event from the search form.
   */
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedQuery = searchQuery.trim();
    const href = normalizedQuery
      ? `/customers?q=${encodeURIComponent(normalizedQuery)}`
      : '/customers';

    startTransition(() => {
      router.push(href);
    });
  }

  /**
   * Clears the current customer search and returns the page to its default list state.
   */
  function handleClearSearch() {
    setSearchQuery('');

    startTransition(() => {
      router.push('/customers');
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-card/60 p-3 shadow-sm">
      <form
        action="/customers"
        className="flex max-w-2xl flex-wrap gap-2"
        onSubmit={handleSubmit}
      >
        <div className="min-w-64 flex-1">
          <label className="sr-only" htmlFor="customer-search">
            Search customers
          </label>
          <div className="relative">
            <Input
              id="customer-search"
              name="q"
              type="text"
              autoComplete="off"
              value={searchQuery}
              onChange={handleQueryChange}
              disabled={isPending}
              placeholder="Search name, Chinese name, WeChat, WhatsApp, email, or phone"
              className="rounded-2xl border-border bg-background px-3 py-2 pr-10 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
            {searchQuery.length > 0 ? (
              <Button
                aria-label="Clear customer search"
                className="absolute right-1 top-1/2 size-6 -translate-y-1/2 rounded-full text-muted-foreground hover:text-foreground"
                disabled={isPending}
                onClick={handleClearSearch}
                size="icon-xs"
                type="button"
                variant="ghost"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            ) : null}
          </div>
        </div>
        <Button disabled={isPending} type="submit">
          <Search className="h-4 w-4" />
          {isPending ? 'Searching...' : 'Search'}
        </Button>
      </form>
    </div>
  );
}
