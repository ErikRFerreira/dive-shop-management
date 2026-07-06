import { ArrowLeft } from 'lucide-react';
import Link from 'next/dist/client/link';

type Props = {
  title: string;
  description?: string;
  linkLabel?: string;
  linkHref?: string;
  badge?: React.ReactNode;
};

function PageHeader({ title, description, linkLabel, linkHref, badge }: Props) {
  return (
    <header className="space-y-2">
      {linkLabel && linkHref && (
        <Link
          className="inline-flex w-fit items-center gap-1.5 mb-4 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          href={linkHref || '#'}
        >
          <ArrowLeft className="size-4" />
          {linkLabel}
        </Link>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-balance">
          {title}
        </h1>
        {badge && <>{badge}</>}
      </div>
      {description && (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      )}
    </header>
  );
}

export default PageHeader;
