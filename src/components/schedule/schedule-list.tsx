import Link from 'next/link';
import { Eye } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { formatEnumLabel } from '@/features/bookings/form-options';
import type { SchedulePageItem } from '@/features/schedule/types';
import { groupScheduleItemsByDate } from '@/features/schedule/utils';

const dateFormatter = new Intl.DateTimeFormat('en-SG', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'Asia/Singapore',
});

function formatSourceReferrer(item: SchedulePageItem) {
  const source = item.source ? formatEnumLabel(item.source) : null;
  const referrer = item.referrerName?.trim();

  if (source && referrer) {
    return `${source} / ${referrer}`;
  }

  return source ?? referrer ?? null;
}

/** Renders scheduled bookings as simple date groups for the internal schedule page. */
export function ScheduleList({ items }: { items: SchedulePageItem[] }) {
  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No scheduled bookings yet</CardTitle>
          <CardDescription>
            Approved bookings will appear here after admin schedules them.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const groups = groupScheduleItemsByDate(items);

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <Card key={group.dateKey}>
          <CardHeader>
            <CardTitle>{dateFormatter.format(group.date)}</CardTitle>
            <CardDescription>
              {group.items.length === 1
                ? '1 scheduled booking'
                : `${group.items.length} scheduled bookings`}
            </CardDescription>
          </CardHeader>
          <CardContent className="divide-y">
            {group.items.map((item) => {
              const sourceReferrer = formatSourceReferrer(item);

              return (
                <article
                  className="grid gap-4 py-4 first:pt-0 last:pb-0 md:grid-cols-[7rem_1fr_auto]"
                  key={item.scheduleItemId}
                >
                  <div>
                    <p className="text-sm font-medium">
                      {item.startTime || 'TBD'}
                    </p>
                    <p className="text-xs text-muted-foreground">Time</p>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <h2 className="text-base font-medium">
                        {formatEnumLabel(item.activityType)}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {item.primaryCustomerName ?? 'Customer not recorded'}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span>
                        {item.numberOfPeople ?? 'TBD'}{' '}
                        {item.numberOfPeople === 1 ? 'person' : 'people'}
                      </span>
                      {item.hotel ? <span>Hotel: {item.hotel}</span> : null}
                      {sourceReferrer ? (
                        <span>Source/referrer: {sourceReferrer}</span>
                      ) : null}
                    </div>

                    {item.notes ? (
                      <p className="whitespace-pre-wrap text-sm">
                        {item.notes}
                      </p>
                    ) : null}
                  </div>

                  <div className="self-start md:justify-self-end">
                    <Button asChild variant="outline">
                      <Link href={`/bookings/${item.bookingId}`}>
                        <Eye className="h-4 w-4" />
                        View booking
                      </Link>
                    </Button>
                  </div>
                </article>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
