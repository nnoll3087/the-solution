import { QueueView } from '@/components/QueueView';

export default function QueuePage() {
  return (
    <main className="min-h-screen bg-bg text-text p-8">
      <header className="mb-6 flex items-baseline justify-between">
        <div>
          <h1 className="text-4xl font-bold">Queue</h1>
          <p className="text-text-muted mt-1">Recent changes across all calendars</p>
        </div>
        <a href="/" className="text-sm text-accent hover:brightness-125">
          Back to calendar
        </a>
      </header>
      <QueueView />
    </main>
  );
}