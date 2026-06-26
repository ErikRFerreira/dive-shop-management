import { Search } from 'lucide-react';

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
  return (
    <form action="/customers" className="flex max-w-2xl flex-wrap gap-2">
      <div className="min-w-64 flex-1">
        <label className="sr-only" htmlFor="customer-search">
          Search customers
        </label>
        <Input
          id="customer-search"
          name="q"
          type="search"
          defaultValue={query}
          placeholder="Search name, Chinese name, WeChat, WhatsApp, email, or phone"
        />
      </div>
      <Button type="submit">
        <Search className="h-4 w-4" />
        Search
      </Button>
    </form>
  );
}
