import Link from 'next/link';
import { QueueView } from '@/components/QueueView';

export default function QueuePage() {
  return (
    <main className="min-h-screen text-text p-4 sm:p-8 max-w-5xl mx-auto">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 mb-4 px-3 py-2 rounded-lg bg-surface hover:bg-surface-elevated border border-border-themed text-text text-sm font-medium transition"
      >
        ← Back to calendar
      </Link>
      <header className="mb-6">
        <h1 className="text-3xl sm:text-4xl font-bold">Queue</h1>
        <p className="text-text-muted mt-1">Recent changes across all calendars</p>
      </header>
      <QueueView />
    </main>
  );
}