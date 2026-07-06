'use client';

import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { FormEvent, useTransition } from 'react';

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
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  /**
   * Navigates to the customer search results page with the submitted query.
   *
   * @param event - Browser submit event from the search form.
   */
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const normalizedQuery = String(formData.get('q') ?? '').trim();
    const href = normalizedQuery
      ? `/customers?q=${encodeURIComponent(normalizedQuery)}`
      : '/customers';

    startTransition(() => {
      router.push(href);
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
          <Input
            id="customer-search"
            name="q"
            type="search"
            defaultValue={query}
            disabled={isPending}
            placeholder="Search name, Chinese name, WeChat, WhatsApp, email, or phone"
            className="bg-background rounded-2xl border-border px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
        <Button disabled={isPending} type="submit">
          <Search className="h-4 w-4" />
          {isPending ? 'Searching...' : 'Search'}
        </Button>
      </form>
    </div>
  );
}
