import Link from 'next/link';
import { ReactNode } from 'react';

export function PageHeader({
  backHref,
  backLabel = '← Back to calendar',
  title,
  description,
  actions,
}: {
  backHref: string;
  backLabel?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface hover:bg-surface-elevated border border-border-themed text-text text-sm font-medium transition"
        >
          {backLabel}
        </Link>
        {actions}
      </div>
      <h1 className="text-3xl sm:text-4xl font-bold mb-2">{title}</h1>
      {description && <p className="text-text-muted mb-8">{description}</p>}
    </div>
  );
}
