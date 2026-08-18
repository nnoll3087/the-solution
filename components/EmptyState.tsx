import { ReactNode } from 'react';

export function EmptyState({
  icon = '📭',
  message,
  action,
}: {
  icon?: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className="bg-surface/80 backdrop-blur rounded-lg border border-border-themed p-8 text-center">
      <div className="text-3xl mb-2">{icon}</div>
      <p className="text-text-muted">{message}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
