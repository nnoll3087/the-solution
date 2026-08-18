import { QueueView } from '@/components/QueueView';
import { PageHeader } from '@/components/PageHeader';

export default function QueuePage() {
  return (
    <main className="min-h-screen text-text p-4 sm:p-8 max-w-5xl mx-auto">
      <PageHeader backHref="/" title="Queue" description="Recent changes across all calendars" />
      <QueueView />
    </main>
  );
}
